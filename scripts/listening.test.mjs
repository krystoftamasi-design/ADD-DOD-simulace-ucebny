import test from 'node:test';
import assert from 'node:assert/strict';
import { ListeningState } from '../src/listening.js';

const finger = z => ({x:50,y:50,z});

test('touch starts listening and a nearby finger keeps it active', () => {
  const state = new ListeningState();
  state.touch(finger(5), 0);
  state.update(finger(8), 5000);
  assert.equal(state.active, true);
});

test('removing the finger stops listening after the release delay', () => {
  const state = new ListeningState();
  state.touch(finger(5), 0);
  state.update(null, 100);
  state.update(null, 699);
  assert.equal(state.active, true);
  state.update(null, 700);
  assert.equal(state.active, false);
});

test('lifting a still detected finger also stops listening', () => {
  const state = new ListeningState();
  state.touch(finger(5), 0);
  state.update(finger(30), 100);
  state.update(finger(30), 700);
  assert.equal(state.active, false);
});

test('a brief detection gap does not stop listening', () => {
  const state = new ListeningState();
  state.touch(finger(5), 0);
  state.update(null, 100);
  state.update(finger(5), 500);
  state.update(finger(5), 1000);
  assert.equal(state.active, true);
});

test('moving close again requires another touch after listening stopped', () => {
  const state = new ListeningState();
  state.touch(finger(5), 0);
  state.update(null, 100);
  state.update(null, 700);
  state.update(finger(5), 800);
  assert.equal(state.active, false);
  state.touch(finger(5), 900);
  assert.equal(state.active, true);
});

test('mouse-only preview remains controlled by clicking', () => {
  const state = new ListeningState();
  state.toggle();
  state.update(null, 10000);
  assert.equal(state.active, true);
  state.toggle();
  assert.equal(state.active, false);
});
