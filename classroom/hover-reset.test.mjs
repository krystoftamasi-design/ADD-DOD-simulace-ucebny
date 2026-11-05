import test from 'node:test';
import assert from 'node:assert/strict';
import {HoverReset,advanceResetGesture,RESET_HOLD_MS,RESET_BURST_MS} from './hover-reset.mjs';
import {SpawnController} from './spawn-state.mjs';
import {VoiceSession} from './voice-session.mjs';
import {gatherAt} from '../mascot/spawn-model.js';
const sensor=(z,touching=false,id=0)=>({connected:true,position:{x:50,y:50,z},touching,touchId:id,touchAt:10000});
function hold(gesture,input,start,end,options){let count=0;for(let now=start;now<=end;now+=100)if(gesture.update(input,now,options))count++;return count;}
test('idle, failed and empty requests gather on hover and accept a touch without a reset burst',()=>{
 for(const phase of ['idle','empty','error']){
  let now=0;
  const voice=new VoiceSession({clock:()=>now,onChange:()=>{}}),hover=new HoverReset(),spawn=new SpawnController(0);
  voice.set({phase});
  for(now=0;now<=2500;now+=100){
   spawn.update(sensor(40),now,10000,hover.latched);
   assert.equal(advanceResetGesture(hover,voice,spawn,sensor(40),now,{enabled:true}),null,phase);
   assert.equal(voice.state.resetGesture,undefined,phase);
  }
  assert.equal(spawn.state.phase,'gathering');assert(gatherAt(spawn.state,now)>.5);
  assert.equal(hover.latched,false);
  spawn.update(sensor(5,true,1),now,10001,hover.latched);
  assert.equal(spawn.state.phase,'listening');assert(voice.begin({holdToTalk:true}));
  assert.equal(voice.state.phase,'listening');assert.equal(voice.state.resetGesture,undefined);
 }
});
test('hover at 66% or lower resets once after 1.5 seconds, never during a quick pass',()=>{
 const g=new HoverReset();
 assert.equal(hold(g,sensor(66),0,1400),0);assert.equal(g.update(sensor(66),1500),true);
 assert.equal(hold(g,sensor(45),1600,5000),0);assert.equal(g.latched,true);
 g.update(sensor(73),5100);assert.equal(g.latched,false);
 assert.equal(hold(g,sensor(40),5200,6700),1);
});
test('contact, recording and missing sensor data cannot count as a hover hold',()=>{
 for(const input of [sensor(30,true),sensor(70),{connected:false,position:{z:30}},{connected:true,position:null}]){
  assert.equal(hold(new HoverReset(),input,0,2000),0);
 }
 assert.equal(hold(new HoverReset(),sensor(10),0,2000,{enabled:false}),0);
 assert.equal(hold(new HoverReset(),sensor(10),0,2000,{touching:true}),0);
 const g=new HoverReset();hold(g,sensor(60),0,1000);g.update(null,1100);
 assert.equal(hold(g,sensor(60),1200,2600),0);assert(g.update(sensor(60),2700));
});
test('a telemetry outage does not masquerade as continuously holding the hand',()=>{
 const g=new HoverReset();g.update(sensor(60),0);assert.equal(g.update(sensor(60),2000),false);
 assert.equal(hold(g,sensor(60),2100,3400),0);assert(g.update(sensor(60),3500));
});
test('reset holds the before-spawn state, but a fresh touch can immediately start a new recording',()=>{
 const g=new HoverReset(),c=new SpawnController(0);
 c.update(sensor(40),0,10000);assert.equal(hold(g,sensor(40),0,1500),1);
 c.reset(1500);c.update(sensor(40),1600,10000,g.latched);assert.equal(c.state.phase,'idle');assert.equal(c.state.amount.to,0);
 c.update(sensor(5,true,1),1700,10001,g.latched);assert.equal(c.state.phase,'listening');
 g.update(sensor(5,true,1),1700,{enabled:false,touching:c.contact.active});assert.equal(g.latched,false);
});
test('hover cannot cancel an in-flight selection, including after a fresh approach',async()=>{
 let resolve;const voice=new VoiceSession({onChange:()=>{},classify:()=>new Promise(r=>resolve=r)});
 voice.begin();const selection=voice.submit({session:voice.serial,text:'web'});
 const g=new HoverReset(),spawn=new SpawnController();
 for(let now=0;now<=3000;now+=100)assert.equal(advanceResetGesture(g,voice,spawn,sensor(now===1000?90:50),now),null);
 resolve({projects:[{id:'result'}]});await selection;
 assert.equal(voice.state.phase,'thinking');assert.equal(voice.state.prepared,true);
 assert.equal(voice.state.project.id,'result');assert.equal(voice.state.resetGesture,undefined);
});

test('lifting from recording into hover preserves transcription and selection until a fresh approach',async()=>{
 let now=0,finishTranscription,finishSelection;
 const voice=new VoiceSession({clock:()=>now,onChange:()=>{},
  transcribe:()=>new Promise(resolve=>finishTranscription=resolve),
  classify:()=>new Promise(resolve=>finishSelection=resolve)});
 const hover=new HoverReset(),spawn=new SpawnController();
 const update=(input,time)=>{now=time;return advanceResetGesture(hover,voice,spawn,input,time);};
 voice.begin({holdToTalk:true});const session=voice.serial;
 assert(voice.claim(session,'mac'));update(sensor(5,true),0);now=2000;voice.finish();
 const pending=voice.submit({session,audio:Buffer.from('recording')});
 for(let time=2100;time<=4000;time+=100)assert.equal(update(sensor(40),time),null);
 assert.equal(voice.state.phase,'transcribing');assert.equal(voice.serial,session);
 finishTranscription('Ukaž animace');await new Promise(resolve=>setImmediate(resolve));
 for(let time=4100;time<=8000;time+=100)assert.equal(update(sensor(40),time),null);
 assert.equal(voice.state.phase,'thinking');assert.equal(voice.serial,session);
 assert.equal(voice.state.resetGesture,undefined);
 finishSelection({projects:[{id:'new'}]});await pending;
 assert.equal(voice.state.project.id,'new');assert.equal(voice.state.prepared,true);
 voice.tick();assert.equal(voice.state.phase,'presenting');
 assert.equal(update(sensor(73),8100),null);
 assert.equal(update(sensor(40),8200),'hold');
 for(let time=8300;time<8200+RESET_HOLD_MS;time+=100)assert.equal(update(sensor(40),time),null);
 assert.equal(update(sensor(40),8200+RESET_HOLD_MS),'burst');
});

test('withdrawal during processing cannot arm reset until results have been shown',()=>{
 const r=animationRig();r.voice.set({phase:'listening'});r.update(sensor(5,true),0);
 r.voice.set({phase:'transcribing'});r.update({connected:true,position:null,touching:false},100);
 r.voice.set({phase:'thinking'});assert.equal(r.update(sensor(40),200),null);
 r.voice.set({phase:'presenting'});assert.equal(r.update(sensor(40),300),null);
 assert.equal(r.update(sensor(73),400),null);assert.equal(r.update(sensor(40),500),'hold');
});
test('hover cannot reset finishing, transcription, or generation even after a fresh approach',()=>{
 for(const phase of ['finishing','transcribing','thinking']){
  const voice=new VoiceSession({onChange:()=>{}}),hover=new HoverReset(),spawn=new SpawnController();
  voice.set({phase});const session=voice.serial;
  for(let now=0;now<=4000;now+=100)
   assert.equal(advanceResetGesture(hover,voice,spawn,sensor(now===1000?90:40),now),null);
  assert.equal(voice.state.phase,phase);assert.equal(voice.serial,session);assert.equal(voice.state.resetGesture,undefined);
 }
});

function animationRig(){
 let now=0;const messages=[];
 const voice=new VoiceSession({clock:()=>now,onChange:state=>messages.push(state),classify:async()=>({})});
 voice.set({phase:'presenting',revealAt:-5000,assignments:[{station:3,project:{id:'work'}}]});
 const hover=new HoverReset(),spawn=new SpawnController(0);spawn.update(sensor(90),0,10000);
 return {voice,hover,spawn,messages,update(input,time,options){now=time;return advanceResetGesture(hover,voice,spawn,input,time,options);}};
}
test('hover freezes the guide once, bursts at the limit, then clears works after the shared animation',()=>{
 const r=animationRig();r.voice.set({tourSession:31});assert.equal(r.update(sensor(50),0),'hold');
 const frozen=r.voice.state.resetGesture;assert.equal(frozen.frozenAt,0);assert.equal(frozen.source.revealAt,-5000);
 assert.equal(frozen.source.tourSession,31);
 for(let now=100;now<RESET_HOLD_MS;now+=100)assert.equal(r.update(sensor(50),now),null);
 assert.equal(r.voice.state.resetGesture,frozen);assert.equal(r.messages.length,3);
 assert.equal(r.update(sensor(50),RESET_HOLD_MS),'burst');
 assert.equal(r.voice.state.phase,'presenting');assert.equal(r.voice.state.resetGesture.phase,'burst');
 assert.equal(r.voice.state.resetGesture.spawn.amount.to,0);assert.equal(r.hover.latched,true);
 assert.equal(r.update(null,RESET_HOLD_MS+RESET_BURST_MS-1),null);
 assert.equal(r.update(null,RESET_HOLD_MS+RESET_BURST_MS),'complete');
 assert.equal(r.voice.state.phase,'idle');assert.equal(r.voice.state.resetGesture,undefined);assert.equal(r.voice.state.assignments,undefined);
 r.spawn.update(sensor(50),2400,10000,r.hover.latched);assert.equal(r.spawn.state.amount.to,0);
 r.spawn.update(sensor(5,true,1),2500,10001,r.hover.latched);assert.equal(r.spawn.state.phase,'listening');
});
test('early withdrawal or touch cancels the swelling and resumes the exact paused tour time',()=>{
 for(const input of [sensor(80),sensor(20,true),null]){
  const r=animationRig();r.update(sensor(50),0);
  for(let now=100;now<=800;now+=100)r.update(sensor(50),now);
  assert.equal(r.update(input,900),'cancel');assert.equal(r.voice.state.resetGesture,null);
  assert.equal(r.voice.state.tourPauseMs,900);assert.equal(900-r.voice.state.tourPauseMs,0);
  assert.equal(r.voice.state.phase,'presenting');assert.equal(r.voice.state.assignments[0].project.id,'work');
 }
});
test('a delayed sensor sample restarts the countdown without moving the frozen mascot',()=>{
 const r=animationRig();r.update(sensor(50),0);r.update(sensor(50),200);r.update(sensor(50),1000);
 assert.equal(r.voice.state.resetGesture.startedAt,1000);assert.equal(r.voice.state.resetGesture.frozenAt,0);
 assert.equal(r.voice.state.tourPauseMs,1000);
 r.update(sensor(90),1100);assert.equal(r.voice.state.tourPauseMs,1100);
});
