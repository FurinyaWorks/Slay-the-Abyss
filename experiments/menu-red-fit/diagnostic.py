"""Offline polygon diagnostic only; actual Simulator screenshots are separate."""
import json
import math
from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageDraw

folder=Path(sys.argv[1])
source=Image.open(folder.parent/'input/source.png').convert('RGB')
panels=[]
metrics=[]
for budget in (800,1600,3200):
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
    metrics.append({'budget':budget,'images':pack['nativeImages'],'mae':float(np.abs(error).mean()),
                    'psnr':float(10*math.log10(255**2/np.square(error).mean())),
                    'faceMAE':float(np.abs(error[int(im.height*.20):int(im.height*.36),int(im.width*.44):int(im.width*.56)]).mean())})
    panels.append(im)
contact=Image.new('RGB',(pack['width']*2,pack['height']*2+48))
for i,im in enumerate(panels):
    x=(i%2)*im.width;y=(i//2)*(im.height+24)
    contact.paste(im,(x,y+24));ImageDraw.Draw(contact).text((x+8,y+5),str(metrics[i]),fill='white')
contact.save(folder/'diagnostic-contact.png')
(folder/'quality.json').write_text(json.dumps(metrics,indent=2))
print(json.dumps(metrics))
