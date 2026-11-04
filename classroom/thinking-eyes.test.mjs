import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCanvasCharacter,thinkingExpression} from '../mascot/mascot-canvas.js';
import {randomAt} from '../mascot/procedural-body.js';
const character=JSON.parse(readFileSync(new URL('../mascot/mascot.json',import.meta.url),'utf8'));
function context(){
 const rects=[],arcs=[];
 return {rects,arcs,globalAlpha:1,save(){},restore(){},translate(){},rotate(){},scale(){},beginPath(){},fill(){},stroke(){},clip(){},
  fillRect(...args){rects.push(args);},arc(...args){arcs.push(args);}};
}
test('thinking uses the exact source blink rectangles including offsets',()=>{
 const draw=createCanvasCharacter(character),closed=context(),blink=context();
 draw(closed,0,{x:0,y:0,size:500,closed:true});
 draw(blink,1+3*randomAt(0,907)+.01,{x:0,y:0,size:500});
 assert.deepEqual(closed.rects,blink.rects);
 assert.deepEqual(closed.rects,character.blink.closedRects.map((r,i)=>[r.x-character.eyes[i].center[0],r.y-character.eyes[i].center[1],r.width,r.height]));
});
test('thinking opens the eyes after two seconds, smoothly widens them and stops shaking',()=>{
 assert.equal(thinkingExpression(1.99).closed,true);
 assert.equal(thinkingExpression(2).closed,false);
 assert(thinkingExpression(2.12).surprise>0&&thinkingExpression(2.12).surprise<1);
 assert.equal(thinkingExpression(2.3).surprise,1);
 assert.equal(thinkingExpression(2.3).eyeShake,0);
 assert.equal(thinkingExpression(2.45).closed,true);
 assert.equal(thinkingExpression(2.7).closed,true);
 assert.equal(thinkingExpression(2.75).closed,false);
 assert.equal(thinkingExpression(2.75).surprise,0);
 assert.equal(thinkingExpression(20).blinkEnabled,false);
});
test('wide eyes have larger whites and smaller centred pupils, then return to normal after the second blink',()=>{
 const draw=createCanvasCharacter(character),ctx=context();draw(ctx,2.3,{x:0,y:0,size:500,...thinkingExpression(2.3)});
 const eyes=ctx.arcs.slice(-4);
 for(let i=0;i<2;i++){
  assert(eyes[i*2][2]>character.eyes[i].whiteRadius);
  assert(eyes[i*2+1][2]<character.eyes[i].pupilRadius);
  assert.equal(Math.abs(eyes[i*2+1][0]),0);assert.equal(Math.abs(eyes[i*2+1][1]),0);
 }
 assert.equal(ctx.rects.length,0);
 const normal=context();draw(normal,3,{x:0,y:0,size:500,...thinkingExpression(3)});
 const normalEyes=normal.arcs.slice(-4);
 for(let i=0;i<2;i++){
  assert.equal(normalEyes[i*2][2],character.eyes[i].whiteRadius);
  assert.equal(normalEyes[i*2+1][2],character.eyes[i].pupilRadius);
 }
 assert.equal(normal.rects.length,0);
});
