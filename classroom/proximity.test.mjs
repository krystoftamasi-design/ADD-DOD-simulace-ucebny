import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {proximityFromSensor} from './proximity.mjs';
const context={};vm.runInNewContext(fs.readFileSync(new URL('./timeline.js',import.meta.url),'utf8'),context);
const timeline=context.DodTimeline;
test('approaching the board increases the effect monotonically and reaches its maximum',()=>{
 const levels=[100,75,60,40,20,10,0].map(z=>proximityFromSensor({connected:true,position:{z}}));
 assert.equal(levels[0],0);assert.equal(levels.at(-1),1);
 for(let i=1;i<levels.length;i++)assert(levels[i]>=levels[i-1]);
});
test('missing, disconnected or invalid sensor data clears the effect',()=>{
 for(const sensor of [null,{connected:false,position:{z:0}},{connected:true,position:null},{connected:true,position:{z:NaN}},{connected:true,position:{z:-1}}])assert.equal(proximityFromSensor(sensor),0);
});
test('the ball count increases with proximity and is bounded for older machines',()=>{
 assert.equal(timeline.fieldCount(0),0);assert.equal(timeline.fieldCount(1),192);
 assert(timeline.fieldCount(.25)<timeline.fieldCount(.5));assert(timeline.fieldCount(.5)<timeline.fieldCount(.9));
 assert.equal(timeline.fieldCount(9),192);
});
test('all clients interpolate proximity using the shared server clock',()=>{
 const state={experiment:true,proximity:{from:0,to:1,at:1000,duration:120}};
 assert.equal(timeline.proximityAmount(state,1000),0);assert.equal(timeline.proximityAmount(state,1060),.5);assert.equal(timeline.proximityAmount(state,1120),1);
 assert.equal(timeline.proximityAmount({...state,experiment:false},1120),0);
});
