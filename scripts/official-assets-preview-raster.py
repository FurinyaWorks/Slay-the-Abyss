"""PIL geometry/text diagnostic, not a browser or native SDK screenshot."""
import json, math, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
out=Path(sys.argv[1]); scenes=json.loads((out/'scenes.json').read_text())
font_path='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
if not Path(font_path).exists(): font_path='/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc'
def font(n): return ImageFont.truetype(font_path,max(1,round(n)))
def rgba(s,default='#FFFFFF'):
 s=s or default
 try:return tuple(bytes.fromhex(s.lstrip('#')))
 except:return (255,255,255)
def wrap(text,f,width):
 rows=[]
 for line in text.split('\n'):
  row=''
  for char in line:
   if row and f.getlength(row+char)>width:rows.append(row);row=char
   else:row+=char
  rows.append(row)
 return rows
reports=[]
for scene in scenes:
 im=Image.new('RGB',(1280,800),'#151820');d=ImageDraw.Draw(im)
 d.rectangle((0,0,1280,79),fill='#352440')
 d.text((10,5),'离线诊断，非官方客户端 | '+scene['name'],font=font(22),fill='#FFFFFF')
 d.text((10,34),'PIL几何文字示意，非浏览器截图；全部SDK纹理未知，不证明色彩、字体或官方美术通过。',font=font(15),fill='#FFFFFF')
 d.text((10,57),'原生富文本/旋转/裁切差异未验；控件安全区仅按1280×720舞台检查。',font=font(14),fill='#DDCCEE')
 report={'scene':scene['name'],'provenance':scene.get('provenance'),'textOverflowCandidates':[],'outsideStage':[],'rotatedTextUnverified':[],'unknownImageCount':0,'overlappingSiblingHits':[]}
 hits=[]
 def walk(c,cx=640,cy=440,kx=1,ky=1,path='',angle=0):
  if c.get('visible') is False:return
  path+='/'+c['name'];pos=c.get('position',[0,0]);rad=math.radians(-angle);dx=pos[0]*kx;dy=-pos[1]*ky;cx+=dx*math.cos(rad)-dy*math.sin(rad);cy+=dx*math.sin(rad)+dy*math.cos(rad)
  scale=c.get('scale') or [1,1];kx*=scale[0];ky*=scale[1];angle+=c.get('rotation') or 0
  w,h=c.get('size',[1280,720]);w*=kx;h*=ky
  x,y=cx-w/2,cy-h/2;kind=c.get('kind');box=(x,y,x+w,y+h)
  rad=math.radians(angle);bw=abs(w*math.cos(rad))+abs(h*math.sin(rad));bh=abs(w*math.sin(rad))+abs(h*math.cos(rad));bounds=(cx-bw/2,cy-bh/2,cx+bw/2,cy+bh/2)
  if kind in ['text','cursorArea'] and (bounds[0]<-.5 or bounds[1]<79.5 or bounds[2]>1280.5 or bounds[3]>800.5): report['outsideStage'].append({'path':path,'box':bounds})
  if kind=='image':
   report['unknownImageCount']+=1
   if w>0 and h>0:d.rectangle(box,outline='#39424B',width=1)
   if w>110 and h>60:d.text((x+2,y+2),'? SDK '+str(c.get('image')),font=font(10),fill='#566574')
  if kind=='cursorArea':hits.append((path,box))
  if kind=='text':
   t=c['text'];text=t.get('content','');size=t['fontSize']*min(kx,ky);minimum=t.get('minFontSize',t['fontSize'])*min(kx,ky)
   # Only remove supported native color tags for measurement. Original tree retained.
   import re
   text=re.sub(r'</?color(?:=#[0-9A-Fa-f]{6})?>','',text)
   while True:
    f=font(size);lines=wrap(text,f,max(1,w));height=len(lines)*size*1.3
    if height<=h or size<=minimum:break
    size-=1
   if height>h+1:report['textOverflowCandidates'].append({'path':path,'text':text,'measuredHeight':height,'boxHeight':h});d.rectangle(box,outline='#FF5577',width=2)
   if angle:report['rotatedTextUnverified'].append(path)
   top=y+max(0,(h-height)/2)
   for line in lines:
    tx=x if t.get('align')=='left' else x+(w-f.getlength(line))/2
    d.text((tx,top),line,font=f,fill=rgba(t.get('colour'))[:3],anchor='lt');top+=size*1.3
  for child in c.get('children',[]) or []:walk(child,cx,cy,kx,ky,path,angle)
 walk(scene['tree'])
 for i,(a,ab) in enumerate(hits):
  for b,bb in hits[i+1:]:
   if a.rsplit('/',2)[0]!=b.rsplit('/',2)[0]:continue
   iw=min(ab[2],bb[2])-max(ab[0],bb[0]);ih=min(ab[3],bb[3])-max(ab[1],bb[1])
   if iw>1 and ih>1:report['overlappingSiblingHits'].append({'a':a,'b':b,'intersectionArea':iw*ih})
 im.save(out/(scene['name']+'.png'));reports.append(report)
(out/'raster-diagnostics.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))
