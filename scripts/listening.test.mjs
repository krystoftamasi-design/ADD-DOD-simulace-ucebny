import test from 'node:test';
import assert from 'node:assert/strict';
import { ListeningState } from '../src/listening.js';
const finger=z=>({x:50,y:50,z});
test('contact starts listening and holding keeps it active',()=>{
  const state=new ListeningState();state.touch(finger(5),0);
  state.update(finger(8),5000);assert.equal(state.active,true);
});
test('confirmed loss of contact stops recording and does not restart without a new touch',()=>{
  const state=new ListeningState();state.touch(finger(5),0);
  state.update(null,100);assert.equal(state.active,true);
  state.update(null,220);assert.equal(state.active,false);
  state.update(finger(5),200);assert.equal(state.active,false);
  state.touch(finger(5),300);assert.equal(state.active,true);
});
test('a confirmed lift stops recording while the finger is still in range',()=>{
  const state=new ListeningState();state.touch(finger(5),0);
  state.update(finger(30),100);assert.equal(state.active,true);
  state.update(finger(30),220);assert.equal(state.active,false);
});
test('one low Z sample does not move the release threshold underneath a held finger',()=>{
  const state=new ListeningState();state.touch(finger(20),0);
  state.update(finger(3),100);state.update(finger(20),200);
  assert.equal(state.active,true);
  state.update(finger(33),300);state.update(finger(33),420);assert.equal(state.active,false);
});
test('one missing or raised sample does not interrupt a held contact',()=>{
  const state=new ListeningState();state.touch(finger(5),0);
  state.update(null,100);state.update(finger(5),200);assert.equal(state.active,true);
  state.update(finger(40),300);state.update(finger(5),400);assert.equal(state.active,true);
});
test('mouse-only preview remains controlled by clicking',()=>{
  const state=new ListeningState();state.toggle();state.update(null,10000);
  assert.equal(state.active,true);state.toggle();assert.equal(state.active,false);
});
