import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('rychlé přepínání galerie ignoruje pozdě dokončené načtení a chyby', async () => {
  const elements = new Map(), requests = [];
  const document = {getElementById(id) {
    if (!elements.has(id)) elements.set(id, {textContent:'', classList:{add(){},remove(){}},addEventListener(){}});
    return elements.get(id);
  }, addEventListener(){}};
  const context = vm.createContext({document, Image:class {constructor(){requests.push(this);}}});
  const source = await readFile(new URL('./vystava.js',import.meta.url),'utf8');
  vm.runInContext(source.replace(/start\(\);\s*$/, ''),context);
  vm.runInContext("galleryImages = [{url:'/a'},{url:'/b'}]; renderImage(); changeImage(1);",context);
  const hero = elements.get('hero-image'), status = elements.get('status');
  requests[1].onload();
  requests[0].onload(); requests[0].onerror();
  assert.equal(hero.src,'/b');
  assert.match(hero.alt,/fotografie 2$/);
  assert.equal(status.textContent,'');
  vm.runInContext('changeImage(1)',context);
  requests[2].onerror();
  assert.match(status.textContent,/nepodařilo/);
  vm.runInContext('changeImage(1)',context);
  requests[3].onload();
  assert.equal(status.textContent,'');
});
