import test from 'node:test';
import assert from 'node:assert/strict';
import {readModuleGraph,importModuleGraph,createModuleReloader} from './live-edit.js';
const entries={main:'http://localhost/room/main.js?v=old'};
const initial={
  'http://localhost/room/main.js':"import {value} from './nested/child.js?v=old'; export const answer=value+1;",
  'http://localhost/room/nested/child.js':"import {seed} from '../shared.js'; export const value=seed*2;",
  'http://localhost/room/shared.js':'export const seed=3;',
};

test('discovers the full shared dependency graph, resolves relative paths and removes stale query versions',async()=>{
  const seen=[];
  const graph=await readModuleGraph({...entries,child:'http://localhost/room/nested/child.js'},async url=>{seen.push(url);return initial[url];});
  assert.equal(graph.size,3);assert.equal(new Set(seen).size,3);assert(seen.every(url=>!url.includes('?')));
});

test('imports a fresh dependency tree after edits and releases generated module URLs',async()=>{
  const saved={Blob:globalThis.Blob,create:URL.createObjectURL,revoke:URL.revokeObjectURL};let made=0,released=0;
  globalThis.Blob=class {constructor(parts){this.text=parts.join('');}};
  URL.createObjectURL=blob=>{made++;return 'data:text/javascript;base64,'+Buffer.from(blob.text).toString('base64');};
  URL.revokeObjectURL=()=>{released++;};
  try{
    const graph=await readModuleGraph(entries,async url=>initial[url]);
    assert.equal((await importModuleGraph(graph,entries)).main.answer,7);
    graph.set('http://localhost/room/shared.js','export const seed=5;');
    assert.equal((await importModuleGraph(graph,entries)).main.answer,11);
    graph.set('http://localhost/room/shared.js','export const seed=;');
    await assert.rejects(importModuleGraph(graph,entries),SyntaxError);
    assert.equal(made,released);
  }finally{globalThis.Blob=saved.Blob;URL.createObjectURL=saved.create;URL.revokeObjectURL=saved.revoke;}
});

test('keeps the last working renderer on bad code, skips unchanged failures, and recovers on the next save',async()=>{
  const files={...initial},states=[];let active='old',applied=0;
  const live=createModuleReloader({entries,read:async url=>files[url],load:async graph=>graph.get('http://localhost/room/shared.js'),
    apply(source){if(source==='bad')throw new SyntaxError('missing bracket');active=source;applied++;},onStatus:state=>states.push(state)});
  await live.refresh();const valid=active;assert.equal(applied,1);
  await live.refresh();assert.equal(applied,1);
  files['http://localhost/room/shared.js']='bad';await live.refresh();assert.equal(active,valid);assert(states.at(-1).error);assert.equal(states.at(-1).revision,1);
  await live.refresh();assert.equal(states.length,2);
  files['http://localhost/room/shared.js']='fixed';await live.refresh();assert.equal(active,'fixed');assert.equal(states.at(-1).revision,2);assert.equal(states.at(-1).error,null);
});

test('overlapping refreshes share one update and do not swap the renderer twice',async()=>{
  let release;const wait=new Promise(resolve=>{release=resolve;});let applied=0;
  const live=createModuleReloader({entries,read:async url=>{await wait;return initial[url];},load:async()=>({}),apply(){applied++;}});
  const a=live.refresh(),b=live.refresh();assert.equal(a,b);release();await a;assert.equal(applied,1);
});

test('cyclic imports fail promptly instead of hanging the polling loop',async()=>{
  const graph=new Map([['http://localhost/room/main.js',"import './main.js';"]]);
  await assert.rejects(importModuleGraph(graph,entries),/Cyklick/);
});
