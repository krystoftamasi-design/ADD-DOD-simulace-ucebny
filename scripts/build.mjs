import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const out = new URL('dist/', root);
await mkdir(out, { recursive: true });
const html = (await readFile(new URL('index.html', root), 'utf8'))
  .replaceAll('./node_modules/three/build/three.module.js', './vendor/three/three.module.js')
  .replaceAll('./node_modules/three/examples/jsm/', './vendor/three/addons/')
  .replace('src/app.js', 'app.js').replace('src/style.css', 'style.css')
  .replace('classroom/timeline.js', 'room-timeline.js').replace('classroom/sync.js', 'room-sync.js');
await writeFile(new URL('index.html', out), html);
for (const name of ['app.js', 'projector.js', 'listening.js', 'flick.js', 'style.css']) {
  await copyFile(new URL('src/' + name, root), new URL(name, out));
}
for (const name of ['timeline', 'sync']) {
  await copyFile(new URL('classroom/' + name + '.js', root), new URL('room-' + name + '.js', out));
}
for (const [source, target] of [
  ['build/three.module.js', 'three.module.js'],
  ['build/three.core.js', 'three.core.js'],
  ['examples/jsm/controls/OrbitControls.js', 'addons/controls/OrbitControls.js'],
  ['examples/jsm/geometries/RoundedBoxGeometry.js', 'addons/geometries/RoundedBoxGeometry.js'],
  ['LICENSE', 'LICENSE']
]) {
  const destination = new URL('vendor/three/' + target, out);
  await mkdir(new URL('.', destination), { recursive: true });
  await copyFile(new URL('node_modules/three/' + source, root), destination);
}
console.log('Sestaveno do dist/.');
