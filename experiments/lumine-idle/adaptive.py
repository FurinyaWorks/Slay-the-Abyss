"""Fixed 210px source; allocate a hard rectangle budget by visual importance.

Native ABI, bands, cached drawing and runtime are the existing #626 mechanism.
Only the offline subdivision chooses where detail is retained. No new artwork.
"""
import sys
import heapq
import json
import hashlib
import importlib.util
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, __version__ as pillow_version

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'art/characters/traveler-geo/idle-approved-v1/lumine_static_approved.png'
SOURCE_SHA='32830a9ab3f0b181202205bba59447efe660ce3225ab26f32943c54753a105de'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==SOURCE_SHA
output_args=[arg.split('=',1)[1] for arg in sys.argv[1:] if arg.startswith('--output=')]
assert len(output_args)<=1
OUT=ROOT/(output_args[0] if output_args else '.artifacts/lumine-convergence-inputs')
OUT.mkdir(parents=True,exist_ok=True)
W,H=210,192
PINNED='--pin-details' in sys.argv
EDGE_CUTS='--edge-cuts' in sys.argv
PREFIX=('pinned' if PINNED else 'adaptive')+('-edge' if EDGE_CUTS else '')
PINS=[(116,23,136,43),(96,9,115,28)] if PINNED else []
image=Image.open(SOURCE).convert('RGBA').resize((W,H),Image.Resampling.LANCZOS)
rgba=np.asarray(image).astype(np.float64)/255
rgba[rgba[:,:,3]<8/255]=0
alpha=rgba[:,:,3]
target=np.concatenate((rgba[:,:,:3]*alpha[:,:,None],alpha[:,:,None]),axis=2)

importance=np.ones((H,W),dtype=np.float64)
# Coordinates are on the frozen 210x192 image, not a different drawing.
regions={'hair':(83,2,139,69,6),'face':(105,15,134,49,22),
         'eyes':(115,23,133,42,35),'flower':(94,8,118,31,16),
         'coreDress':(82,51,142,133,4),'sword':(64,89,157,153,3)}
for x0,y0,x1,y1,weight in regions.values():
    importance[y0:y1,x0:x1]=np.maximum(importance[y0:y1,x0:x1],weight)
edge=np.zeros((H,W),dtype=np.float64)
edge[:,1:]=np.maximum(edge[:,1:],np.abs(alpha[:,1:]-alpha[:,:-1]))
edge[:,:-1]=np.maximum(edge[:,:-1],np.abs(alpha[:,1:]-alpha[:,:-1]))
edge[1:]=np.maximum(edge[1:],np.abs(alpha[1:]-alpha[:-1]))
edge[:-1]=np.maximum(edge[:-1],np.abs(alpha[1:]-alpha[:-1]))
importance+=edge*10

def integral(values):
    return np.pad(values.cumsum(axis=0).cumsum(axis=1),((1,0),(1,0),(0,0)))

sums=integral(np.concatenate((importance[:,:,None],target*importance[:,:,None],target*target*importance[:,:,None]),axis=2))
channel_weights=np.array([1.,1.,1.,5.])

def trim(box):
    x0,y0,x1,y1=box
    ys,xs=np.nonzero(alpha[y0:y1,x0:x1])
    if not len(xs):return None
    return (x0+int(xs.min()),y0+int(ys.min()),x0+int(xs.max())+1,y0+int(ys.max())+1)

def region(box):
    x0,y0,x1,y1=box
    values=sums[y1,x1]-sums[y0,x1]-sums[y1,x0]+sums[y0,x0]
    weight=values[0]
    mean=values[1:5]/weight
    error=float(np.maximum(0,values[5:9]-values[1:5]*mean)@channel_weights)
    return mean,error

class Leaf:
    serial=0
    def __init__(self,box,band):
        self.box=box;self.band=band;self.mean,self.error=region(box)
        self.id=Leaf.serial;Leaf.serial+=1;self.split=None;self.gain=0
        x0,y0,x1,y1=box
        for axis in [0,1]:
            if (x1-x0 if axis==0 else y1-y0)<=1:continue
            cuts=range((x0 if axis==0 else y0)+1,x1 if axis==0 else y1) if EDGE_CUTS else [(x0+x1)//2 if axis==0 else (y0+y1)//2]
            for cut in cuts:
                parts=[(x0,y0,cut,y1),(cut,y0,x1,y1)] if axis==0 else [(x0,y0,x1,cut),(x0,cut,x1,y1)]
                parts=[b for b in map(trim,parts) if b]
                error=sum(region(b)[1] for b in parts)
                gain=self.error-error
                # A trim that removes empty background can be free in image count.
                score=gain/max(.25,len(parts)-1)
                if gain>1e-10 and score>self.gain:
                    self.gain=score;self.split=parts

def render(leaves):
    canvas=Image.new('RGBA',(W,H))
    draw=ImageDraw.Draw(canvas)
    for leaf in leaves:
        x0,y0,x1,y1=leaf.box
        premul=leaf.mean
        rgb=np.clip(premul[:3]/max(premul[3],1e-9),0,1)
        color=tuple(int(round(float(v)*255)) for v in rgb)+(max(1,int(round(float(premul[3])*255))),)
        draw.rectangle((x0,y0,x1-1,y1-1),fill=color)
    return canvas

def save(leaves,budget,bounds):
    ordered=sorted(leaves.values(),key=lambda v:(v.band,v.box[1],v.box[0],v.id))
    rows=[];band_by_row=[]
    for leaf in ordered:
        x0,y0,x1,y1=leaf.box;mean=leaf.mean
        rgb=np.clip(mean[:3]/max(mean[3],1e-9),0,1)
        color=[int(round(float(v)*255)) for v in rgb]+[max(1,int(round(float(mean[3])*255)))]
        rows.append([100001,(x0+x1)/2-W/2,H/2-(y0+y1)/2,x1-x0,y1-y0,.5,.5,.5,.5,.5,.5,1,1,0,*color])
        band_by_row.append(leaf.band)
    asset={'width':W,'height':H,'root':[0,0,W,W,.5,.5,.5,.5,.5,.5,1,1,0],
           'count':len(rows),'rows':rows,'renderProfile':'approved-idle-v1','cache':True,'runtimeV2':True,'rectanglesOnly':True,
           'sourceSha256':SOURCE_SHA,'jsonSha256':hashlib.sha256(json.dumps(rows).encode()).hexdigest(),
           'bands':[(a+b)/2/H*585 for a,b in zip(bounds,bounds[1:])],
           'bandByRow':band_by_row,'period':2.2}
    assert len(rows)==budget
    (OUT/f'{PREFIX}-{budget}.json').write_text(json.dumps(asset,separators=(',',':')),encoding='utf-8')
    preview=render(ordered);preview.save(OUT/f'{PREFIX}-{budget}.png')
    # Same full resolution; errors are diagnostics, not a visual acceptance score.
    reconstructed=np.asarray(preview).astype(np.float64)/255
    delta=np.abs(reconstructed-rgba)
    report={'budget':budget,'actualImages':len(rows),'canvas':[W,H],'sourceSha256':SOURCE_SHA,
            'method':'saliency-weighted binary subdivision on the fixed full-resolution source; no global downsample',
            'regions':regions,'pillow':pillow_version,'numpy':np.__version__,
            'preservedRegions':PINS,'preservedImages':sum(getattr(v,'frozen',False) for v in ordered),
            'cutStrategy':'best source-pixel boundary' if EDGE_CUTS else 'midpoint only',
            'generatorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            'meanRgbaError':float(delta.mean()),'faceMeanRgbaError':float(delta[15:49,105:134].mean()),
            'weightedObjective':sum(v.error for v in ordered)}
    (OUT/f'{PREFIX}-{budget}.receipt.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    return report

if __name__=='__main__':
    budgets=sorted(set(int(x) for x in sys.argv[1:] if not x.startswith('--')))
    assert budgets and 24<=budgets[0]<=budgets[-1]<=7303
    for budget in budgets:
        for suffix in ['json','png','receipt.json']:
            assert not (OUT/f'{PREFIX}-{budget}.{suffix}').exists(),'use a fresh --output directory; never overwrite a measured asset'
    bounds=sorted(set([0,H]+list(range(0,round(H*490/585),round(H/20)))+[round(H*490/585)]))
    leaves={};queue=[]
    def add(box,band):
        if box is None:return
        node=Leaf(box,band);leaves[node.id]=node
        if node.split:heapq.heappush(queue,(-node.gain,node.id,node))
    if PINNED:
        # Reserve approved face/flower spans before allocating secondary detail.
        # Reuse the exact 48-color quantizer and rectangle merger from convert.py.
        small=image.convert('RGB').quantize(colors=48,method=Image.Quantize.MEDIANCUT).convert('RGBA')
        small.putalpha(image.getchannel('A').point(lambda a:min(255,round(a/32)*32)))
        mask=Image.new('L',(W,H));draw=ImageDraw.Draw(mask)
        for x0,y0,x1,y1 in PINS:draw.rectangle((x0,y0,x1-1,y1-1),fill=255)
        small.putalpha(Image.fromarray(np.minimum(np.asarray(small.getchannel('A')),np.asarray(mask))))
        spec=importlib.util.spec_from_file_location('merger',ROOT/'scripts/art/build-performance-pack.py')
        merger=importlib.util.module_from_spec(spec);spec.loader.exec_module(merger)
        rows,_=merger.rectangles(small,(W,H),(W,H),True)
        for i,(top,bottom) in enumerate(zip(bounds,bounds[1:]),1):
            for row in rows:
                x0=round(row[1]+W/2-row[3]/2);y0=round(H/2-row[2]-row[4]/2)
                box=(x0,max(y0,top),x0+round(row[3]),min(y0+round(row[4]),bottom))
                if box[3]<=box[1]:continue
                node=Leaf(box,i);color=np.array(row[14:18])/255
                node.mean=np.r_[color[:3]*color[3],color[3]]
                node.error=0;node.split=None;node.frozen=True;leaves[node.id]=node
        xs=sorted(set([0,W]+[v for r in PINS for v in (r[0],r[2])]))
        ys=sorted(set(bounds+[v for r in PINS for v in (r[1],r[3])]))
        for top,bottom in zip(ys,ys[1:]):
            band=next(i for i,(a,b) in enumerate(zip(bounds,bounds[1:]),1) if a<=top<bottom<=b)
            for left,right in zip(xs,xs[1:]):
                if any(x0<=left<right<=x1 and y0<=top<bottom<=y1 for x0,y0,x1,y1 in PINS):continue
                add(trim((left,top,right,bottom)),band)
        assert len(leaves)<=budgets[0],'reserved details exceed the requested budget'
    else:
        for i,(top,bottom) in enumerate(zip(bounds,bounds[1:]),1):add(trim((0,top,W,bottom)),i)
    for budget in budgets:
        while len(leaves)<budget:
            assert queue,'source exhausted before budget'
            _,_,node=heapq.heappop(queue)
            del leaves[node.id]
            for box in node.split:add(box,node.band)
        print(json.dumps(save(leaves,budget,bounds)))
