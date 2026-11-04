import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {followTarget, mascotBounds} from '../web/cursor-follow.js';

const {body} = JSON.parse(readFileSync(new URL('../web/assets/mascot.json', import.meta.url)));
const bounds = mascotBounds(body);
const anchor = {x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2};

test('a pointer at the resting center leaves the mascot in place', () => {
  assert.deepEqual(followTarget(anchor, {x: -200, y: 0, width: 1480, height: 1350}, bounds, anchor), {x: 0, y: 0});
});

test('the complete mascot stays in the panel, including SVG letterbox areas', () => {
  for (const viewport of [
    {x: -218, y: 0, width: 1516, height: 1350},
    {x: 0, y: -300, width: 1080, height: 1950},
    {x: 0, y: 0, width: 1080, height: 1350},
  ]) {
    for (const point of [
      {x: viewport.x, y: viewport.y},
      {x: viewport.x + viewport.width, y: viewport.y + viewport.height},
      {x: viewport.x + viewport.width / 2, y: viewport.y},
      {x: -10000, y: 10000},
    ]) {
      const target = followTarget(point, viewport, bounds, anchor);
      assert(bounds.x + target.x >= viewport.x + 24 - 1e-8);
      assert(bounds.y + target.y >= viewport.y + 24 - 1e-8);
      assert(bounds.x + bounds.width + target.x <= viewport.x + viewport.width - 24 + 1e-8);
      assert(bounds.y + bounds.height + target.y <= viewport.y + viewport.height - 24 + 1e-8);
    }
  }
});

test('an undersized viewport centers an oversized body instead of producing an invalid target', () => {
  const viewport = {x: 0, y: 0, width: 100, height: 100};
  const target = followTarget({x: 99, y: 1}, viewport, bounds, anchor);
  assert(Math.abs(anchor.x + target.x - 50) < 1e-8);
  assert(Math.abs(anchor.y + target.y - 50) < 1e-8);
});
