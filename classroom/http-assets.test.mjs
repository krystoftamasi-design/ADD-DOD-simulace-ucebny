import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,utimes} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {animationVersion,sendAsset,sendImage} from './http-assets.mjs';

function response(){return {headers:{},status:200,setHeader(name,value){this.headers[name]=value;},writeHead(status){this.status=status;},end(body){this.body=body;}};}
test('cached assets keep their exact bytes and validate without returning the body again',async()=>{
  const root=await mkdtemp(join(tmpdir(),'dod-http-')),file=join(root,'asset.json');
  try{
    const bytes=Buffer.from('{"original":"žluťoučký maskot"}');await writeFile(file,bytes);
    const first=response();await sendAsset({headers:{}},first,file,'application/json');
    assert.deepEqual(first.body,bytes);assert.equal(first.headers['Content-Length'],bytes.length);
    assert.equal(first.headers['Cache-Control'],'private, no-cache');
    const again=response();await sendAsset({headers:{'if-none-match':first.headers.ETag}},again,file,'application/json');
    assert.equal(again.status,304);assert.equal(again.body,undefined);
    await writeFile(file,'changed');
    const changed=response();await sendAsset({headers:{'if-none-match':first.headers.ETag}},changed,file,'application/json');
    assert.equal(changed.status,200);assert.equal(changed.body.toString(),'changed');assert.notEqual(changed.headers.ETag,first.headers.ETag);
  }finally{await rm(root,{recursive:true,force:true});}
});
test('image validation never changes or recompresses image bytes and detects edits at the same URL',()=>{
  const bytes=Buffer.from([137,80,78,71,0,255,18,42]);
  const first=response();sendImage({headers:{}},first,bytes,'image/png');assert.deepEqual(first.body,bytes);
  const again=response();sendImage({headers:{'if-none-match':'"older", W/'+first.headers.ETag}},again,bytes,'image/png');
  assert.equal(again.status,304);assert.equal(again.body,undefined);
  const changed=response();sendImage({headers:{'if-none-match':first.headers.ETag}},changed,Buffer.concat([bytes,Buffer.from([1])]),'image/png');
  assert.equal(changed.status,200);assert.notEqual(changed.headers.ETag,first.headers.ETag);
});
test('the lightweight version detects dependency edits even if size and mtime are preserved',async()=>{
  const root=await mkdtemp(join(tmpdir(),'dod-version-')),file=join(root,'nested.js');
  try{
    await writeFile(file,'old');await utimes(file,1000,1000);
    const initial=await animationVersion([file]);assert.equal(initial,await animationVersion([file]));
    await writeFile(file,'new');await utimes(file,1000,1000);
    assert.notEqual(initial,await animationVersion([file]));
  }finally{await rm(root,{recursive:true,force:true});}
});
