"""Collect aerender output and sample the preserved AEP eye keyframes."""
import json
import shutil
from pathlib import Path
import py_aep

ROOT = Path(__file__).resolve().parent
RENDER = Path('/private/tmp/dod-mascot-render')
OUTPUT = ROOT / 'exports/motion'
project = py_aep.parse(str(ROOT / 'source/digimon_file.aep')).project
comp = next(c for c in project.compositions if c.name == 's_mrkanim')
count = round(comp.work_area_duration * comp.frame_rate)
for kind in ['body', 'reference']:
    target = OUTPUT / kind
    target.mkdir(parents=True, exist_ok=True)
    for index in range(count):
        shutil.copy2(RENDER / kind / f'{index:04}.png', target / f'{index:04}.png')

frames = []
for index in range(count):
    time = comp.work_area_start + index / comp.frame_rate
    frame = {'time': time, 'layers': []}
    for layer in comp.layers:
        if not layer.enabled or layer.name in ['Shape Layer 12', 'Shape Layer 1']:
            continue
        if time + 1e-6 < layer.in_point or time >= layer.out_point - 1e-6:
            continue
        transform = {p.match_name: p for p in layer.transform}
        state = {'name': layer.name}
        for name, match in [('position', 'ADBE Position'), ('anchor', 'ADBE Anchor Point'),
                            ('scale', 'ADBE Scale'), ('rotation', 'ADBE Rotate Z')]:
            state[name] = transform[match].value_at_time(time)
        frame['layers'].append(state)
    frames.append(frame)
data = {'schema': 1, 'composition': comp.name, 'width': comp.width, 'height': comp.height,
        'fps': comp.frame_rate, 'start': comp.work_area_start, 'frames': frames,
        'provenance': 'Native aerender body/reference PNG frames. Eye transforms sampled from original AEP with py-aep 0.18.2.'}
(OUTPUT / 'samples.json').write_text(json.dumps(data, separators=(',', ':')))
print(f'Collected {count} native body + reference frames and original eye keyframes')
