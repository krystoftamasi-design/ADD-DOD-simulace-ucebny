import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const host = process.env.DOD_SIM_HOST || '127.0.0.1';
const port = Number(process.env.DOD_SIM_PORT || 5173);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
http.createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const allowed = relative === 'index.html' ||
    /^(src\/(app\.js|style\.css)|node_modules\/three\/(build\/(three\.module\.js|three\.core\.js)|examples\/jsm\/(controls\/OrbitControls\.js|geometries\/RoundedBoxGeometry\.js)))$/.test(relative);
  if (!allowed || req.method !== 'GET') { res.writeHead(404).end(); return; }
  try {
    const body = await readFile(path.join(root, relative));
    res.writeHead(200, { 'Content-Type': (mime[path.extname(relative)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404).end(); }
}).listen(port, host, () => console.log('Simulátor: http://' + host + ':' + port));
