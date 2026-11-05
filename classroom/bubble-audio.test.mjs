import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createBubbleCueTracker,bubbleSoundMode} from '../src/bubble-sound-model.js';
import {setupBubbleAudio} from '../src/bubble-audio.js';

const state=phase=>({mode:'animation',playing:true,order:[1],guide:{phase,session:1,thinkingAt:0},spawn:{amount:{from:0,to:0,at:0,duration:1}}});
const motion={bloomKernels:()=>[.15,.4,.7,1.1].map(born=>({x:.5,y:.5,r:.1,born})),createWorkTour:()=>({}),sampleWorkTour:()=>null};
test('the four isolated clips contain different, normalized audio and clean endpoints',async()=>{
  const hashes=[];
  for(let n=1;n<=4;n++){
    const wav=await readFile(new URL(`../assets/audio/bubble-0${n}.wav`,import.meta.url));
    assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt16LE(22),1);assert.equal(wav.readUInt32LE(24),48000);assert.equal(wav.readUInt16LE(34),16);
    const pcm=wav.subarray(44);let peak=0;
    for(let i=0;i<pcm.length;i+=2)peak=Math.max(peak,Math.abs(pcm.readInt16LE(i)));
    assert(peak/32768>.62&&peak/32768<.64,`bubble ${n} is audible without clipping`);
    assert.equal(pcm.readInt16LE(0),0);assert.equal(pcm.readInt16LE(pcm.length-2),0);
    assert(pcm.length/96000>.15&&pcm.length/96000<.35);
    hashes.push(createHash('sha256').update(pcm).digest('hex'));
  }
  assert.equal(new Set(hashes).size,4);
});
test('popcorn cues follow actual birth times, do not replay per surface, and skip old frames',()=>{
  const tracker=createBubbleCueTracker(()=>.37),room=state('thinking');
  assert.deepEqual(tracker.update(room,0,motion),[]);
  assert.deepEqual(tracker.update(room,160,motion),[]);
  assert.equal(tracker.update(room,240,motion).length,1); // First birth .15 + visible pop .084.
  assert.deepEqual(tracker.update(room,240,motion),[]);
  assert.equal(tracker.update(room,500,motion).length,1);
  assert.deepEqual(tracker.update(room,5000,motion),[]);
});
test('quiet movement uses all four variants without immediate repeats',()=>{
  const tracker=createBubbleCueTracker(()=>.37),variants=[];
  for(let now=0;now<=15000;now+=80)variants.push(...tracker.update(state('idle'),now,motion).map(cue=>cue.variant));
  assert(variants.length>=8);assert.equal(new Set(variants.slice(0,4)).size,4);
  assert(variants.every((variant,i)=>!i||variant!==variants[i-1]));
});
test('recording, finishing, recall, and a paused animation remain silent',()=>{
  for(const phase of ['listening','finishing','error','empty'])assert.equal(bubbleSoundMode(state(phase)),'silent');
  assert.equal(bubbleSoundMode({...state('transcribing'),guide:{phase:'transcribing',recall:{}}}),'silent');
  assert.equal(bubbleSoundMode({...state('thinking'),playing:false}),'silent');
});
test('starting a recording stops already playing sounds and prevents further playback',async()=>{
  const names=['document','window','navigator','AudioContext','fetch','localStorage','setInterval','clearInterval','addEventListener'];
  const saved=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  let button,hide,stopped=0,frame={state:state('idle'),time:0};
  class Node {gain={value:0,setTargetAtTime(){},cancelScheduledValues(){}};pan={value:0};playbackRate={value:1};connect(){}disconnect(){}start(){}stop(){stopped++;this.onended?.();}}
  class AudioContext {state='running';currentTime=0;destination={};createGain(){return new Node();}createBufferSource(){return new Node();}createStereoPanner(){return new Node();}async resume(){}async close(){}async decodeAudioData(){return {};}}
  const mocks={document:{createElement:()=>({dataset:{},setAttribute(){}}),querySelector:()=>({append(value){button=value;}}),addEventListener(){},removeEventListener(){}},window:{DodGuide:{audioModel:motion}},navigator:{},AudioContext,
    fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}),localStorage:{getItem(){},setItem(){}},setInterval:()=>1,clearInterval(){},addEventListener:(type,fn)=>{if(type==='pagehide')hide=fn;}};
  try{
    for(const [name,value] of Object.entries(mocks))Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
    const player=setupBubbleAudio({frame:()=>frame});button.onclick();await new Promise(resolve=>setImmediate(resolve));
    for(let now=0;now<=3000;now+=80){frame.time=now;player.update(frame);}
    const played=Number(button.dataset.soundPlayed);assert(played>0);
    frame.state=state('listening');frame.time+=80;player.update(frame);assert(stopped>0);
    for(let i=0;i<30;i++){frame.time+=80;player.update(frame);}
    assert.equal(Number(button.dataset.soundPlayed),played);
  }finally{
    hide?.();for(const name of names){const descriptor=saved.get(name);if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
  }
});
