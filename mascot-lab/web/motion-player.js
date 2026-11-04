import {createProceduralBody, noise, randomAt} from './procedural-body.js';
import {mascotBounds, followTarget} from './cursor-follow.js';

const byId = id => document.getElementById(id);
const svgNS = 'http://www.w3.org/2000/svg';

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Chybí podklad: ${path}`);
  return response.json();
}

async function main() {
  const [motion, character] = await Promise.all([
    loadJson('assets/motion.json'), loadJson('assets/mascot.json'),
  ]);
  const element = (tag, attributes = {}) => {
    const node = document.createElementNS(svgNS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    return node;
  };
  const reference = element('svg', {viewBox: `0 0 ${motion.width} ${motion.height}`, role: 'img', 'aria-label': 'Původní animace z After Effects'});
  const {x, y, width, height} = motion.reference;
  const referenceImage = element('image', {x, y, width, height});
  reference.append(referenceImage);
  byId('reference').replaceChildren(reference);
  const referenceFrames = Array.from({length: motion.frameCount}, (_, index) => {
    const image = new Image();
    image.src = `assets/reference/${String(index).padStart(4, '0')}.webp`;
    return image;
  });
  await Promise.all(referenceFrames.map(image => image.decode()));

  const root = element('svg', {viewBox: `0 0 ${motion.width} ${motion.height}`, role: 'img', 'aria-label': 'Maskot se samostatně pohybujícími zelenými kuličkami'});
  const originalBody = element('g', {id: 'body-frame'});
  const eyes = element('g', {id: 'eye-frame'});
  const actor = element('g', {id: 'mascot-actor', transform: 'translate(0 0)'});
  root.append(actor);
  byId('rig').replaceChildren(root);
  let seed = 0;
  const proceduralBody = createProceduralBody(actor, character.body, character.palette, seed);
  actor.append(originalBody, eyes);
  const tuning = {strength: 1};
  const gaze = {x: 0, y: 0};
  const position = {x: 0, y: 0};
  let pointerInside = false;
  const bounds = mascotBounds(character.body);
  const anchor = {x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2};
  const face = {x: (character.eyes[0].center[0] + character.eyes[1].center[0]) / 2,
    y: (character.eyes[0].center[1] + character.eyes[1].center[1]) / 2};
  const paintPosition = () => actor.setAttribute('transform', `translate(${position.x.toFixed(3)} ${position.y.toFixed(3)})`);
  let elapsed = 0;
  let playing = true;
  let lastReference = -1;
  let lastOriginal = -1;
  let lastEyes = -1;
  let heldEyes = null;
  let manualBlink = null;
  const blink = {frame: 48};
  const procedural = () => byId('mode').value === 'procedural';

  function eyeIndex(time) {
    if (heldEyes !== null) return heldEyes;
    if (manualBlink) return Math.min(56, Math.floor(blink.frame));
    if (!procedural()) return Math.floor(time * motion.fps) % motion.frameCount;
    // One blink in each six-second block, with varying onset. The source's
    // black rectangles / open eyes / rectangles pattern remains unchanged.
    const block = Math.floor(time / 6);
    const age = time - (block * 6 + 1 + 3 * randomAt(block, seed ^ 907));
    return age >= 0 && age < 8 / motion.fps ? 48 + Math.floor(age * motion.fps) : 21;
  }

  function paintGaze() {
    const tracking = byId('follow').checked && pointerInside;
    const driftX = procedural() && !tracking ? 9 * noise(elapsed * .22 + 17, seed ^ 601) : 0;
    const driftY = procedural() && !tracking ? 7 * noise(elapsed * .17 + 39, seed ^ 607) : 0;
    for (const pupil of eyes.querySelectorAll('[data-pupil]')) {
      pupil.setAttribute('transform', `translate(${gaze.x + driftX} ${gaze.y + driftY})`);
    }
  }

  function render() {
    const sourceFrame = heldEyes !== null ? heldEyes : Math.floor(elapsed * motion.fps) % motion.frameCount;
    if (sourceFrame !== lastReference) {
      referenceImage.setAttribute('href', referenceFrames[sourceFrame].src);
      byId('frame').value = String(sourceFrame);
      byId('reference-time').textContent = `${(sourceFrame / motion.fps).toFixed(2)} s`;
      lastReference = sourceFrame;
    }
    const isProcedural = procedural();
    proceduralBody.node.style.display = isProcedural ? '' : 'none';
    originalBody.style.display = isProcedural ? 'none' : '';
    root.dataset.mode = isProcedural ? 'procedural' : 'recorded';
    root.dataset.time = elapsed.toFixed(4);
    if (isProcedural) proceduralBody.render(elapsed, tuning.strength);
    else if (sourceFrame !== lastOriginal) {
      originalBody.innerHTML = motion.frames[sourceFrame].body;
      lastOriginal = sourceFrame;
    }
    const index = eyeIndex(elapsed);
    if (index !== lastEyes) {
      eyes.innerHTML = motion.frames[index].eyes;
      eyes.dataset.frame = String(index);
      lastEyes = index;
    }
    paintGaze();
    byId('time').textContent = isProcedural
      ? `${elapsed.toFixed(2)} s · 42 samostatných kuliček`
      : `${(sourceFrame / motion.fps).toFixed(2)} s · ${sourceFrame + 1}/${motion.frameCount}`;
  }

  function updateControls() {
    byId('play').textContent = playing ? 'Pozastavit' : 'Přehrát';
    byId('play').setAttribute('aria-pressed', String(playing));
    byId('recorded-controls').hidden = procedural();
    byId('procedural-controls').hidden = !procedural();
    byId('status').textContent = procedural()
      ? '42 kuliček · průběžný pohyb · každá má vlastní polohu, velikost a natočení.'
      : 'Původních 163 fází z AE pro porovnání vzhledu a charakteru pohybu.';
  }

  function releaseEyes() {
    manualBlink?.kill();
    manualBlink = null;
    heldEyes = null;
  }

  byId('play').onclick = () => {
    releaseEyes();
    playing = !playing;
    render(); updateControls();
  };
  byId('mode').onchange = () => { releaseEyes(); render(); updateControls(); };
  byId('frame').max = String(motion.frameCount - 1);
  byId('frame').oninput = event => {
    releaseEyes(); playing = false;
    elapsed = Number(event.target.value) / motion.fps;
    render(); updateControls();
  };
  byId('strength').oninput = event => {
    const strength = Number(event.target.value);
    byId('strength-value').textContent = `${strength.toFixed(1)}×`;
    gsap.to(tuning, {strength, duration: .3, overwrite: true, onUpdate: render});
  };
  byId('variant').onclick = () => {
    releaseEyes();
    seed += 1;
    proceduralBody.setSeed(seed, elapsed);
    byId('variant-value').textContent = `Varianta ${seed + 1}`;
    playing = true;
    render(); updateControls();
  };
  byId('closed').onclick = () => {
    releaseEyes(); playing = false;
    if (!procedural()) elapsed = 48 / motion.fps;
    heldEyes = 48;
    render(); updateControls();
  };
  byId('blink').onclick = () => {
    releaseEyes(); blink.frame = 48;
    manualBlink = gsap.to(blink, {frame: 56, duration: 8 / motion.fps, ease: 'none',
      onUpdate: render, onComplete: () => { manualBlink = null; render(); }});
    render();
  };
  byId('reset').onclick = () => {
    releaseEyes(); elapsed = 0;
    gsap.killTweensOf(gaze); gaze.x = gaze.y = 0;
    returnToRest();
    render(); updateControls();
  };
  const centerGaze = () => gsap.to(gaze, {x: 0, y: 0, duration: .2, overwrite: true, onUpdate: paintGaze});
  function returnToRest() {
    pointerInside = false;
    gsap.to(position, {x: 0, y: 0, duration: .55, ease: 'power2.out', overwrite: true, onUpdate: paintPosition});
    centerGaze();
  }
  byId('follow').onchange = () => { if (!byId('follow').checked) returnToRest(); };
  function followPointer(event) {
    if (!byId('follow').checked) return;
    pointerInside = true;
    const matrix = root.getScreenCTM();
    if (!matrix) return;
    const inverse = matrix.inverse();
    const local = (x, y) => new DOMPoint(x, y).matrixTransform(inverse);
    const point = local(event.clientX, event.clientY);
    const screen = root.getBoundingClientRect();
    const topLeft = local(screen.left, screen.top);
    const bottomRight = local(screen.right, screen.bottom);
    const viewport = {x: topLeft.x, y: topLeft.y,
      width: bottomRight.x - topLeft.x, height: bottomRight.y - topLeft.y};
    const target = followTarget(point, viewport, bounds, anchor);
    gsap.to(position, {...target, duration: .35, ease: 'power2.out', overwrite: true, onUpdate: paintPosition});
    const clampGaze = value => Math.max(-18, Math.min(18, value * .1));
    gsap.to(gaze, {
      x: clampGaze(point.x - face.x - position.x),
      y: clampGaze(point.y - face.y - position.y),
      duration: .2, overwrite: true, onUpdate: paintGaze,
    });
  }
  byId('stage').addEventListener('pointerenter', followPointer);
  byId('stage').addEventListener('pointermove', followPointer);
  byId('stage').addEventListener('pointerleave', returnToRest);
  window.addEventListener('resize', returnToRest);

  for (const node of document.querySelectorAll('button, input, select')) node.disabled = false;
  render(); updateControls();
  gsap.ticker.add((_time, deltaMilliseconds) => {
    if (!playing) return;
    elapsed += deltaMilliseconds / 1000 * Number(byId('speed').value);
    render();
  });
}

main().catch(error => {
  byId('status').textContent = `Náhled se nepodařilo načíst: ${error.message}`;
  byId('status').classList.add('error');
  console.error(error);
});
