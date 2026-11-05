import test from 'node:test';
import assert from 'node:assert/strict';
import {recordingError} from '../src/voice.js';

test('a brief contact click is rejected even if it produces a loud microphone sample',()=>{
 for(const durationMs of [200,1500,1999])assert.match(recordingError({size:3194,durationMs,heard:true}),/alespoň 2 sekundy/);
});
test('holding the plate without detected speech is rejected before transcription',()=>{
 assert.match(recordingError({size:44000,durationMs:3000,heard:false}),/Nezachytil jsem řeč/);
});
test('a suspended level analyser does not reject a real background recording',()=>{
 assert.equal(recordingError({size:44000,durationMs:3000,heard:false,levelsReliable:false}),null);
 assert.match(recordingError({size:44000,durationMs:1999,heard:false,levelsReliable:false}),/alespoň 2 sekundy/);
 assert.match(recordingError({size:0,durationMs:3000,heard:false,levelsReliable:false}),/příliš brzy/);
});
test('a spoken request of sufficient duration is accepted and an empty recording is not',()=>{
 assert.equal(recordingError({size:44000,durationMs:2000,heard:true}),null);
 assert.equal(recordingError({size:44000,durationMs:2200,heard:true}),null);
 assert.match(recordingError({size:0,durationMs:2200,heard:true}),/příliš brzy/);
});
