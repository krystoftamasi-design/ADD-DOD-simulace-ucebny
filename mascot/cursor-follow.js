import {circleLayout} from './procedural-body.js';

// A stable envelope keeps the body inside the panel even as its circles wiggle.
export function mascotBounds(body, maxStrength = 1.5) {
  const layout = circleLayout(body);
  const largestScale = 1 + Math.max(...body.wiggle.scalePercent.map(Math.abs)) / 100 * maxStrength;
  const radius = (body.circleDiameter + body.outlineWidthBeforeLayerScale) / 2 * largestScale;
  const dx = Math.abs(body.wiggle.position[0]) * maxStrength + radius;
  const dy = Math.abs(body.wiggle.position[1]) * maxStrength + radius;
  const left = Math.min(...layout.map(c => c.x)) - dx;
  const top = Math.min(...layout.map(c => c.y)) - dy;
  const right = Math.max(...layout.map(c => c.x)) + dx;
  const bottom = Math.max(...layout.map(c => c.y)) + dy;
  const sx = body.layerScalePercent[0] / 100;
  const sy = body.layerScalePercent[1] / 100;
  return {x: body.position[0] + left * sx, y: body.position[1] + top * sy,
    width: (right - left) * sx, height: (bottom - top) * sy};
}

export function followTarget(point, viewport, bounds, anchor, padding = 24) {
  const constrain = (desired, min, max) => min > max ? (min + max) / 2 : Math.max(min, Math.min(max, desired));
  return {
    x: constrain(point.x - anchor.x,
      viewport.x + padding - bounds.x,
      viewport.x + viewport.width - padding - bounds.x - bounds.width),
    y: constrain(point.y - anchor.y,
      viewport.y + padding - bounds.y,
      viewport.y + viewport.height - padding - bounds.y - bounds.height),
  };
}
