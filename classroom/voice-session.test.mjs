import test from 'node:test';
import assert from 'node:assert/strict';
import {VoiceSession} from './voice-session.mjs';
test('contact starts recording; release finishes the same session and allows its audio upload',async()=>{
  const phases=[];let now=0;
  const voice=new VoiceSession({clock:()=>now,stations:()=>[6,7],onChange:s=>phases.push(s.phase),transcribe:async()=> 'Ukaž web',classify:async text=>({project:{title:text,images:[]}})});
  voice.begin({holdToTalk:true});const session=voice.serial;
  assert.equal(voice.state.phase,'listening');assert.equal(voice.state.holdToTalk,true);
  assert(voice.claim(session,'mac'));assert(!voice.claim(session,'other'));
  assert.equal(voice.begin({holdToTalk:true}),false);
  now=2000;voice.finish();assert.equal(voice.state.phase,'finishing');assert.equal(voice.serial,session);
  assert(!voice.claim(session,'late-recorder'));assert.equal(voice.begin(),false);
  await voice.submit({session,audio:Buffer.from('test')});
  assert.deepEqual(phases,['listening','finishing','transcribing','thinking','thinking']);
  assert.equal(voice.state.prepared,true);
  assert.equal(voice.state.station,6);assert.equal(voice.state.transcript,'Ukaž web');
});
test('a contact shorter than two seconds cancels quietly and rejects its late audio',async()=>{
  let now=0,calls=0;const phases=[];
  const voice=new VoiceSession({clock:()=>now,onChange:s=>phases.push(s.phase),transcribe:async()=>{calls++;return 'web';},classify:async()=>{calls++;return {};}});
  voice.begin({holdToTalk:true});const session=voice.serial;assert(voice.claim(session,'mac'));
  now=1999;voice.finish();
  assert.equal(voice.state.phase,'idle');assert.notEqual(voice.serial,session);
  assert.deepEqual(phases,['listening','idle']);
  await assert.rejects(voice.submit({session,audio:Buffer.from('tap')}));assert.equal(calls,0);
  assert(voice.begin({holdToTalk:true}));
});
test('a new recording retains displayed works through transcription and removes them only for thinking',async()=>{
  let now=10000,finishTranscription,finishSelection;
  const voice=new VoiceSession({clock:()=>now,onChange:()=>{},
    transcribe:()=>new Promise(resolve=>finishTranscription=resolve),classify:()=>new Promise(resolve=>finishSelection=resolve)});
  const projects=[{id:'old',images:[{url:'/old'}]}],assignments=[{station:2,project:projects[0]}];
  voice.set({phase:'presenting',projects,assignments,revealAt:1000,tourPauseMs:300,imageIndices:{2:{project:'old',index:0}}});
  const previousSession=voice.serial;
  assert(voice.begin({holdToTalk:true}));const session=voice.serial;
  assert.equal(voice.state.phase,'listening');assert.equal(voice.state.recall.startedAt,10000);
  assert.equal(voice.state.recall.source.session,previousSession);assert.equal(voice.state.recall.source.assignments,assignments);
  now=12000;voice.finish();assert.equal(voice.state.recall.source.assignments,assignments);
  const pending=voice.submit({session,audio:Buffer.from('new request')});
  assert.equal(voice.state.phase,'transcribing');assert.equal(voice.state.recall.source.assignments,assignments);
  now=16000;finishTranscription('Ukaž animace');await new Promise(resolve=>setImmediate(resolve));
  assert.equal(voice.state.phase,'thinking');assert.equal(voice.state.recall,null);assert.equal(voice.state.thinkingAt,16000);
  assert.equal(voice.state.assignments,undefined);
  assert.equal(voice.begin({holdToTalk:true}),false);assert.equal(voice.begin({replace:true}),false);
  finishSelection({projects:[{id:'new'}]});await pending;
  assert.equal(voice.state.projects[0].id,'new');
});
test('a short tap during presentation keeps the works and the original tour seed',()=>{
  let now=10000;const voice=new VoiceSession({clock:()=>now,onChange:()=>{}});
  const assignments=[{station:3,project:{id:'old'}}];
  voice.set({phase:'presenting',assignments,revealAt:1000,tourPauseMs:250});
  const tourSession=voice.serial;
  voice.begin({holdToTalk:true});const recordingSession=voice.serial;
  now=11500;voice.finish();
  assert.equal(voice.state.phase,'presenting');assert.equal(voice.state.assignments,assignments);
  assert.equal(voice.state.tourSession,tourSession);assert.notEqual(voice.serial,recordingSession);
  assert.equal(voice.state.recall,undefined);
});
test('recording and text requests cannot interrupt finishing, transcription, or thinking',()=>{
  for(const phase of ['finishing','transcribing','thinking']){
    const voice=new VoiceSession({onChange:()=>{}});voice.set({phase});
    const state=voice.state,session=voice.serial;
    assert.equal(voice.begin({holdToTalk:true}),false);assert.equal(voice.begin({replace:true}),false);
    assert.equal(voice.state,state);assert.equal(voice.serial,session);
  }
});
test('text can replace active recording and stale uploads are rejected',async()=>{
  const voice=new VoiceSession({onChange:()=>{},classify:async()=>({project:null})});
  voice.begin({holdToTalk:true});const previous=voice.serial;
  assert(voice.begin({replace:true}));assert.equal(voice.state.holdToTalk,false);
  await assert.rejects(voice.submit({session:previous,audio:Buffer.from('stale')}));
  await voice.submit({session:voice.serial,text:'web'});assert.equal(voice.state.phase,'empty');
});
test('reset cancels a pending selection and a new touch cannot interrupt processing',async()=>{
  let resolve;
  const voice=new VoiceSession({onChange:()=>{},classify:()=>new Promise(r=>resolve=r)});
  voice.begin();const pending=voice.submit({session:voice.serial,text:'web'});
  assert.equal(voice.begin({holdToTalk:true}),false);
  voice.reset();resolve({project:{title:'old'}});await pending;
  assert.equal(voice.state.phase,'idle');
});
test('an unresponsive microphone cannot remain listening indefinitely',()=>{
  let now=0;
  const voice=new VoiceSession({clock:()=>now,onChange:()=>{}});
  voice.begin();now=25000;voice.tick();assert.equal(voice.state.phase,'finishing');
  now=35000;voice.tick();assert.equal(voice.state.phase,'idle');
  assert(voice.begin({holdToTalk:true}));
});
test('multiple projects are unique, capped, and assigned only to connected stations',async()=>{
 let online=[6,7];
 const projects=Array.from({length:12},(_,i)=>({id:'p'+i,title:'Práce '+i,images:[]}));
 const voice=new VoiceSession({stations:()=>online,onChange:()=>{},classify:async()=>({projects:[projects[0],...projects]})});
 voice.begin();await voice.submit({session:voice.serial,text:'animace'});
 assert.equal(voice.state.projects.length,10);
 assert.deepEqual(voice.state.assignments.map(a=>[a.station,a.project.id]),[[6,'p0'],[7,'p1']]);
 online=[7];voice.redistribute();assert.deepEqual(voice.state.assignments.map(a=>[a.station,a.project.id]),[[7,'p0']]);
 online=[];voice.redistribute();assert.deepEqual(voice.state.assignments,[]);assert.equal(voice.state.station,null);
 online=[1,2,3,4,5,6,7,8,9,10];voice.redistribute();assert.equal(voice.state.assignments.length,10);
 assert.equal(new Set(voice.state.assignments.map(a=>a.project.id)).size,10);
});
test('fewer projects leave remaining stations free and an empty result clears prior assignments',async()=>{
 const voice=new VoiceSession({stations:()=>[6,7,9],onChange:()=>{},classify:async()=>({projects:[{id:'one',title:'Jedna'}]})});
 voice.begin();await voice.submit({session:voice.serial,text:'jedna'});assert.equal(voice.state.assignments.length,1);
 voice.clock=()=>voice.state.thinkingAt+6000;voice.imagesReady(voice.serial,6);voice.tick();
 voice.classify=async()=>({projects:[]});voice.begin();await voice.submit({session:voice.serial,text:'neexistující'});
 assert.equal(voice.state.phase,'empty');assert.deepEqual(voice.state.assignments,[]);assert.deepEqual(voice.state.projects,[]);
});


test('reveal waits for the full bloom and every assigned image; stale acknowledgements cannot reveal',async()=>{
 let now=0;
 const voice=new VoiceSession({clock:()=>now,stations:()=>[2,6],onChange:()=>{},classify:async()=>({projects:[{id:1},{id:2}]})});
 voice.begin();voice.finish();now=100;
 await voice.submit({session:voice.serial,text:'animace'});
 voice.imagesReady(voice.serial,2);now=6000;voice.tick();assert.equal(voice.state.phase,'thinking');
 voice.imagesReady(voice.serial-1,6);voice.tick();assert.equal(voice.state.phase,'thinking');
 voice.imagesReady(voice.serial,6);now=5900;voice.tick();assert.equal(voice.state.phase,'thinking');
 now=6000;voice.tick();assert.equal(voice.state.phase,'presenting');assert.equal(voice.state.revealAt,6000);
});
test('failed image loading ends with a recoverable error instead of an endless green screen',async()=>{
 let now=0;const voice=new VoiceSession({clock:()=>now,stations:()=>[2],onChange:()=>{},classify:async()=>({projects:[{id:1}]})});
 voice.begin();await voice.submit({session:voice.serial,text:'web'});now=31000;voice.tick();
 assert.equal(voice.state.phase,'error');assert.equal(voice.state.prepared,false);assert(voice.begin());
});

test('removing an inactive monitor preserves confirmations for unchanged assignments',async()=>{
 let now=0,online=[2,6,9];
 const projects=['a','b','c'].map(id=>({id,images:[{url:'/guide/media/'+id}]}));
 const voice=new VoiceSession({clock:()=>now,stations:()=>online,onChange:()=>{},classify:async()=>({projects})});
 voice.begin();await voice.submit({session:voice.serial,text:'web'});
 voice.imagesReady(voice.serial,2,'/guide/media/a');voice.imagesReady(voice.serial,6,'/guide/media/b');
 now=6500;voice.tick();assert.equal(voice.state.phase,'thinking');
 assert.deepEqual(voice.imageReadiness().waiting,[9]);
 online=[2,6];voice.redistribute();voice.tick();
 assert.equal(voice.state.phase,'presenting');
 assert.deepEqual(voice.imageReadiness().waiting,[]);
});
test('an old image confirmation cannot unlock a reassigned project on the same monitor',async()=>{
 let now=0,online=[2,6];
 const projects=['a','b'].map(id=>({id,images:[{url:'/guide/media/'+id}]}));
 const voice=new VoiceSession({clock:()=>now,stations:()=>online,onChange:()=>{},classify:async()=>({projects})});
 voice.begin();await voice.submit({session:voice.serial,text:'web'});
 voice.imagesReady(voice.serial,6,'/guide/media/b');
 online=[6];voice.redistribute();now=6500;
 voice.imagesReady(voice.serial,6,'/guide/media/b');voice.tick();assert.equal(voice.state.phase,'thinking');
 voice.imagesReady(voice.serial,6,'/guide/media/a');voice.tick();assert.equal(voice.state.phase,'presenting');
});
test('gallery changes are synchronized, wrap around, and reject stale or reset sessions',()=>{
 const voice=new VoiceSession({onChange:()=>{}}),project={id:'work',images:[{url:'/a'},{url:'/hidden',hidden:true},{url:'/b'}]};
 voice.set({phase:'presenting',assignments:[{station:3,project}]});
 assert(voice.changeImage(voice.serial,3,1));assert.equal(voice.state.imageIndices[3].index,1);
 assert(voice.changeImage(voice.serial,3,1));assert.equal(voice.state.imageIndices[3].index,0);
 assert(voice.changeImage(voice.serial,3,-1));assert.equal(voice.state.imageIndices[3].index,1);
 assert(!voice.changeImage(voice.serial-1,3,1));assert(!voice.changeImage(voice.serial,4,1));assert(!voice.changeImage(voice.serial,3,2));
 voice.set({resetGesture:{phase:'holding'}});assert(!voice.changeImage(voice.serial,3,1));
 voice.set({resetGesture:null,assignments:[{station:3,project:{id:'new',images:[{url:'/x'},{url:'/y'},{url:'/z'}]}}]});
 assert(voice.changeImage(voice.serial,3,1));assert.deepEqual(voice.state.imageIndices[3],{project:'new',index:1});
});
