import test from 'node:test';
import assert from 'node:assert/strict';
import {followGather,gatherAt,gatherMotion} from '../mascot/spawn-model.js';
import {SpawnController,initialSpawn} from './spawn-state.mjs';
const retarget=(spawn,target,now)=>({...spawn,amount:followGather(spawn,target,now)});

test('finger following eases in slowly and settles in about a second without bounce',()=>{
  const spawn=retarget(initialSpawn(),1,0);
  assert.equal(gatherAt(spawn,0),0);
  assert(gatherAt(spawn,50)>.02&&gatherAt(spawn,50)<.05);
  assert(gatherAt(spawn,150)>.15&&gatherAt(spawn,150)<.25);
  assert(gatherAt(spawn,400)>.6&&gatherAt(spawn,400)<.7);
  assert(gatherAt(spawn,900)>.95);assert.equal(gatherAt(spawn,2500),1);
  let previous=0;
  for(let now=0;now<2600;now+=7){const value=gatherAt(spawn,now);assert(value>=previous&&value<=1);previous=value;}
});
test('rapid finger reversals preserve both position and velocity instead of restarting the ease',()=>{
  let spawn=retarget(initialSpawn(),1,0);
  for(const [now,target] of [[80,0],[125,1],[170,.3],[195,.8],[230,0]]){
    const before=gatherMotion(spawn,now);
    spawn=retarget(spawn,target,now);
    assert.deepEqual(gatherMotion(spawn,now),before);
    const dt=.001,after=gatherAt(spawn,now+dt);
    assert(Math.abs((after-before.value)/(dt/1000)-before.velocity)<.001);
  }
  assert.equal(gatherAt(spawn,3000),0);
});
test('fast repeated input stays bounded and serialized displays agree regardless of sampling rate',()=>{
  let spawn=initialSpawn();
  for(let now=0;now<5000;now+=20){
    spawn=retarget(spawn,now%80<40?1:0,now);
    const wire=JSON.parse(JSON.stringify(spawn));
    for(const delta of [0,1000/120,1000/60,1000/30,100]){
      const motion=gatherMotion(spawn,now+delta);
      assert(motion.value>=0&&motion.value<=1);assert(Number.isFinite(motion.velocity));
      assert.deepEqual(gatherMotion(wire,now+delta),motion);
    }
    // Extra evaluations on a faster screen cannot change future positions.
    const expected=gatherAt(spawn,now+20);
    for(let frame=0;frame<20;frame++)gatherAt(spawn,now+frame);
    assert.equal(gatherAt(spawn,now+20),expected);
  }
});
test('the visual follow does not delay physical touch or release',()=>{
  const controller=new SpawnController();
  const sensor=(touching,touchId)=>({connected:true,touching,touchId,touchAt:10000,position:touching?{x:50,y:50,z:0}:null});
  controller.update(sensor(false,0),0,10000);
  controller.update(sensor(true,1),100,10001);assert.equal(controller.state.phase,'listening');
  const before=gatherAt(controller.state,1100);
  controller.update(sensor(false,1),1100,10002);
  assert.equal(controller.state.phase,'idle');assert.equal(gatherAt(controller.state,1100),before);
  assert(before>.95);assert(gatherAt(controller.state,1150)>.8);
});
