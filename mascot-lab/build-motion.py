"""Bake native body frames to SVG and preserve natively sampled eye transforms."""
import json
import math
import xml.etree.ElementTree as ET
from pathlib import Path

import vtracer

ROOT = Path(__file__).resolve().parent
MOTION = ROOT / 'exports/motion'
ASSETS = ROOT / 'web/assets'
samples = json.loads((MOTION / 'samples.json').read_text())
project = json.loads((ROOT / 'exports/ae-project.json').read_text())
comp = next(c for c in project['compositions'] if c['name'] == 's_mrkanim')
layers = {l['name']: l for l in comp['layers']}
index_names = {l['index']: l['name'] for l in comp['layers']}


def walk(props):
    for p in props:
        yield p
        yield from walk(p.get('children', []))


def prop(layer, name, default=None):
    return next((p.get('value', default) for p in walk(layer['properties']) if p['matchName'] == name), default)


def mul(a, b):
    a0, a1, a2, a3, a4, a5 = a
    b0, b1, b2, b3, b4, b5 = b
    return [a0*b0+a2*b1, a1*b0+a3*b1, a0*b2+a2*b3,
            a1*b2+a3*b3, a0*b4+a2*b5+a4, a1*b4+a3*b5+a5]


def matrix(position, anchor, scale, rotation):
    r = math.radians(rotation)
    a, b = math.cos(r)*scale[0]/100, math.sin(r)*scale[0]/100
    c, d = -math.sin(r)*scale[1]/100, math.cos(r)*scale[1]/100
    return [a, b, c, d, position[0]-a*anchor[0]-c*anchor[1], position[1]-b*anchor[0]-d*anchor[1]]


def shape_markup(name, active):
    layer = layers[name]
    state = active[name]
    transform = matrix(state['position'], state['anchor'], state['scale'], state['rotation'])
    parent_index = layer['parentIndex']
    while parent_index:
        parent_name = index_names[parent_index]
        parent = active[parent_name]
        transform = mul(matrix(parent['position'], parent['anchor'], parent['scale'], parent['rotation']), transform)
        parent_index = layers[parent_name]['parentIndex']
    group = matrix(prop(layer, 'ADBE Vector Position', [0, 0]),
                   prop(layer, 'ADBE Vector Anchor', [0, 0]),
                   prop(layer, 'ADBE Vector Scale', [100, 100]),
                   prop(layer, 'ADBE Vector Rotation', 0))
    transform = mul(transform, group)
    attributes = ' transform="matrix(' + ' '.join(f'{v:.6f}' for v in transform) + ')"'
    size = prop(layer, 'ADBE Vector Ellipse Size')
    if size is not None:
        position = prop(layer, 'ADBE Vector Ellipse Position', [0, 0])
        return f'<ellipse cx="{position[0]}" cy="{position[1]}" rx="{size[0]/2}" ry="{size[1]/2}"{attributes}/>'
    size = prop(layer, 'ADBE Vector Rect Size')
    if size is None:
        raise ValueError(f'Unsupported active eye geometry: {name}')
    position = prop(layer, 'ADBE Vector Rect Position', [0, 0])
    return f'<rect x="{position[0]-size[0]/2}" y="{position[1]-size[1]/2}" width="{size[0]}" height="{size[1]}"{attributes}/>'


def eye_markup(frame):
    active = {l['name']: l for l in frame['layers']}
    parts, defs = [], []
    # AE layers are front-to-back. Reverse to paint bottom-to-top in SVG.
    for name in reversed(list(active)):
        layer = layers[name]
        color = prop(layer, 'ADBE Vector Fill Color')
        if color is None:
            raise ValueError(f'Missing eye color: {name}')
        fill = '#' + ''.join(f'{round(c*255):02x}' for c in color[:3])
        shape = shape_markup(name, active)
        side = 'left' if layer['index'] > 8 else 'right'
        matte_index = layer['matteLayerIndex']
        if matte_index:
            clip_id = 'eye-matte-' + side
            defs.append(f'<clipPath id="{clip_id}">{shape_markup(index_names[matte_index], active)}</clipPath>')
            parts.append(f'<g clip-path="url(#{clip_id})"><g data-pupil="{side}" fill="{fill}">{shape}</g></g>')
        else:
            parts.append(f'<g data-eye="{side}" fill="{fill}">{shape}</g>')
    return '<defs>' + ''.join(defs) + '</defs>' + ''.join(parts)


frame_dir = MOTION / 'svg'
frame_dir.mkdir(exist_ok=True)
frames = []
for index, frame in enumerate(samples['frames']):
    source = MOTION / 'body' / f'{index:04}.png'
    target = frame_dir / f'{index:04}.svg'
    if not target.exists():
        vtracer.convert_image_to_svg_py(str(source), str(target),
            colormode='color', hierarchical='stacked', mode='spline', filter_speckle=2,
            color_precision=8, layer_difference=16, corner_threshold=60,
            length_threshold=3.5, max_iterations=10, splice_threshold=45, path_precision=3)
    root = ET.parse(target).getroot()
    body = ''.join(ET.tostring(c, encoding='unicode').replace('ns0:', '').replace(':ns0', '') for c in root)
    frames.append({'body': body, 'eyes': eye_markup(frame)})
    if index % 30 == 0:
        print(f'Converted {index + 1}/{len(samples["frames"])}', flush=True)

result = {'schema': 1, 'fps': samples['fps'], 'width': samples['width'], 'height': samples['height'],
          'start': samples['start'], 'frameCount': len(frames), 'duration': len(frames)/samples['fps'],
          'source': 'Native aerender body frames traced to SVG; original AEP eye geometry/keyframes sampled with py-aep.',
          'reference': json.loads((ASSETS / 'reference/manifest.json').read_text()),
          'frames': frames}
path = ASSETS / 'motion.json'
path.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')))
assert all('<rect ' in frames[f]['eyes'] and '<ellipse ' not in frames[f]['eyes'] for f in [48, 49, 50, 53, 54, 55])
assert all('<ellipse ' in frames[f]['eyes'] and '<rect ' not in frames[f]['eyes'] for f in [0, 47, 51, 52, 56])
print(f'Wrote {len(frames)} frames, {path.stat().st_size / 1024:.0f} KiB; original blink phases verified')
