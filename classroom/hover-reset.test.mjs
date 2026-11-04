import test from 'node:test';
import assert from 'node:assert/strict';
import {HoverReset,advanceResetGesture,RESET_HOLD_MS,RESET_BURST_MS} from './hover-reset.mjs';
import {SpawnController} from './spawn-state.mjs';
import {VoiceSession} from './voice-session.mjs';
const sensor=(z,touching=false,id=0)=>({connected:true,position:{x:50,y:50,z},touching,touchId:id,touchAt:10000});
function hold(gesture,input,start,end,options){let count=0;for(let now=start;now<=end;now+=100)if(gesture.update(input,now,options))count++;return count;}
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
test('a hover reset cancels an in-flight selection without letting stale results return',async()=>{
 let resolve;const voice=new VoiceSession({onChange:()=>{},classify:()=>new Promise(r=>resolve=r)});
 voice.begin();const selection=voice.submit({session:voice.serial,text:'web'});
 const g=new HoverReset();for(let now=0;now<=1500;now+=100)if(g.update(sensor(50),now))voice.reset();
 resolve({projects:[{id:'old'}]});await selection;assert.equal(voice.state.phase,'idle');
});

function animationRig(){
 let now=0;const messages=[];
 const voice=new VoiceSession({clock:()=>now,onChange:state=>messages.push(state),classify:async()=>({})});
 voice.set({phase:'presenting',revealAt:-5000,assignments:[{station:3,project:{id:'work'}}]});
 const hover=new HoverReset(),spawn=new SpawnController(0);spawn.update(sensor(90),0,10000);
 return {voice,hover,spawn,messages,update(input,time,options){now=time;return advanceResetGesture(hover,voice,spawn,input,time,options);}};
}
test('hover freezes the guide once, bursts at the limit, then clears works after the shared animation',()=>{
 const r=animationRig();assert.equal(r.update(sensor(50),0),'hold');
 const frozen=r.voice.state.resetGesture;assert.equal(frozen.frozenAt,0);assert.equal(frozen.source.revealAt,-5000);
 for(let now=100;now<RESET_HOLD_MS;now+=100)assert.equal(r.update(sensor(50),now),null);
 assert.equal(r.voice.state.resetGesture,frozen);assert.equal(r.messages.length,2);
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
