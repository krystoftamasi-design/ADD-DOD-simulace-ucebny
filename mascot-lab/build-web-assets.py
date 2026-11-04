"""Extract the character contract and compose SVG from a traced native body + AE eye geometry."""
import json
import xml.etree.ElementTree as ET
from pathlib import Path

import py_aep

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / 'web/assets'
data = json.loads((ROOT / 'exports/ae-project.json').read_text())
comp = next(c for c in data['compositions'] if c['name'] == 's_mrkanim')
original = py_aep.parse(str(ROOT / 'source/digimon_file.aep')).project
ae_comp = next(c for c in original.compositions if c.name == 's_mrkanim')


def walk(props):
    for p in props:
        yield p
        yield from walk(p.get('children', []))


def layer(name):
    return next(l for l in comp['layers'] if l['name'] == name)


def get(l, match):
    return next(p for p in walk(l['properties']) if p['matchName'] == match)


body = layer('Shape Layer 12')
body_params = [{k: p[k] for k in ('name', 'matchName', 'value') if k in p}
               for p in walk(body['properties'])
               if 'value' in p and 'ADBE Vector' in p['matchName']]
eyes = []
for side, white_name, pupil_name in [('left', 'Shape Layer 3', 'Shape Layer 4'), ('right', 'Shape Layer 13', 'Shape Layer 14')]:
    white, pupil = layer(white_name), layer(pupil_name)
    white_size = get(white, 'ADBE Vector Ellipse Size')['value']
    white_scale = get(white, 'ADBE Scale')['value']
    anchor = get(white, 'ADBE Anchor Point')['value']
    group_pos = get(pupil, 'ADBE Vector Position')['value']
    ae_pupil = next(l for l in ae_comp.layers if l.name == pupil_name)
    sampled_position = ae_pupil.transform.position.value_at_time(.7)
    pupil_anchor = get(pupil, 'ADBE Anchor Point')['value']
    position = get(white, 'ADBE Position')['value'][:2]
    offset = [(sampled_position[i] - pupil_anchor[i] + group_pos[i] - anchor[i]) * white_scale[i] / 100 for i in range(2)]
    eyes.append({'side': side, 'center': position,
                 'whiteRadius': white_size[0] * white_scale[0] / 200,
                 'pupilRadius': get(pupil, 'ADBE Vector Ellipse Size')['value'][0] * white_scale[0] / 200,
                 'referencePupilOffset': offset,
                 'sourceWhiteLayer': white_name, 'sourcePupilLayer': pupil_name})

contract = {
    'schema': 1,
    'source': {'file': 'digimon_file.aep', 'composition': 's_mrkanim', 'width': comp['width'],
               'height': comp['height'], 'fps': comp['fps'], 'workAreaSeconds': comp['workAreaDuration'],
               'fullCompositionSeconds': comp['duration']},
    'palette': {'body': '#cddc29', 'outline': '#ffffff', 'eyeWhite': '#ffffff', 'pupil': '#000000'},
    'body': {'sourceLayer': 'Shape Layer 12', 'circleDiameter': 75, 'outlineWidthBeforeLayerScale': 8,
             'layerScalePercent': get(body, 'ADBE Scale')['value'],
             'position': get(body, 'ADBE Position')['value'],
             'repeaters': [{'copies': 6, 'offset': -2, 'step': [54, 10]},
                           {'copies': 7, 'offset': -2, 'step': [-11, 40]}],
             'wiggle': {'frequency': 2, 'correlation': 0, 'seed': 0, 'position': [38, -35],
                        'scalePercent': [-15, -15], 'rotationDegrees': 106},
             'allVectorParameters': body_params},
    'eyes': eyes,
    'blink': {'sourceFrames': {'openUntil': 48, 'closedFrom': 48, 'brieflyOpenFrom': 51,
                              'closedAgainFrom': 53, 'openAgainFrom': 56},
              'durationSeconds': 8/30,
              'note': 'Original alternates black rectangles with open eyes. It does not shrink the eyes.'},
    'gazeTracks': [{'layer': l['name'], 'properties': [p for p in walk(l['properties']) if p.get('keys')]}
                   for l in comp['layers'] if any(p.get('keys') for p in walk(l['properties']))],
    'fidelity': {
        'body.svg': 'Vector trace of native AE body at 0.7 seconds. Not the editable procedural AE geometry.',
        'eyes': 'Ellipse geometry, positions and parent scale extracted from AEP; pupil evaluated at 0.7 seconds by py-aep.',
        'motion': 'The default procedural-body.js constructs 42 independent ellipses directly from the body parameters and uses its own continuous gradient noise. It matches the design/character rather than Adobe noise exactly. motion.json remains a separate baked AE comparison mode.',
        'bodymovin_5_12_1': 'Shape resolver has no mapping for ADBE Vector Filter - Wiggler. Raw HTML export cannot preserve it.',
    },
}
(ASSETS / 'mascot.json').write_text(json.dumps(contract, ensure_ascii=False, indent=2))

svg = ET.parse(ASSETS / 'body.svg').getroot()
ns = '{http://www.w3.org/2000/svg}'
ET.register_namespace('', 'http://www.w3.org/2000/svg')
body_group = ET.Element(ns + 'g', {'id': 'body'})
for child in list(svg):
    svg.remove(child)
    body_group.append(child)
svg.append(body_group)
defs = ET.SubElement(svg, ns+'defs')
eye_root = ET.SubElement(svg, ns+'g', {'id': 'eyes'})
for e in eyes:
    cx, cy = e['center']; dx, dy = e['referencePupilOffset']
    clip = ET.SubElement(defs, ns+'clipPath', {'id': e['side']+'-clip'})
    ET.SubElement(clip, ns+'circle', {'cx': str(cx), 'cy': str(cy), 'r': str(e['whiteRadius'])})
    group = ET.SubElement(eye_root, ns+'g', {'id': e['side']+'-eye'})
    ET.SubElement(group, ns+'circle', {'cx': str(cx), 'cy': str(cy), 'r': str(e['whiteRadius']), 'fill': '#fff'})
    clipped = ET.SubElement(group, ns+'g', {'clip-path': 'url(#'+e['side']+'-clip)'})
    ET.SubElement(clipped, ns+'circle', {'id': e['side']+'-pupil', 'cx': str(cx+dx), 'cy': str(cy+dy),
                                      'r': str(e['pupilRadius']), 'fill': '#000'})
closed = ET.SubElement(svg, ns+'g', {'id': 'closed-eyes', 'display': 'none', 'fill': '#000'})
contract['blink']['closedRects'] = []
for name in ['Shape Layer 6', 'Shape Layer 15']:
    l = layer(name)
    size = get(l, 'ADBE Vector Rect Size')['value']
    position = get(l, 'ADBE Position')['value']
    offset = get(l, 'ADBE Vector Position')['value']
    x = position[0] + offset[0] - size[0] / 2
    y = position[1] + offset[1] - size[1] / 2
    attrs = {'x': x, 'y': y, 'width': size[0], 'height': size[1]}
    contract['blink']['closedRects'].append(attrs)
    ET.SubElement(closed, ns+'rect', {k: str(v) for k, v in attrs.items()})
(ASSETS / 'mascot.json').write_text(json.dumps(contract, ensure_ascii=False, indent=2))
svg.set('viewBox', '0 0 1080 1350')
svg.set('role', 'img')
svg.set('aria-label', 'Maskot odvozený z originálního After Effects projektu')
ET.ElementTree(svg).write(ASSETS / 'mascot-base.svg', encoding='unicode')
print('Wrote mascot.json and mascot-base.svg')
