// The USB reader stays on this Mac. The hosted scene receives only sensor data.
export function connectFlick({ onPosition, onTouch }) {
  const button = document.querySelector('#flick-connect');
  const status = document.querySelector('#flick-status');
  const localLink = document.querySelector('#flick-local');
  const host = location.hostname;
  const local = ['127.0.0.1', 'localhost'].includes(host) || host.endsWith('.local') || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
  const endpoint = local ? '/state' : 'http://127.0.0.1:8765/state';
  let running = false, generation = 0, lastTouch = null, request = null;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  function show(text, active = false) {
    status.textContent = text;
    status.classList.toggle('connected', active);
  }
  function stop() {
    running = false; generation++; request?.abort();
    lastTouch = null; onPosition(null);
    button.textContent = 'Připojit Flick';
    show('Flick odpojen');
  }
  function receive(state) {
    const connected = state.connected === true;
    const p = state.position;
    const valid = connected && p && ['x', 'y', 'z'].every(k => Number.isFinite(p[k]) && p[k] >= 0 && p[k] <= 100);
    onPosition(valid ? p : null);
    show(connected ? (valid ? 'Flick · prst detekován' : 'Flick připojen') : 'Čekám na USB senzor…', connected);
    if (lastTouch !== null && state.touchId !== lastTouch && connected && Date.now() - state.touchAt < 2000) onTouch();
    lastTouch = state.touchId;
  }
  async function start() {
    running = true;
    const session = ++generation;
    button.textContent = 'Odpojit Flick';
    localLink.hidden = true;
    show('Připojuji Flick…');
    while (running && generation === session) {
      const controller = new AbortController();
      request = controller;
      const timeout = setTimeout(() => controller.abort(), 1800);
      let failed = false;
      try {
        const response = await fetch(endpoint, {cache:'no-store', signal:controller.signal});
        if (!response.ok) throw new Error('Bridge unavailable');
        const state = await response.json();
        if (generation !== session) return;
        receive(state);
        localLink.hidden = true;
      } catch {
        if (generation !== session) return;
        failed = true;
        onPosition(null);
        show('Spojení s Flickem není dostupné');
        localLink.hidden = local;
      } finally {
        clearTimeout(timeout);
      }
      await delay(failed ? 1500 : 100);
    }
  }
  button.onclick = () => running ? stop() : start();
  window.addEventListener('pagehide', stop);
  if (local) start();
}
