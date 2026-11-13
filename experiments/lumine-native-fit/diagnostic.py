"""Offline polygon diagnostic only; actual Simulator screenshots are separate."""
import json
import math
from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageDraw

folder=Path(sys.argv[1])
first=json.loads((folder/f'budget-{int(sys.argv[2]) if len(sys.argv)>2 else 400}.json').read_text())
source=Image.open(folder.parent/('input/structure-reference.png' if first.get('featuresSourceSha256') else 'input/source.png')).convert('RGB')
features=Image.open(folder.parent/'input/source.png').convert('RGB')
panels=[]
metrics=[]
for budget in ([int(v) for v in sys.argv[2:]] or [400,800,1600,3200]):
    pack=json.loads((folder/f'budget-{budget}.json').read_text())
    im=Image.new('RGB',(pack['width'],pack['height']))
    draw=ImageDraw.Draw(im)
    for shape in pack['shapes']:
        if shape['type']=='rect':
            x,y,w,h=shape['box']; draw.rectangle((x,y,x+w,y+h),fill=shape['colour'])
        else:
            draw.polygon([tuple(p) for p in shape['points']],fill=shape['colour'])
    im.save(folder/f'diagnostic-{budget}.png')
    original=np.asarray(source.resize(im.size)).astype(float)
    error=np.asarray(im).astype(float)-original
    if pack.get('featuresSourceSha256'):
        mask=np.zeros((im.height,im.width),dtype=bool)
        for x0,y0,x1,y1 in pack['faceRois']:
            mask[int(y0*im.height):int(y1*im.height),int(x0*im.width):int(x1*im.width)]=True
        feature_error=np.asarray(im).astype(float)-np.asarray(features.resize(im.size)).astype(float)
        error[mask]=feature_error[mask]
    metrics.append({'budget':budget,'images':pack['nativeImages'],'mae':float(np.abs(error).mean()),
                    'psnr':float(10*math.log10(255**2/np.square(error).mean())),
                    'faceMAE':float(np.abs(error[int(im.height*.29):int(im.height*.76),int(im.width*.32):int(im.width*.67)]).mean())})
    panels.append(im)
contact=Image.new('RGB',(pack['width']*2,pack['height']*2+48))
for i,im in enumerate(panels):
    x=(i%2)*im.width;y=(i//2)*(im.height+24)
    contact.paste(im,(x,y+24));ImageDraw.Draw(contact).text((x+8,y+5),str(metrics[i]),fill='white')
contact.save(folder/'diagnostic-contact.png')
(folder/'quality.json').write_text(json.dumps(metrics,indent=2))
print(json.dumps(metrics))
