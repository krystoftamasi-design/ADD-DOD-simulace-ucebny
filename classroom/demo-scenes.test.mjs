import test from 'node:test';
import assert from 'node:assert/strict';
import {VoiceSession} from './voice-session.mjs';
import {demoScenes,demoSpawn} from './demo-scenes.mjs';
import {initialSpawn} from './spawn-state.mjs';
import {gatherAt,flowAt} from '../mascot/spawn-model.js';
const scene=id=>demoScenes.find(item=>item.id===id);

test('listening preview never claims a microphone or accepts recorded audio',async()=>{
  let now=0;
  const voice=new VoiceSession({clock:()=>now,onChange:()=>{},transcribe:()=>assert.fail('demo must not transcribe')});
  voice.preview(scene('listening'));
  assert.equal(voice.claim(voice.serial,'browser'),false);
  await assert.rejects(voice.submit({session:voice.serial,audio:Buffer.from('recording')}),{status:409});
  now=60000;voice.tick();assert.equal(voice.state.phase,'listening');
  voice.reset();assert.equal(voice.state.demo,undefined);assert(voice.begin({holdToTalk:true}));
  assert(voice.claim(voice.serial,'browser'));
});
test('changing preview cancels both a previous recording and pending model results',async()=>{
  let resolve;
  const voice=new VoiceSession({onChange:()=>{},classify:()=>new Promise(r=>resolve=r)});
  voice.begin();const old=voice.serial;
  const pending=voice.submit({session:old,text:'web'});
  voice.preview(scene('thinking'));
  resolve({project:{id:'stale'}});await pending;
  assert.equal(voice.state.demo,'thinking');assert.equal(voice.state.project,null);
  assert.equal(voice.claim(old,'old-browser'),false);
  assert(voice.begin());assert.equal(voice.state.demo,undefined);
});
test('work preview uses the real synchronized bloom and waits for assigned images',()=>{
  let now=100;
  const voice=new VoiceSession({clock:()=>now,stations:()=>[6,7],onChange:()=>{},classify:()=>assert.fail('demo must not call Tev1')});
  const projects=[1,2].map(id=>({id,images:[{url:'/guide/media/'+id}]}));
  voice.preview(scene('category-work'),projects,'animace');
  assert.equal(voice.state.category,'animace');assert.equal(voice.state.prepared,true);
  assert.deepEqual(voice.state.assignments.map(a=>a.station),[6,7]);
  voice.imagesReady(voice.serial,6,'/guide/media/1');now=6100;voice.tick();
  assert.equal(voice.state.phase,'thinking');
  voice.imagesReady(voice.serial,7,'/guide/media/2');voice.tick();
  assert.equal(voice.state.phase,'presenting');assert.equal(voice.state.revealAt,6100);
});
test('offline work preview still completes and can be viewed in the 3D simulator',()=>{
  let now=0;
  const voice=new VoiceSession({clock:()=>now,onChange:()=>{}});
  voice.preview(scene('single-work'),[{id:1}]);now=6000;voice.tick();
  assert.equal(voice.state.phase,'presenting');assert.equal(voice.state.projects.length,1);
  voice.preview(scene('random-work'),[]);assert.equal(voice.state.phase,'empty');
});
test('spawn and dispersal keep the current gather amount and the continuous particle clock',()=>{
  const previous={...initialSpawn(0),amount:{from:0,to:1,at:0,duration:1000}};
  const spawn=demoSpawn(previous,scene('spawn'),400);
  assert.equal(gatherAt(spawn,400),gatherAt(previous,400));
  assert.equal(flowAt(spawn,400),flowAt(previous,400));
  assert.equal(gatherAt(spawn,2000),1);
  const idle=demoSpawn(spawn,scene('idle'),1000);
  assert.equal(gatherAt(idle,1000),gatherAt(spawn,1000));assert.equal(gatherAt(idle,2000),0);
  assert.equal(demoSpawn(idle,scene('floating'),2000).enabled,false);
});
