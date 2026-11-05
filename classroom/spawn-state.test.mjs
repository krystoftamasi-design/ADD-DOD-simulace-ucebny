import test from 'node:test';
import assert from 'node:assert/strict';
import {SpawnController} from './spawn-state.mjs';
import {gatherAt,createSpawnModel,spawnSurfaces,spawnSettings} from '../mascot/spawn-model.js';
import {readFileSync} from 'node:fs';
const sensor=(z,id=0)=>({connected:true,position:{x:50,y:50,z},touchId:id,touchAt:10000});

test('finger presence changes immediately even at the top of the range before gathering begins',()=>{
  const c=new SpawnController(0),idle=c.state;
  c.update(sensor(100),100,10000);
  assert.notEqual(c.state,idle);assert.equal(c.state.fingerPresent,true);
  assert.equal(c.state.amount.to,0);assert.equal(gatherAt(c.state,100),0);
  const present=c.state;c.update(sensor(100),200,10000);assert.equal(c.state,present);
  c.update(null,300,10000);assert.equal(c.state.fingerPresent,false);
  c.update({...sensor(100),position:{x:101,y:50,z:100}},400,10000);assert.equal(c.state.fingerPresent,false);
});

test('dense idle dots occupy every surface and merge into the original 42 body circles',()=>{
  const c=new SpawnController(0),sample=createSpawnModel(JSON.parse(readFileSync(new URL('../mascot/mascot.json',import.meta.url))));
  const idle=sample(c.state,0).filter(p=>!p.ghost);assert.equal(idle.length,10*spawnSettings.dotsPerMonitor+spawnSettings.projectionDots);assert.equal(new Set(idle.map(p=>p.surface)).size,spawnSurfaces.length);
  c.update(sensor(10),1000,10000);
  const gathered=sample(c.state,2000);assert(gathered.every(p=>p.surface==='projector'));assert.equal(new Set(gathered.map(p=>p.target)).size,42);
  assert.deepEqual(gathered.map(p=>p.id),idle.map(p=>p.id));
});
test('approach and withdrawal interpolate from the current position without jumps',()=>{
  const c=new SpawnController(0);c.update(sensor(45),1000,10000);
  const before=gatherAt(c.state,1100);
  c.update(sensor(10),1100,10000);assert.equal(gatherAt(c.state,1100),before);
  const middle=gatherAt(c.state,1200);c.update(null,1200,10000);
  assert.equal(gatherAt(c.state,1200),middle);assert.equal(gatherAt(c.state,3700),0);
});
test('touch starts listening and confirmed removal stops it',()=>{
  const c=new SpawnController(0);c.update(sensor(5,0),0,10000);
  c.update(sensor(5,1),100,10001);assert.equal(c.state.phase,'listening');
  c.update(sensor(8,1),200,10002);assert.equal(c.state.phase,'listening');
  c.update(null,300,10003);assert.equal(c.state.phase,'listening');
  c.update(null,420,10003);assert.equal(c.state.phase,'idle');
  c.update(sensor(5,1),450,10004);assert.notEqual(c.state.phase,'listening');
  c.update(sensor(5,2),500,10005);assert.equal(c.state.phase,'listening');
  c.update(sensor(30,2),600,10006);assert.equal(c.state.phase,'listening');
  c.update(sensor(30,2),720,10006);assert.equal(c.state.phase,'gathering');
  c.reset(800);c.update(sensor(5,2),900,10007);assert.notEqual(c.state.phase,'listening');
});

test('every monitor has more dots, projection remains populated, and gathering drains downwards',()=>{
  const c=new SpawnController(0),sample=createSpawnModel(JSON.parse(readFileSync(new URL('../mascot/mascot.json',import.meta.url))));
  const idle=sample(c.state,0).filter(p=>!p.ghost);
  assert.equal(idle.filter(p=>p.surface==='projector').length,spawnSettings.projectionDots);
  for(const station of spawnSurfaces.filter(s=>s!=='projector'))assert.equal(idle.filter(p=>p.surface===station).length,12);
  const gatheredState={...c.state,phase:'gathering',amount:{from:.15,to:.15,at:0,duration:1}};
  const moving=sample(gatheredState,0);
  for(const bubble of idle.filter(p=>p.surface!=='projector')){
    const next=moving.find(p=>p.id===bubble.id&&p.surface===bubble.surface);
    if(next){assert.equal(next.x,bubble.x);assert(next.y>bubble.y);}else{assert(moving.some(p=>p.id===bubble.id&&p.surface==='projector'));}
  }
});
test('idle bubbles drift in both axes and both directions, with no common sideways velocity',()=>{
  const c=new SpawnController(0),sample=createSpawnModel(JSON.parse(readFileSync(new URL('../mascot/mascot.json',import.meta.url))));
  const a=sample(c.state,0).filter(p=>!p.ghost),b=sample(c.state,1000).filter(p=>!p.ghost);
  const same=a.filter(p=>b.some(q=>q.id===p.id&&q.surface===p.surface));
  for(const axis of ['x','y']){
    const speeds=same.map(p=>b.find(q=>q.id===p.id&&q.surface===p.surface)[axis]-p[axis]);
    assert(speeds.some(v=>v>.001));assert(speeds.some(v=>v<-.001));
  }
  const meanTravel=same.reduce((sum,p)=>{const q=b.find(q=>q.id===p.id&&q.surface===p.surface);return sum+Math.hypot(q.x-p.x,q.y-p.y);},0)/same.length;
  assert(meanTravel>.025,'idle motion should be lively rather than small anchor jitter');
  for(const now of [0,1000,70000,600000])for(const p of sample(c.state,now)){
    if(p.ghost)continue;
    const margin=p.surface==='projector'?.06:0;
    assert(p.x>=margin&&p.x<=1-margin);assert(p.y>=margin&&p.y<=1-margin);
  }
});

test('hardware contact stays active with null or jumping XYZ and releases on the real contact bit',()=>{
  const c=new SpawnController(0);
  const frame=(pressed,id,z)=>({...sensor(z,id),touching:pressed,position:z===null?null:{x:50,y:50,z}});
  c.update(frame(false,0,null),0,10000);
  c.update(frame(true,1,0),100,10001);assert.equal(c.state.phase,'listening');
  for(const [i,z] of [null,100,0,null,80].entries()){
    c.update(frame(true,1,z),1000+i*1000,10002);assert.equal(c.state.phase,'listening');
  }
  c.update(frame(false,1,null),7000,10003);assert.equal(c.state.phase,'idle');
});
