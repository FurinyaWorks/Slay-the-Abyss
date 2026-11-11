"""Compare untouched actual Simulator pixels; montage crops retain 1:1 scale."""
import sys
import json
import gzip
import hashlib
import shutil
from pathlib import Path
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[2]
CASES=ROOT/'.artifacts/lumine-convergence-20261111'
OUT=ROOT/'docs/evidence/lumine-convergence-20261111'
OUT.mkdir(parents=True,exist_ok=True)
CROP=(205,225,430,445)

def montage(names,filename):
    available=[n for n in names if (CASES/n/'case.json').exists()]
    canvas=Image.new('RGB',(225*len(available),252),'#18202b')
    draw=ImageDraw.Draw(canvas)
    for i,name in enumerate(available):
        image=Image.open(CASES/name/'visual/idle-00.png').convert('RGB')
        assert image.size==(1280,720)
        canvas.paste(image.crop(CROP),(i*225,27))
        draw.text((i*225+6,8),name,fill='white')
    canvas.save(OUT/filename)

montage(['old-a','idle-7303','adaptive-3652','adaptive-1826','adaptive-913'],'halving-actual.png')
montage(['old-c','adaptive-1826-s20','pinned-1369-s20','pinned-1826-s20','pinned-2283-s20','pinned-2739-s20'],'refinement-actual.png')
montage(['old-final-a','pinned-edge-1826-b4','edge-2283-final','edge-2739-final'],'final-comparison.png')
if len(sys.argv)>1:
    name=sys.argv[1]
    frames_dir=CASES/name/'visual'
    frames=[Image.open(frames_dir/f'idle-{i:02d}.png').convert('RGB') for i in range(21)]
    assert all(im.size==(1280,720) for im in frames)
    crops=[im.crop(CROP) for im in frames]
    diff=lambda a,b:sum(x!=y for x,y in zip(a.tobytes(),b.tobytes()))
    foot_boxes=[(246,412,286,442),(350,412,390,442)]
    foot_changes=[[diff(frames[0].crop(box),im.crop(box)) for im in frames] for box in foot_boxes]
    channel_changes=[diff(crops[0],im) for im in crops]
    assert max(channel_changes)>500,'No actual motion captured'
    gif=[]
    for crop in crops[:20]:
        canvas=Image.new('RGB',(474,250),'#18202b');draw=ImageDraw.Draw(canvas)
        draw.text((10,8),'STATIC NATIVE FRAME',fill='white')
        draw.text((247,8),'ACTUAL NATIVE IDLE',fill='white')
        canvas.paste(crops[0],(6,28));canvas.paste(crop,(243,28));gif.append(canvas)
    gif[0].save(OUT/'idle-final.gif',save_all=True,append_images=gif[1:],duration=110,loop=0,disposal=2,optimize=False)
    frames[0].save(OUT/'battle-final.png')
    before=json.loads(gzip.decompress((frames_dir/'initial.state.json.gz').read_bytes()))
    after=json.loads(gzip.decompress((frames_dir/'final.state.json.gz').read_bytes()))
    for file in ['initial.state.json.gz','final.state.json.gz']:
        shutil.copyfile(frames_dir/file,OUT/('final-'+file))
    report={'case':name,'scope':'actual 1280x720 Simulator screenshots, performance measured separately',
            'characterCrop':CROP,'footRegions':foot_boxes,'footChangedChannelValues':foot_changes,
            'strictFootPixels':'pass' if max(max(v) for v in foot_changes)==0 else 'fail',
            'motionChangedChannelValues':channel_changes,'loopClosingChangedChannels':channel_changes[-1],
            'simulationTimeBefore':before.get('time'),'simulationTimeAfter':after.get('time'),
            'gifFrames':20,'gifDurationMs':2200,
            'rawPngSha256':[hashlib.sha256((frames_dir/f'idle-{i:02d}.png').read_bytes()).hexdigest() for i in range(21)]}
    (OUT/'visual-measurements.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps(report))
