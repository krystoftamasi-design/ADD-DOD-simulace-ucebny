import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const host = process.env.DOD_SIM_HOST || '127.0.0.1';
const port = Number(process.env.DOD_SIM_PORT || 5173);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.otf':'font/otf' };
const roomAssets = new Map([
  ...['mascot.js', 'guide-renderer.js', 'live-edit.js', 'timeline.js'].map(name => ['room/' + name, 'classroom/' + name]),
  ...['procedural-body.js', 'cursor-follow.js', 'mascot-canvas.js', 'spawn-model.js', 'spawn-renderer.js', 'bubble-flight.js', 'reset-model.js', 'work-presentation.js', 'mascot.json', 'native-body.json'].map(name => ['room/' + name, 'mascot/' + name]),
  ...['Regular','Ultrabold'].map(weight=>['room/fonts/PPNeueMachina-Plain'+weight+'.otf','pruvodce/fonts/PPNeueMachina-Plain'+weight+'.otf']),
]);
http.createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const allowed = relative === 'index.html' || roomAssets.has(relative) ||
    /^(src\/(app\.js|projector\.js|listening\.js|voice\.js|flick\.js|style\.css)|classroom\/(timeline|sync)\.js|node_modules\/three\/(build\/(three\.module\.js|three\.core\.js)|examples\/jsm\/(controls\/OrbitControls\.js|geometries\/RoundedBoxGeometry\.js)))$/.test(relative);
  if (!allowed || req.method !== 'GET') { res.writeHead(404).end(); return; }
  try {
    const body = await readFile(path.join(root, roomAssets.get(relative) || relative));
    res.writeHead(200, { 'Content-Type': (mime[path.extname(relative)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404).end(); }
}).listen(port, host, () => console.log('Simulátor: http://' + host + ':' + port));
