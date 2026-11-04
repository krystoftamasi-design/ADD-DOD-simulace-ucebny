"""Compact, transparent reference frames for the comparison player."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
frames = sorted((ROOT / 'exports/motion/reference').glob('*.png'))
bounds = [1080, 1350, 0, 0]
for path in frames:
    with Image.open(path) as im:
        x0, y0, x1, y1 = im.getchannel('A').getbbox()
        bounds = [min(bounds[0], x0), min(bounds[1], y0), max(bounds[2], x1), max(bounds[3], y1)]
output = ROOT / 'web/assets/reference'
output.mkdir(exist_ok=True)
width, height = bounds[2]-bounds[0], bounds[3]-bounds[1]
for path in frames:
    with Image.open(path) as im:
        crop = im.crop(bounds).resize((round(width/2), round(height/2)), Image.Resampling.LANCZOS)
        crop.save(output / (path.stem+'.webp'), lossless=True, method=6)
metadata = {'x': bounds[0], 'y': bounds[1], 'width': width, 'height': height,
            'decodedPixelSize': [round(width/2), round(height/2)], 'scale': .5}
(output / 'manifest.json').write_text(json.dumps(metadata))
print(metadata)
