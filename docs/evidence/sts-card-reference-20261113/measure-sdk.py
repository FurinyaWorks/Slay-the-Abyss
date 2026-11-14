"""Analysis only: compare source alpha to actual SDK diagnostic pixels."""
from PIL import Image
from pathlib import Path
import numpy as np,json,hashlib,sys
from scipy.ndimage import binary_erosion,distance_transform_edt
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=Path.cwd();private=root/'.artifacts/sts-card-reference'
name=sys.argv[1] if len(sys.argv)>1 else 'masks-1'
sdk=Image.open(private/(name+'.png')).convert('RGB');rgb=np.asarray(sdk);white=np.min(rgb,axis=2)>=142
rows={};fig,axes=plt.subplots(1,2,figsize=(10,7),dpi=140)
for i,(key,file,offset,region) in enumerate([
 ('body','base_ironclad_attack.png',(200,30),(0,820)),
 ('frame','rarity_frame_common_attack.png',(830,30),(820,1600))]):
 source=Image.open(private/file).convert('RGBA');alpha=np.asarray(source)[:,:,3]>=128
 expected=np.zeros(white.shape,dtype=bool);x,y=offset;expected[y:y+source.height,x:x+source.width]=alpha
 candidate=white.copy();candidate[:,:region[0]]=False;candidate[:,region[1]:]=False
 eb=expected^binary_erosion(expected);cb=candidate^binary_erosion(candidate)
 to_expected=distance_transform_edt(~eb)[cb];to_candidate=distance_transform_edt(~cb)[eb]
 row={'sourceSha256':hashlib.sha256((private/file).read_bytes()).hexdigest(),'sdkSha256':hashlib.sha256((private/(name+'.png')).read_bytes()).hexdigest(),
  'sdkForeground':'RGB each channel >=142, against dark diagnostic field','sourceForeground':'alpha>=128',
  'sourceToScreenshotOffset':list(offset),'sourcePixelScale':1,'sourceToLogicalScale':.25,
  'maskIoU':float(np.sum(expected&candidate)/np.sum(expected|candidate)),
  'boundaryMaxSourcePx':float(max(np.max(to_expected),np.max(to_candidate))),
  'boundaryP95SourcePx':float(np.quantile(np.concatenate([to_expected,to_candidate]),.95)),
  'boundaryMeanSourcePx':float(np.mean(np.concatenate([to_expected,to_candidate]))),
  'expectedPixels':int(np.sum(expected)),'candidatePixels':int(np.sum(candidate)),
  'interiorMissingPixels':int(np.sum((distance_transform_edt(expected)>8)&~candidate)),
  'scope':'actual SDK software renderer; edge bleed is in the matching prepared receipt; no official-device claim'}
 row['boundaryMaxLogicalPx']=row['boundaryMaxSourcePx']*.25;rows[key]=row
 axes[i].contour(expected,levels=[.5],colors=['#00aa55'],linewidths=.8)
 axes[i].contour(candidate,levels=[.5],colors=['#ee4433'],linewidths=.6)
 axes[i].set_xlim(offset[0]-10,offset[0]+source.width+10);axes[i].set_ylim(offset[1]+source.height+10,offset[1]-10)
 axes[i].set_aspect('equal');axes[i].set_title(key+' / green source, red actual SDK')
 axes[i].set_xlabel('Source pixel scale; logical size is 1/4')
fig.suptitle('Actual renderer residual; not a full visual-fidelity pass')
fig.tight_layout();fig.savefig(private/(name+'-residual.png'));plt.close(fig)
(private/(name+'-residual.json')).write_text(json.dumps(rows,indent=2))
print(json.dumps(rows,indent=2))
