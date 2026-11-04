import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {circleLayout, createProceduralBody, noise, sampleCircle} from '../web/procedural-body.js';

const {body, palette} = JSON.parse(readFileSync(new URL('../web/assets/mascot.json', import.meta.url)));
const layout = circleLayout(body);

test('the original two repeaters produce 42 circles at the original coordinates', () => {
  assert.equal(layout.length, 42);
  assert.deepEqual(layout[0], {id: 0, x: -86, y: -100});
  assert.deepEqual(layout.at(-1), {id: 41, x: 118, y: 190});
  assert.equal(Math.min(...layout.map(c => c.x)), -152);
  assert.equal(Math.max(...layout.map(c => c.x)), 184);
});

test('noise has no position or velocity discontinuity at new random lattice points', () => {
  const h = 1e-5;
  for (const seed of [0, 1, 73, 2147483647]) {
    for (let knot = -5; knot <= 30; knot += 1) {
      const value = noise(knot, seed);
      const left = noise(knot - h, seed);
      const right = noise(knot + h, seed);
      assert(Math.abs(right - left) < 5e-5);
      assert(Math.abs((value - left) / h - (right - value) / h) < 1e-3);
    }
  }
});

test('circles remain bounded and never flip or drift away during long playback', () => {
  for (const seconds of [0, .01, .7, 5.433333, 10.866667, 60, 3600, 100000]) {
    for (const circle of layout) {
      const pose = sampleCircle(circle, seconds, body.wiggle, 7, 1.5);
      assert(Math.abs(pose.x - circle.x) <= 38 * 1.5 + 1e-9);
      assert(Math.abs(pose.y - circle.y) <= 35 * 1.5 + 1e-9);
      assert(pose.scaleX >= .775 && pose.scaleX <= 1.225);
      assert(pose.scaleY >= .775 && pose.scaleY <= 1.225);
      assert(Math.abs(pose.rotation) <= 106 * 1.5 + 1e-9);
      assert(Object.values(pose).every(Number.isFinite));
    }
  }
});

test('a shared time and seed reproduce the same pose regardless of evaluation history', () => {
  const sample = t => layout.map(circle => sampleCircle(circle, t, body.wiggle, 19));
  const expected = sample(12.345);
  for (let t = 0; t < 12.345; t += 1 / 24) sample(t);
  assert.deepEqual(sample(12.345), expected);
  for (let t = 20; t > 12.345; t -= 1 / 60) sample(t);
  assert.deepEqual(sample(12.345), expected);
  assert.notDeepEqual(layout.map(c => sampleCircle(c, 12.345, body.wiggle, 20)), expected);
});

test('the new body does not repeat the old 5.43 or 10.87 second clips', () => {
  for (const offset of [163 / 30, 326 / 30]) {
    for (const seconds of [0, .7, 4, 20, 60]) {
      const averageDistance = layout.reduce((sum, circle) => {
        const a = sampleCircle(circle, seconds, body.wiggle, 0);
        const b = sampleCircle(circle, seconds + offset, body.wiggle, 0);
        return sum + Math.hypot(a.x - b.x, a.y - b.y);
      }, 0) / layout.length;
      assert(averageDistance > 4);
    }
  }
});

test('zero liveliness restores the original rest grid', () => {
  for (const circle of layout) {
    const {rotation, ...pose} = sampleCircle(circle, 123, body.wiggle, 10, 0);
    assert(rotation === 0);
    assert.deepEqual(pose, {
      x: circle.x, y: circle.y, scaleX: 1, scaleY: 1,
    });
  }
});

test('switching variants, including during a transition, preserves the current shape', () => {
  const oldDocument = globalThis.document;
  const node = tag => ({tag, attributes: {}, children: [], dataset: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    append(...children) { this.children.push(...children); },
  });
  globalThis.document = {createElementNS: (_namespace, tag) => node(tag)};
  try {
    const root = node('svg');
    const rig = createProceduralBody(root, body, palette, 0);
    const shapes = () => rig.node.children[0].children.map(n => n.attributes.transform);
    rig.render(2);
    const before = shapes();
    rig.setSeed(1, 2); rig.render(2);
    assert.deepEqual(shapes(), before);
    rig.render(2.2);
    const during = shapes();
    rig.setSeed(2, 2.2); rig.render(2.2);
    assert.deepEqual(shapes(), during);
    rig.render(3);
    assert.notDeepEqual(shapes(), before);
  } finally {
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
});
