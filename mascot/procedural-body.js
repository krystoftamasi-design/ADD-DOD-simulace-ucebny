const SVG_NS = 'http://www.w3.org/2000/svg';
let instance = 0;

// Integer hashing makes the motion reproducible from a shared seed and time.
// Randomness is evaluated at noise lattice points, never once per display frame.
export function randomAt(index, seed = 0) {
  let value = (index ^ seed) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function smootherstep(x) {
  return x * x * x * (x * (x * 6 - 15) + 10);
}

// One-dimensional gradient noise. Both value and velocity agree at cell
// boundaries, so a new random target never produces a jump or a sharp turn.
export function noise(time, seed) {
  const cell = Math.floor(time);
  const fraction = time - cell;
  const left = (2 * randomAt(cell, seed) - 1) * fraction;
  const right = (2 * randomAt(cell + 1, seed) - 1) * (fraction - 1);
  return 2 * (left + (right - left) * smootherstep(fraction));
}

export function circleLayout(body) {
  const [columns, rows] = body.repeaters;
  const circles = [];
  for (let row = 0; row < rows.copies; row += 1) {
    for (let column = 0; column < columns.copies; column += 1) {
      const i = column + columns.offset;
      const j = row + rows.offset;
      circles.push({
        id: circles.length,
        x: i * columns.step[0] + j * rows.step[0],
        y: i * columns.step[1] + j * rows.step[1],
      });
    }
  }
  return circles;
}

export function sampleCircle(circle, seconds, wiggle, seed = 0, strength = 1) {
  const variation = (channel, rate = 1) => {
    const key = Math.imul(circle.id + 1, 1013) + Math.imul(channel + 1, 1619);
    const channelSeed = (seed ^ Math.imul(key, 0x9e3779b1)) >>> 0;
    const phase = randomAt(key, 73) * 113.7;
    const rateVariation = .8 + .4 * randomAt(circle.id, 211);
    return noise(seconds * wiggle.frequency * rate * rateVariation + phase, channelSeed);
  };
  return {
    x: circle.x + wiggle.position[0] * variation(0) * strength,
    y: circle.y + wiggle.position[1] * variation(1) * strength,
    scaleX: 1 + Math.abs(wiggle.scalePercent[0]) / 100 * variation(2, .73) * strength,
    scaleY: 1 + Math.abs(wiggle.scalePercent[1]) / 100 * variation(3, .73) * strength,
    rotation: wiggle.rotationDegrees * variation(4, .6) * strength,
  };
}

export function createProceduralBody(parent, body, palette, initialSeed = 0) {
  const element = (tag, attributes = {}) => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
    return node;
  };
  const root = element('g', {
    id: 'procedural-body',
    transform: `translate(${body.position[0]} ${body.position[1]}) scale(${body.layerScalePercent[0] / 100} ${body.layerScalePercent[1] / 100})`,
  });
  const definitions = element('defs');
  const outlines = element('g', {fill: palette.outline, stroke: palette.outline, 'stroke-width': body.outlineWidthBeforeLayerScale});
  const fills = element('g', {fill: palette.body});
  root.append(definitions, outlines, fills);
  parent.append(root);

  const prefix = `mascot-${instance++}-circle-`;
  const layout = circleLayout(body);
  const nodes = layout.map(circle => {
    const id = prefix + circle.id;
    const node = element('ellipse', {id, rx: body.circleDiameter / 2, ry: body.circleDiameter / 2});
    definitions.append(node);
    outlines.append(element('use', {href: `#${id}`}));
    fills.append(element('use', {href: `#${id}`}));
    return node;
  });
  // Render every outline first, then every fill. Overlapping circles merge
  // into the familiar green silhouette without white rings inside the body.
  let seed = initialSeed;
  let previousSeeds = [{seed, weight: 1}];
  let changedAt = -Infinity;
  const blendAt = seconds => smootherstep(Math.max(0, Math.min(1, (seconds - changedAt) / .65)));

  return {
    node: root,
    setSeed(nextSeed, seconds) {
      const blend = blendAt(seconds);
      previousSeeds = previousSeeds.map(entry => ({seed: entry.seed, weight: entry.weight * (1 - blend)}));
      previousSeeds.push({seed, weight: blend});
      previousSeeds = previousSeeds.filter(entry => entry.weight > 1e-6);
      seed = nextSeed;
      changedAt = seconds;
    },
    render(seconds, strength = 1) {
      const blend = blendAt(seconds);
      layout.forEach((circle, index) => {
        const pose = sampleCircle(circle, seconds, body.wiggle, seed, strength);
        if (blend < 1) {
          const old = {x: 0, y: 0, scaleX: 0, scaleY: 0, rotation: 0};
          for (const entry of previousSeeds) {
            const sample = sampleCircle(circle, seconds, body.wiggle, entry.seed, strength);
            for (const key of Object.keys(old)) old[key] += sample[key] * entry.weight;
          }
          for (const key of Object.keys(pose)) pose[key] = old[key] * (1 - blend) + pose[key] * blend;
        }
        nodes[index].setAttribute('transform', `translate(${pose.x.toFixed(4)} ${pose.y.toFixed(4)}) rotate(${pose.rotation.toFixed(4)}) scale(${pose.scaleX.toFixed(5)} ${pose.scaleY.toFixed(5)})`);
      });
      root.dataset.time = seconds.toFixed(4);
      root.dataset.seed = String(seed);
    },
  };
}
