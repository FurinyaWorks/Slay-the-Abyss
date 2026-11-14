"""Original native geometry experiment; reuses the repository triangle solver.
Not raster tracing, not texture import, not a production asset registry.
"""
import copy, importlib.util, json, math
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[2]; OUT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('placement',ROOT/'scripts/art/native-triangle-placement.py'); placement=importlib.util.module_from_spec(spec);spec.loader.exec_module(placement)
seed=json.loads((ROOT/'experiments/art-tech-lab/seed.save.json').read_text()); prototype=seed['assets']['server']['root']['children'][0]
samples={n['kind']:n for n in prototype['children']}; seq=0

def node(kind,name,x,y,w,h,color='ffffff',rotation=(0,0,0)):
 global seq
 seq+=1;n=copy.deepcopy(prototype if kind=='container' else samples[kind]);n.update(id=f'research{seq}',guid=1080000000+seq,name=name,children=[],scriptMappingIds=[])
 for t in n['transformByPlatform'].values():t.update(offset={'x':x,'y':y},size={'x':w,'y':h},scale={'x':1,'y':1,'z':1},rotation=dict(zip(('x','y','z'),rotation)),anchorMin={'x':.5,'y':.5},anchorMax={'x':.5,'y':.5},pivot={'x':.5,'y':.5})
 if kind=='image': n.update(imageId=100001,imageColor=int('ff'+color,16))
 if kind=='textbox':n.update(text=name,fontSize=14,minimumFontSize=14,fontColor=int('ff'+color,16),bgColor=0,enableOutline=False,horizontalAlignment='Middle',verticalAlignment='Middle')
 if kind=='container':n['isRootContainer']=False
 return n

class Art:
 def __init__(self,id):self.id=id;self.polygons=[];self.shapes=[]
 def poly(self,pts,c):
  self.polygons.append({'points':pts,'color':c})
  # KNOWN DEFECT: polygons 4/5/12 are concave; fan triangulation overdraws.
  # Preserved as a reproducible rejected probe, not a production exporter.
  for i in range(1,len(pts)-1):
   u=np.array(pts[i])-pts[0];v=np.array(pts[i+1])-pts[0]
   if abs(float(u[0]*v[1]-u[1]*v[0]))<1e-9:continue
   for _,p in placement.place([pts[0],pts[i],pts[i+1]],64,depth=1):
    n=node('image',f'{self.id}-{len(self.shapes)}',p['cx']-72,p['cy']-32,p['w'],p['h'],c,(p['rx'],p['ry'],p['rz']));n['imageId']=100003;self.shapes.append(n)
 def rect(self,x,y,w,h,c):
  self.polygons.append({'points':[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],'color':c});self.shapes.append(node('image',f'{self.id}-{len(self.shapes)}',x+w/2-72,32-y-h/2,w,h,c))
 def line(self,a,b,width,c):
  dx=b[0]-a[0];dy=b[1]-a[1];d=math.hypot(dx,dy);nx=-dy/d*width/2;ny=dx/d*width/2
  self.polygons.append({'points':[[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny]],'color':c})
  self.shapes.append(node('image',f'{self.id}-line-{len(self.shapes)}',(a[0]+b[0])/2-72,32-(a[1]+b[1])/2,d,width,c,(0,0,-math.degrees(math.atan2(dy,dx)))))
 def svg(self):
  return '<svg xmlns="http://www.w3.org/2000/svg" width="144" height="64" viewBox="0 0 144 64">'+''.join('<polygon fill="#'+p['color']+'" points="'+' '.join(','.join(str(n) for n in pt) for pt in p['points'])+'"/>' for p in self.polygons)+'</svg>'

def cleave(id,variant):
 a=Art(id);a.rect(0,0,144,64,'172c36');a.poly([[0,0],[48,0],[15,41],[0,34]],'233f47');a.poly([[144,0],[110,0],[88,38],[144,28]],'29464b');a.poly([[0,48],[77,36],[144,44],[144,64],[0,64]],'313b3b')
 # variant A: eye-level eruption; B: overhead radial impact, not a mirrored A.
 if variant==0:
  a.poly([[0,43],[52,46],[79,38],[144,39],[115,55],[51,62]],'bd8f4a');a.poly([[0,50],[49,51],[65,46],[144,43],[108,52],[56,57]],'ffe3a0')
  a.poly([[41,17],[78,11],[95,24],[85,52],[53,55],[35,39]],'493c37');a.poly([[41,17],[59,18],[53,55],[35,39]],'866345');a.poly([[59,18],[78,11],[82,36],[69,54],[53,55]],'bb8a4b');a.poly([[78,11],[95,24],[85,52],[79,40]],'78573d')
  a.poly([[36,15],[45,8],[80,7],[95,15],[88,21],[45,21]],'e0b46b');a.poly([[45,8],[80,7],[90,14],[48,16]],'ffe6ac');a.poly([[36,15],[45,21],[88,21],[91,17],[48,18]],'8b683e')
  for aa,bb in [((59,24),(72,24)),((72,24),(68,32)),((68,32),(77,39)),((77,39),(72,51)),((45,26),(50,29)),((50,29),(44,42))]:a.line(aa,bb,1.6,'ffcf66')
  targets=[(21,40,9),(119,44,10)]
 else:
  a.poly([[12,37],[50,19],[117,23],[141,42],[94,61],[33,58]],'bf914b');a.poly([[20,38],[53,24],[112,28],[131,42],[93,54],[38,53]],'ffe0a0');a.poly([[30,38],[57,28],[104,31],[119,42],[88,49],[43,47]],'795d42')
  a.poly([[50,23],[76,15],[95,25],[93,42],[67,50],[49,39]],'75543d');a.poly([[49,23],[63,29],[67,50],[49,39]],'af7d43');a.poly([[63,29],[95,25],[93,42],[67,50]],'9d713f');a.poly([[48,22],[74,12],[99,24],[70,34]],'e9bb70');a.poly([[55,22],[75,16],[90,24],[70,29]],'ffe8ad');a.poly([[48,22],[70,34],[70,38],[48,26]],'634a37');a.poly([[70,34],[99,24],[97,28],[70,38]],'634a37')
  for aa,bb in [((75,37),(85,34)),((85,34),(84,40)),((84,40),(76,43)),((76,43),(77,46))]:a.line(aa,bb,1.5,'ffd879')
  targets=[(22,24,8),(119,52,8)]
 for x,y,s in targets:
  a.poly([[x-s,y+3],[x-s,y-s/2],[x-s/2,y-s],[x+s/3,y-s],[x+s,y-s/3],[x+s,y+3]],'252a3f');a.poly([[x-s+1,y],[x-s/2,y-s+1],[x+s/3,y-s+1],[x+s-2,y-3],[x,y]],'4a4e67');a.rect(x-4,y-4,1.8,4,'fff0b7');a.rect(x+2,y-4,1.8,4,'fff0b7')
 for x,y in [(31,34),(104,31),(37,57),(97,57)]:a.poly([[x,y],[x+3,y-5],[x+5,y],[x+2,y+3]],'ab895e')
 return a

def armaments(id,variant):
 a=Art(id);a.rect(0,0,144,64,'243139');a.poly([[0,0],[66,0],[25,64],[0,64]],'34494b');a.poly([[107,0],[144,0],[144,64],[78,64]],'1c2933')
 # A: diagonal bracer and fastening tool. B: overhead workbench, clasp repair.
 if variant==0:
  a.poly([[17,10],[29,7],[102,37],[119,49],[109,61],[91,58],[22,29]],'3d4353');a.poly([[26,10],[37,11],[108,40],[113,52],[98,55],[28,26]],'a9adbd');a.poly([[29,11],[37,11],[106,40],[95,44],[31,21]],'eee8d9');a.poly([[31,21],[95,44],[98,55],[28,26]],'c6c4cd');a.poly([[17,10],[26,10],[28,26],[22,29],[14,22]],'e9e3d4');a.poly([[18,14],[23,13],[24,25],[20,24]],'53596b')
  a.poly([[74,25],[82,29],[76,44],[68,41]],'4b79a4');a.poly([[77,27],[81,29],[74,44],[71,42]],'a5d7e9');a.poly([[98,38],[105,40],[99,55],[91,52]],'7297b6')
  for aa,bb in [((31,15),(86,48)),((34,27),(91,38))]:a.line(aa,bb,1,'f7f2df')
  a.poly([[89,24],[96,23],[102,30],[97,37],[89,34],[85,29]],'e8c686');a.poly([[91,26],[96,26],[98,30],[95,33],[90,31]],'758396')
  a.poly([[102,0],[109,0],[105,15],[96,27],[92,26],[99,13]],'919097');a.poly([[114,0],[120,0],[109,21],[100,29],[97,26],[106,17]],'c6b7a0');a.poly([[102,5],[112,8],[112,13],[107,16],[101,12]],'5d626f');a.rect(105,10,2,2,'e6cf9e')
  a.line((96,22),(95,18),.8,'ffe5a5');a.line((100,27),(106,27),.8,'ffe5a5')
 else:
  a.poly([[8,57],[25,11],[41,7],[55,12],[71,50],[64,61]],'696b7d');a.poly([[25,11],[41,7],[55,12],[48,38],[20,44]],'e7e3d9');a.poly([[20,44],[48,38],[64,61],[8,57]],'aaaabd');a.poly([[27,14],[38,11],[47,13],[41,20],[26,22]],'343d50');a.poly([[26,28],[51,24],[53,30],[23,35]],'6fadd2');a.poly([[26,29],[51,25],[51,27],[25,32]],'b2e2f3');a.poly([[16,48],[56,44],[58,49],[14,53]],'6fadd2');a.line((29,22),(51,53),1,'fff3d6');a.line((49,17),(21,48),1,'fff3d6')
  a.poly([[65,31],[77,24],[108,24],[116,32],[109,38],[75,38]],'576174');a.poly([[65,31],[78,28],[107,28],[112,32],[107,34],[76,34]],'e2e4dd');a.poly([[109,26],[133,26],[137,30],[133,34],[110,34]],'754e3c');a.rect(110,23,3,15,'c4a05f')
  a.poly([[54,14],[60,10],[68,15],[64,21],[57,22],[52,18]],'e4bc73');a.poly([[57,14],[61,13],[64,16],[62,19],[57,18]],'4c6b80');a.poly([[81,0],[85,0],[75,13],[64,17],[63,14],[73,9]],'c3c4c4');a.poly([[89,2],[93,4],[82,17],[68,20],[66,17],[79,13]],'838896');a.line((66,12),(66,7),1,'ffe5a5')
 return a

arts=[];failures=[]
for fn,id,var in [(cleave,'cleave-a',0),(cleave,'cleave-b',1),(armaments,'armaments-a',0),(armaments,'armaments-b',1)]:
 try:arts.append(fn(id,var))
 except placement.PlacementUnavailable as e:failures.append({'id':id,'reason':str(e)});print(id,str(e))
records=[]
for a in arts:
 (OUT/f'{a.id}.source.svg').write_text(a.svg());(OUT/f'{a.id}.geometry.json').write_text(json.dumps(a.polygons,separators=(',',':')))
 art=node('container',a.id,0,0,144,64);art['children']=list(reversed(a.shapes))
 (OUT/f'{a.id}.native.json').write_text(json.dumps(art,separators=(',',':')))
 records.append(dict(id=a.id,images=len(a.shapes),groups=1,masks=0,total=len(a.shapes)+1,sourcePolygons=len(a.polygons),officialVerified=False))
 # Per-variant sheet: exact1x, 4x and full card using same native art tree, no raster embed.
 save=copy.deepcopy(seed);r=copy.deepcopy(prototype);r.update(name='CardArtResearch',children=[],scriptMappingIds=[])
 for t in r['transformByPlatform'].values():t['scale']={'x':1,'y':1,'z':1}
 def add(n):r['children'].append(n);return n
 add(node('image','background',0,0,1600,900,'101923'));add(node('textbox',a.id+' | SIMULATOR ONLY - NOT OFFICIAL',0,360,1000,40,'fff0c9'))
 for scale,x,y in [(1,-490,200),(4,-250,0)]:
  n=copy.deepcopy(art)
  for t in n['transformByPlatform'].values():t['offset']={'x':x,'y':y};t['scale']={'x':scale,'y':scale,'z':1}
  add(n)
 card=node('container','card',360,0,148,208);card['children']=[node('image','frame',0,0,148,208,'9d8153'),node('image','paper',0,0,144,204,'202b39')]
 n=copy.deepcopy(art)
 for t in n['transformByPlatform'].values():t['offset']={'x':0,'y':39}
 card['children'].append(n)
 data=next(c for c in json.loads((ROOT/'data/cards.json').read_text())['cards'] if c['id']==a.id.split('-')[0])
 # Presentation identity from active overlay; numeric effects remain base data.
 overlay=json.loads((ROOT/'data/presentation/traveler.zh-CN.json').read_text())['cards'].get(data['id'],{})
 data=copy.deepcopy(data);data['name']=overlay.get('name',data['name'])
 # Font is simulator, not device acceptance.
 card['children'] += [node('textbox',data['name'],0,85,140,40,'f4e9ce'),node('textbox',data['text'],0,-40,132,90,'e0e6ea'),node('textbox',str(data['cost']),-60,85,30,40,'ffe7a4')]
 card['children'].reverse();add(card);r['children'].reverse();save['assets']['server']['root']['children']=[r];save['assets']['scripts']=[];save['meta']['name']=a.id
 def unique(n):
  global seq
  seq+=1;n['id']=f'research{seq}';n['guid']=1080000000+seq
  for c in n['children']:unique(c)
 unique(r)
 (OUT/f'{a.id}.save.json').write_text(json.dumps(save,separators=(',',':')))
(OUT/'counts.json').write_text(json.dumps(records,indent=2));print(records)

(OUT/'failures.json').write_text(json.dumps(failures,indent=2))
