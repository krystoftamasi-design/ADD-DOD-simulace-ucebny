import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={};vm.runInNewContext(fs.readFileSync(new URL('./timeline.js',import.meta.url),'utf8'),context);
const {direction,placements}=context.DodTimeline;
const state=order=>({order,playing:true,startAt:0,elapsed:0,stepMs:2500});
const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);

test('direction follows neighbouring monitor positions in the classroom',()=>{
 for(const pair of [[1,2],[2,3],[3,4],[6,7],[9,10]])assert.equal(direction(...pair),-1);
 for(const pair of [[4,6],[7,9],[10,1]])assert.equal(direction(...pair),1);
});

test('left-edge departure enters the next screen at its right edge at the same height',()=>{
 const room=state([3,4]);
 const source=placements(room,2300,3,.1)[0],destination=placements(room,2300,4,.1)[0];
 near(source.x,0);near(destination.x,1);near(source.y,destination.y);
 assert.equal(source.direction,-1);assert.equal(destination.direction,-1);
});

test('right-edge departure enters the next screen at its left edge',()=>{
 const room=state([4,6]);
 near(placements(room,2300,4,.1)[0].x,1);
 near(placements(room,2300,6,.1)[0].x,0);
});

test('the arriving position is continuous through a station boundary and the loop wrap',()=>{
 const room=state([1,2,3,4,6,7,9,10]);
 for(let i=0;i<room.order.length;i++){
  const station=room.order[(i+1)%room.order.length],boundary=(i+1)*room.stepMs;
  const before=placements(room,boundary-1e-6,station,.1).at(-1);
  const after=placements(room,boundary,station,.1)[0];
  near(before.x,after.x);near(before.y,after.y);
 }
});

test('a turn on the same screen travels inward instead of staying at the edge',()=>{
 const room=state([3,4,6]);
 const start=placements(room,2500,4,.1)[0];
 const middle=placements(room,2500+1050,4,.1)[0];
 const end=placements(room,2500+2100,4,.1)[0];
 near(start.x,.9);near(end.x,.9);assert(middle.x<.5);
});

test('the shared height and clock work with different monitor aspect ratios',()=>{
 const room=state([3,4]);
 const wide=placements(room,2300,3,.09)[0];
 const square=placements(room,2300,4,.12)[0];
 near(wide.x,0);near(square.x,1);near(wide.y,square.y);
 const paused={...room,playing:false,elapsed:2300};
 near(placements(paused,999999,3,.09)[0].x,wide.x);
});
