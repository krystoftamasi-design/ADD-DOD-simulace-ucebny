"""Convert original AE body renders into separate silhouette/fill vector masks.
Run with the mascot-lab venv: python scripts/build-native-body.py EXPORT_DIRECTORY
"""
import json,sys,tempfile,xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image
import vtracer
source=Path(sys.argv[1]);frames=[]
with tempfile.TemporaryDirectory() as folder:
    temp=Path(folder)
    for path in sorted(source.glob('*.png')):
        image=Image.open(path).convert('RGBA')
        masks=[image.getchannel('A').point(lambda a:255 if a>=128 else 0)]
        masks.append(Image.frombytes('L',image.size,bytes(255 if a>=128 and b<128 else 0 for r,g,b,a in image.getdata())))
        frame=[]
        for index,mask in enumerate(masks):
            ink=Image.eval(mask,lambda a:255-a).convert('RGB');ink.save(temp/'mask.png')
            vtracer.convert_image_to_svg_py(str(temp/'mask.png'),str(temp/'mask.svg'),colormode='binary',filter_speckle=4,path_precision=2)
            frame.append([{'d':p.attrib['d'],'transform':p.attrib.get('transform','')} for p in ET.parse(temp/'mask.svg').getroot()])
        frames.append(frame)
        if len(frames)%40==0:print('Frames:',len(frames),flush=True)
output=Path(__file__).resolve().parents[1]/'mascot'/'native-body.json'
output.write_text(json.dumps({'source':'Original digimon_file.aep / s_mrkanim native aerender body exports','fps':30,'frames':frames},separators=(',',':')))
print('Saved',len(frames),'frames,',output.stat().st_size,'bytes')
