import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCanvasCharacter,nativeBodyFrame} from '../mascot/mascot-canvas.js';
const character=JSON.parse(readFileSync(new URL('../mascot/mascot.json',import.meta.url)));
const nativeBody=JSON.parse(readFileSync(new URL('../mascot/native-body.json',import.meta.url)));

test('original body keeps all 163 native phases and plays back without an end-to-start jump',()=>{
  assert.equal(nativeBody.frames.length,163);
  for(const masks of nativeBody.frames){assert.equal(masks.length,2);assert(masks.every(mask=>mask.length&&mask.every(shape=>shape.d&&/^translate\(/.test(shape.transform))));}
  assert.equal(nativeBodyFrame(162/30,163),162);
  assert.equal(nativeBodyFrame(163/30,163),161);
  assert.equal(nativeBodyFrame(324/30,163),0);
});

test('assembled body uses the original silhouette and green mask in separate union passes',()=>{
  const previous=globalThis.Path2D;globalThis.Path2D=class {constructor(d){this.d=d;}};
  try{
    const fills=[],ctx={globalAlpha:1,save(){},restore(){},translate(){},rotate(){},scale(){},fill(path){fills.push({path,color:this.fillStyle});},arc(){},beginPath(){},clip(){}};
    const draw=createCanvasCharacter({...character,nativeBody});
    const pose={x:320,y:150,size:294,eyesAlpha:0,closed:false,blinkEnabled:false};
    draw(ctx,.7,{...pose,bodyPass:'outline'});
    assert.equal(fills.filter(f=>f.path).length,nativeBody.frames[21][0].length);
    assert(fills.filter(f=>f.path).every(f=>f.color===character.palette.outline));
    fills.length=0;draw(ctx,.7,{...pose,bodyPass:'fill'});
    assert.equal(fills.filter(f=>f.path).length,nativeBody.frames[21][1].length);
    assert(fills.filter(f=>f.path).every(f=>f.color===character.palette.body));
  }finally{globalThis.Path2D=previous;}
});
