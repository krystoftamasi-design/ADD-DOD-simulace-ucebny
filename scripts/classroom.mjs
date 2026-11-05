import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
await access(new URL('../dist/index.html', import.meta.url)).catch(() => {
  throw new Error('Nejprve spusť npm run build.');
});
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
function start(command, args, env = process.env) {
  const child = spawn(command, args, { cwd: root, env, stdio: 'inherit' });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code || 1); });
}
async function running(url) {
  try { return (await fetch(url, { signal: AbortSignal.timeout(1000) })).ok; }
  catch { return false; }
}
// Reusing a running bridge avoids opening the same USB device twice.
if (!await running('http://127.0.0.1:8765/state')) {
  const python = process.env.DOD_PYTHON || (process.platform === 'darwin' ? '/usr/bin/python3' : process.platform === 'win32' ? 'python' : 'python3');
  const args = ['scripts/flick_bridge.py'];
  if (process.env.DOD_FLICK_DEVICE) args.push('--device', process.env.DOD_FLICK_DEVICE);
  start(python, args);
}
if (!await running('http://127.0.0.1:8000/api/status')) {
  start(process.execPath, ['classroom/server.mjs'], { ...process.env, DOD_ANIMATE: '1', DOD_PROXIMITY: '1' });
}
const address = process.env.DOD_ADDRESS || Object.values(networkInterfaces()).flat()
  .find(item => item.family === 'IPv4' && !item.internal)?.address;
if (address && process.platform === 'darwin') {
  start('/usr/bin/dns-sd', ['-P', 'DOD', '_http._tcp', 'local', '8000', 'dod.local', address]);
}
console.log('Simulátor: http://127.0.0.1:8765/');
console.log('Obrazovky: ' + (address ? `http://${address}:8000/` : 'http://127.0.0.1:8000/') + (process.platform === 'darwin' ? ' nebo http://dod.local:8000/' : ''));
console.log('Nech toto okno otevřené. Servery spuštěné tímto příkazem ukončíš Ctrl+C.');
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
