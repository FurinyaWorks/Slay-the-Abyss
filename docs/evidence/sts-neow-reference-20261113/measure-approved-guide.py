"""Real SDK PNG vs independently rendered approved SVG, same screen coordinates."""
import json, sys, hashlib
from pathlib import Path
from PIL import Image, ImageDraw
out=Path(sys.argv[1]);reference=out/'approved-guide-position.png';candidate=out/'two-normal.png'
old=Path(sys.argv[2]) if len(sys.argv)>2 else Path('.artifacts/style-fidelity-20261113/visual-history/neow/visual-current-1/two-normal.png')
ref=Image.open(reference).convert('RGB');now=Image.open(candidate).convert('RGB');previous=Image.open(old).convert('RGB')
roi=(930,110,1135,324)
def mask(image,colour):
    return {(x,y) for y in range(roi[1],roi[3]) for x in range(roi[0],roi[2]) if max(abs(a-b) for a,b in zip(image.getpixel((x,y)),colour))<=2}
expected=mask(ref,(17,30,36));actual=mask(now,(17,30,36));negative=mask(previous,(13,27,32))
def score(value):
    return {'intersection':len(value&expected),'union':len(value|expected),'iou':len(value&expected)/len(value|expected),'missing':len(expected-value),'extra':len(value-expected)}
normal=score(actual);old_result=score(negative)
assert normal['iou']>=.98,normal
assert old_result['iou']<.9,old_result
# Read actual pixels in the former exposed y44..80 gap; the scene's solid
# colour is distinguishable from old nodeBackdrop's gold texture.
seam={str(y):{'candidate':now.getpixel((800,y)),'old':previous.getpixel((800,y))} for y in (43,44,50,60,70,79)}
# Boundary row43 receives native HUD/scene antialias (max3 RGB); interior
# rows are exactly scene fill. The old candidate's row43 was gold149/119/86.
assert max(abs(a-b) for a,b in zip(seam['43']['candidate'],(16,28,28)))<=3,seam
assert all(tuple(v['candidate'])==(16,28,28) for y,v in seam.items() if y!='43'),seam
assert any(tuple(v['old'])!=tuple(v['candidate']) for v in seam.values()),seam
crop=(830,75,1280,635);size=(450,560)
sheet=Image.new('RGB',(1800,594),'#151c1d');draw=ImageDraw.Draw(sheet)
for i,(label,image) in enumerate([('Approved SVG, original position',ref),('SDK current candidate',now),('Overlay: reference 50% + candidate',Image.blend(ref,now,.5)),('Escaped old body / circle hood',previous)]):
    draw.text((i*450+8,8),label,fill='white');sheet.paste(image.crop(crop),(i*450,30))
sheet.save(out/'guide-same-position-comparison.png')
diff=Image.new('RGB',(1280,720),'#151c1d')
for x,y in expected&actual:diff.putpixel((x,y),(40,190,100))
for x,y in expected-actual:diff.putpixel((x,y),(255,70,70))
for x,y in actual-expected:diff.putpixel((x,y),(70,120,255))
diff.crop((900,80,1160,350)).resize((520,540)).save(out/'hood-mask-difference.png')
result={'kind':'same-position-svg-vs-real-sdk-png','scope':'hood visible dark opening and HUD body seam, not full scene/style approval','hoodROI':roi,'tolerancePerChannel':2,'minimumIoU':.98,'candidate':normal,'oldBodyNegative':old_result,'formerGoldGapPixels':seam,'hudBottom':'43px derived from actual shared officialAssets.battleHud y/height; independent 44px left a gold gap','files':{str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in (reference,candidate,old)},'officialClient':'not_run','gradient':'vertical 2px source-silhouette approximation; original SVG slight horizontal slant unverified'}
(out/'guide-comparison.json').write_text(json.dumps(result,indent=2),encoding='utf8');print(json.dumps(result,indent=2))
