import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sampleResetHold,sampleResetBurst,resetTimings,resetTiles} from '../mascot/reset-model.js';
import {createSpawnModel,spawnSurfaces} from '../mascot/spawn-model.js';
import {initialSpawn} from './spawn-state.mjs';
const character=JSON.parse(readFileSync(new URL('../mascot/mascot.json',import.meta.url)));
const pose={x:.6,y:.4,size:210,rotation:.1,sx:1,sy:1,trail:[]};
const hold={phase:'holding',startedAt:1000,duration:resetTimings.hold};

test('hold opens the eyes, swells only a little, and keeps the body at its frozen position',()=>{
 for(let now=1000;now<=2500;now+=17){
  const p=sampleResetHold(pose,hold,now,1600,900);
  assert.equal(p.x,pose.x);assert.equal(p.y,pose.y);assert.equal(p.rotation,pose.rotation);
  assert(p.size>=pose.size&&p.size<pose.size*1.15);assert.equal(p.closed,false);assert.equal(p.blinkEnabled,false);
  assert(p.trail.every(b=>Math.hypot((b.x-p.x)*1600,(b.y-p.y)*900)+b.radius<pose.size*.5));
 }
 assert.equal(sampleResetHold(pose,hold,1300,1600,900).surprise,1);
 assert.equal(sampleResetHold(null,hold,1300,1600,900),null);
});
test('burst reaches every surface and ends at the exact idle particle field without alpha fading',()=>{
 const spawn=initialSpawn(2500),model=createSpawnModel(character),origin={x:1.5,y:2.4,size:.135,aspect:16/9};
 const gesture={startedAt:2500,duration:resetTimings.burst};
 for(const station of spawnSurfaces){
  const targets=model(spawn,3350),atEnd=sampleResetBurst(targets,origin,gesture,3350,station,1600,900);
  assert.equal(atEnd.bodyScale,0);assert.equal(atEnd.workOpacity,0);assert(atEnd.trail.length>0);
  assert.deepEqual(atEnd.trail,targets.filter(b=>b.surface===station).map(b=>({id:b.id,x:b.x,y:b.y,radius:b.radius*1600*(b.alpha??1)})));
  for(let now=2500;now<3350;now+=43){
   const p=sampleResetBurst(model(spawn,now),origin,gesture,now,station,1600,900);
   assert(p.trail.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.y)&&b.radius>0&&!('alpha' in b)));
  }
 }
});
test('burst copies at screen edges represent the same particles and shared clock',()=>{
 const model=createSpawnModel(character),spawn=initialSpawn(0),origin={x:1.5,y:2.4,size:.135,aspect:16/9};
 const gesture={startedAt:0,duration:850},targets=model(spawn,400);
 const samples=spawnSurfaces.map(station=>({station,frame:sampleResetBurst(targets,origin,gesture,400,station,1600,900)}));
 let copies=0;
 for(const {station,frame} of samples){
  assert.deepEqual(frame,sampleResetBurst(targets,origin,gesture,400,station,1600,900));
  for(const other of samples){
   const a=resetTiles[station],b=resetTiles[other.station];
   if(Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])!==1)continue;
   for(const p of frame.trail){
    const q=other.frame.trail.find(item=>item.id===p.id);if(!q)continue;
    assert(Math.abs(p.x+a[0]-q.x-b[0])<1e-10);assert(Math.abs(p.y+a[1]-q.y-b[1])<1e-10);copies++;
   }
  }
 }
 assert(copies>0);
});
