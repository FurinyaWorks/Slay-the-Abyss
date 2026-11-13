// Single-card geometry study. Source rasters stay private; no production theme
// switch or full-pool replacement is enabled by importing this module.
import {nativeShape} from './v25-battle-scene.mjs';
import {nativeRoundedMaterial} from './official-battle-card-chrome.mjs';

const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const stsAngerReference=freeze({
 id:'sts1-pc-anger-common-attack-v1',card:'Anger',character:'ironclad',type:'attack',rarity:'common',
 source:{page:'https://maybelatergames.co.uk/spirespy/cards/ironclad/anger/',
  official:'https://store.steampowered.com/app/646570/Slay_the_Spire/',
  coordinates:'source pixels, top-left origin; bbox edge coordinates; alpha>=128',
  bodySize:[600,840],logicalSize:[150,210],scale:.25},
 contours:{
  body:{sha256:'672eb9535de014f70932e479e061c1bff5dc66042b9b02f7d56ce50847606cb4',offset:[0,0],
   points:[[72,4],[541,5],[578,7],[594,12],[597,149],[595,483],[598,635],[595,834],[527,839],[6,835],[3,743],[5,16],[6,9],[16,7]],
   measurement:{vertices:14,maxBoundarySourcePx:1.968614954697249,maskIoU:.9968509936391693}},
  frame:{sha256:'d24e6c71fe1e772a8bafda19bc384d221624eed47f63cc3d6b0d6e877f2ea8dd',offset:[30,0],
   points:[[13,114],[33,114],[32,225],[36,384],[73,398],[206,438],[214,438],[225,430],[294,429],[324,430],[336,439],[465,400],[514,381],[511,264],[512,114],[532,114],[533,393],[338,459],[325,475],[291,476],[278,482],[254,476],[227,476],[211,461],[79,421],[14,397]],
   measurement:{vertices:26,maxBoundarySourcePx:1.9606312361264786,maskIoU:.9548118507740189}},
  banner:{sha256:'3082b98935e17671a747bf04e6caad6be875392007758d56ee7fd4561291603d',offset:[-24.5,30],
   points:[[268,10],[486,13],[544,21],[580,31],[593,38],[602,49],[603,62],[598,70],[598,76],[605,84],[616,90],[642,120],[648,140],[648,151],[645,152],[635,140],[618,132],[560,128],[553,121],[558,99],[543,92],[513,85],[460,80],[190,80],[136,85],[107,92],[92,99],[97,121],[90,128],[32,132],[15,140],[5,152],[2,151],[3,135],[10,117],[34,90],[45,84],[52,76],[52,70],[47,62],[47,52],[60,36],[96,23],[157,14]],
   measurement:{vertices:44,maxBoundarySourcePx:2,maskIoU:.9846049966239028}},
  cost:{sha256:'25ffda944a31445c69c6c1cfe392035f10fa2794ee72828f899466cc3506cfa8',offset:[-48,-42],
   points:[[71,16],[97,17],[125,31],[139,50],[148,74],[148,93],[137,121],[118,139],[96,149],[70,149],[47,141],[26,123],[14,95],[13,79],[17,62],[28,41],[48,24]],
   measurement:{vertices:17,maxBoundarySourcePx:1.7888543819998317,maskIoU:.9893775228383259}},
 },
 anchors:{title:[300,74],cost:[34,40],type:[305,455],portrait:[300,270],body:[300,680]},
 nativeAdapter:{edgeBleed:.1,earSelection:'balanced',sourceOrigin:[640,338]},
 materialGeometry:{
  bodyFit:{bounds:[3.4561191296740263,5.839972526389518,595.5354343533198,837.0127312831062],radius:12.632894480967709,
   measurement:{maxBoundarySourcePx:2,maskIoU:.9962899248461565,method:'bounded source-alpha fit; actual SDK pending'}},
  frameShadow:{width:7,offset:[30,0],paths:[[[29,114],[31,380],[215,441]],[[515,114],[517,379],[333,440]]]},
  frameStrokeFit:{width:20,offset:[30,0],paths:[[[23,114],[24,225],[25,390]],[[522,114],[522,264],[523,389]],[[25,390],[218,449]],[[523,389],[331,449]]],joints:[[25,390],[523,389]],plaqueIndices:[5,6,7,8,9,10,17,18,19,20,21,22,23]},
  frameSeam:{width:1,offset:[30,0],paths:[[[32,114],[34,382],[215,439]],[[512,114],[514,381],[334,438]]]},
  frameHighlight:{width:6,offset:[30,0],paths:[[[22,395],[216,456]],[[330,456],[525,391]]]},
  plaque:{centre:[303,454],size:[80,30],topY:438,bottomY:472},
  bannerPartition:{front:[0,1,2,3,4,5,6,7,8,19,20,21,22,23,24,25,26,37,38,39,40,41,42,43],right:[8,9,10,11,12,13,14,15,16,17,18,19],left:[26,27,28,29,30,31,32,33,34,35,36,37]},
  bannerHighlight:{width:3,points:[[96,23],[268,10],[486,13],[544,21],[580,31]]},
  costEllipse:{centre:[80.33608095,82.36246175],radii:[66.59362317,66.43288522],
   measurement:{maskIoU:.9847474460839954,maxBoundarySourcePx:1.4142135623730951}},
 },
 // Contours are measured against pinned alpha. Layer placement and interior
 // bevel landmarks are screenshot-fitted and still need official validation.
 uncertainty:{contourToleranceSourcePx:2,placement:'official screenshot fit, approximately +/-2 screenshot pixels',
  material:'flat geometry study; hand-painted texture and exact font are not reproduced',officialClient:'not_run'},
});
export const stsTypeFrameReference=freeze({
 skill:{source:'rarity_frame_common_skill.png',sha256:'f017b06484a5c0e2cda16328c0709be0f8e57a5107f69bc27f41a4dca6d6ccc6',maxBoundarySourcePx:1.8599622199011079,
  points:[[11,113],[32,113],[33,415],[36,427],[41,433],[53,438],[172,440],[212,439],[222,429],[250,428],[324,429],[334,438],[389,440],[493,436],[506,431],[512,422],[513,397],[511,113],[531,113],[533,411],[527,438],[506,453],[490,456],[341,458],[336,459],[331,464],[329,472],[322,475],[223,475],[217,471],[214,462],[206,458],[55,459],[33,454],[18,441],[12,423]]},
 power:{source:'rarity_frame_uncommon_power.png',sha256:'1f8ae741c2adfea4971a7d991c32c5a9b5b243e8d5ade0f1556b86aac62b3742',maxBoundarySourcePx:1.9887921252979306,
  points:[[246,3],[312,4],[345,9],[392,25],[437,49],[467,72],[504,113],[523,145],[538,193],[540,271],[536,295],[528,322],[507,357],[480,387],[442,416],[397,439],[339,458],[326,474],[320,476],[227,476],[221,473],[215,463],[205,458],[147,438],[106,417],[72,392],[38,355],[19,323],[7,274],[6,220],[12,176],[31,131],[62,89],[98,57],[150,27],[198,10]],
  inner:[[265,19],[211,27],[162,43],[110,72],[70,106],[46,142],[28,187],[25,206],[25,258],[29,292],[41,324],[71,366],[101,392],[144,417],[210,439],[225,430],[241,429],[324,430],[333,438],[341,438],[391,422],[435,399],[460,381],[491,347],[506,323],[518,288],[522,228],[519,191],[509,159],[482,114],[466,95],[435,71],[389,45],[351,31],[303,21]],innerMaxBoundarySourcePx:1.8973665961010286},
});

// Character material and rarity material remain independent design dimensions.
// An amber character never turns the common silver banner into a rare gold one.
export function geoCardReferenceTokens(theme){
 const source=theme?.officialAssets?.stsCardReference,geo=theme?.color?.geo;
 if(!source||!/^#[0-9A-Fa-f]{6}$/.test(geo??''))throw Error('Reference study requires the shared UI theme tokens');
 const tokens=structuredClone(source);tokens.character.accent=geo;tokens.cost.face=geo;
 for(const kind of ['uncommon','rare'])if(!tokens.rarity[kind]){
  const tones=theme.cardSkin.rarities[kind],banner=theme.officialAssets.battleBannerByRarity[kind];
  tokens.rarity[kind]={frame:tones[0],frameShadow:tones[1],frameSeam:tones[2],frameHighlight:tones[3],plaque:tones[3],plaqueHighlight:tones[3],banner,bannerFold:tones[1],bannerHighlight:tones[3],ink:tokens.rarity.common.ink};
 }
 return freeze(tokens);
}

const parts=node=>node?.children??[];
export function referenceGeometry(name,points,colour,offset=[0,0],{edgeBleed=stsAngerReference.nativeAdapter.edgeBleed,earSelection=stsAngerReference.nativeAdapter.earSelection}={}){
 const k=stsAngerReference.source.scale;
 // Existing battle adapter uses top-left y=338. This origin puts the 150x210
 // body at (0,0). Its scene-only tint grading must not alter card tokens.
 const triangles=nativeShape({name,type:'polygon',points:points.map(([x,y])=>[565+(x+offset[0])*k,233+(y+offset[1])*k]),colour,opacity:1},{},{edgeBleed,earSelection});
 for(const triangle of triangles)triangle.colour=colour;
 const children=triangles.length<=60?triangles:Array.from({length:Math.ceil(triangles.length/50)},(_,i)=>({name:'part'+i,kind:'container',position:[0,0],size:[150,210],children:triangles.slice(i*50,(i+1)*50)}));
 return {name,kind:'container',position:[0,0],size:[150,210],children};
}
function referenceText(name,value,anchor,size,fontSize,colour){
 const [x,y]=anchor,k=stsAngerReference.source.scale;
 return {name,kind:'text',position:[x*k-75,105-y*k],size,
  text:{content:value,fontSize,minFontSize:fontSize,autoSize:false,align:'centre',valign:'middle',colour,
   outline:true,outlineOpacity:.7}};
}
function referenceLines(name,spec,colour,offset=spec.offset??[0,0]){
 const k=stsAngerReference.source.scale;
 return {name,kind:'container',position:[0,0],size:[150,210],children:(spec.paths??[spec.points]).flatMap((points,i)=>
  nativeShape({name:name+i,type:'line',points:points.map(([x,y])=>[565+(x+offset[0])*k,233+(y+offset[1])*k]),width:spec.width*k,colour,opacity:1},{image:{rect:100001}}).map(node=>({...node,colour})))};
}
function sourceRect(name,centre,size,colour,image=100001,offset=[0,0]){
 return {name,kind:'image',position:[(centre[0]+offset[0])*.25-75,105-(centre[1]+offset[1])*.25],size:size.map(n=>n*.25),image,colour};
}
export function buildReferenceBanner(rarity,adapter={}){
 const p=stsAngerReference,c=p.contours.banner,parts=p.materialGeometry.bannerPartition;
 return {name:'rarityBanner',kind:'container',position:[0,0],size:[150,210],children:['left','right','front'].map(key=>
  referenceGeometry('banner'+key,parts[key].map(i=>c.points[i]),key==='front'?rarity.banner:rarity.bannerFold,c.offset,adapter))};
}
export function buildReferenceBodyFit(colour){
 const {bounds:[l,t,r,b],radius}=stsAngerReference.materialGeometry.bodyFit,k=stsAngerReference.source.scale;
 return {...nativeRoundedMaterial('bodyFit',(r-l)*k,(b-t)*k,radius*k,colour),position:[(l+r)/2*k-75,105-(t+b)/2*k]};
}
export function buildReferenceFrameFit(colour){
 const g=stsAngerReference.materialGeometry.frameStrokeFit,c=stsAngerReference.contours.frame;
 return {name:'frameStrokeFit',kind:'container',position:[0,0],size:[150,210],children:[
  referenceLines('frameRails',g,colour),...g.joints.map((centre,i)=>sourceRect('railJoint'+i,centre,[20,20],colour,100002,g.offset)),referenceGeometry('framePlaque',g.plaqueIndices.map(i=>c.points[i]),colour,c.offset)]};
}
// Source-space strip data is derived once from the one pinned contour. These
// are opaque native rectangles, not a second triangle renderer or pixel raster.
function horizontalStrips(points,step=4){
 const low=Math.min(...points.map(p=>p[1])),high=Math.max(...points.map(p=>p[1])),strips=[];
 for(let top=low;top<high;top+=step){
  const bottom=Math.min(high,top+step),y=(top+bottom)/2,xs=[];
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]>y)!==(b[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
  xs.sort((a,b)=>a-b);
  for(let i=0;i+1<xs.length;i+=2)strips.push({centre:[(xs[i]+xs[i+1])/2,y],size:[xs[i+1]-xs[i],bottom-top+1]});
 }
 return freeze(strips);
}
const bannerStrips=Object.fromEntries(Object.entries(stsAngerReference.materialGeometry.bannerPartition).map(([key,indices])=>[key,horizontalStrips(indices.map(i=>stsAngerReference.contours.banner.points[i]))]));
export function buildReferenceBannerStrips(rarity){
 const c=stsAngerReference.contours.banner;
 return {name:'rarityBannerStrips',kind:'container',position:[0,0],size:[150,210],children:['left','right','front'].map(key=>({name:key,kind:'container',position:[0,0],size:[150,210],children:bannerStrips[key].map((s,i)=>sourceRect('strip'+i,s.centre,s.size,key==='front'?rarity.banner:rarity.bannerFold,100001,c.offset))}))};
}

const anchor=([x,y])=>[x*.25-75,105-y*.25];
function framePoints(kind){
 if(kind==='attack')return stsAngerReference.contours.frame.points;
 const source=stsTypeFrameReference[kind];
 return source.inner?[...source.points,source.points[0],...source.inner,source.inner[0]]:source.points;
}
function frameGeometry(kind){
 const root=referenceGeometry('frame',framePoints(kind),'#FFFFFF',stsAngerReference.contours.frame.offset),nodes=[];
 const visit=n=>{if(n.kind==='image')nodes.push({position:n.position,size:n.size,rotation:n.rotation??0,scale:n.scale??[1,1]});for(const c of n.children??[])visit(c);};visit(root);
 return nodes;
}
export const stsReferenceRuntimeGeometry=freeze({
 profile:stsAngerReference.id,characterMapping:{traveler:'ironclad'},
 title:{position:anchor(stsAngerReference.anchors.title),size:[122,30]},
 cost:{position:anchor(stsAngerReference.anchors.cost),size:[34,36]},
 type:{position:anchor(stsAngerReference.anchors.type),size:[42,28],backingSize:[42,21]},
 portrait:{position:anchor(stsAngerReference.anchors.portrait),size:[48,48],viewport:[120,82]},
 body:{position:[0,-57.5],size:[120,76]},
 frameProfiles:Object.fromEntries(['attack','skill','power'].map(kind=>[kind,frameGeometry(kind)])),
 typography:{policy:'native minimum retained; source 8/12 are analysis only; full text remains in the existing paged detail view'},
});
function roundedSource(name,bounds,radius,colour){
 const [l,t,r,b]=bounds,k=.25;
 return {...nativeRoundedMaterial(name,(r-l)*k,(b-t)*k,radius*k,colour),position:anchor([(l+r)/2,(t+b)/2])};
}
export function buildReferencePortrait(kind,tokens,artWells){
 const r=tokens.rarity.common,c=stsAngerReference.contours.frame,g=stsAngerReference.materialGeometry;
 const well=artWells?.[kind]??tokens.portrait;
 const common=[sourceRect('plaqueFace',g.plaque.centre,g.plaque.size,r.plaque)];
 if(kind==='attack')return {name:kind,kind:'container',position:[0,0],size:[150,210],children:[
  referenceGeometry('well',[[62,114],[542,114],[544,381],[300,455],[66,384]],well),
  referenceGeometry('frame',c.points,r.frame,c.offset),...common]};
 if(kind==='skill')return {name:kind,kind:'container',position:[0,0],size:[150,210],children:[
  roundedSource('well',[62,60,542,436],20,well),referenceGeometry('frame',stsTypeFrameReference.skill.points,r.frame,c.offset),...common]};
 const power=stsTypeFrameReference.power,ring=[...power.points,power.points[0],...power.inner,power.inner[0]];
 return {name:kind,kind:'container',position:[0,0],size:[150,210],children:[
  sourceRect('well',[303,233],[494,420],well,100002),referenceGeometry('frame',ring,r.frame,c.offset),...common]};
}
export function buildStsSharedCardChrome(theme){
 const tokens=geoCardReferenceTokens(theme),m=tokens.character,r=tokens.rarity.common,g=stsAngerReference.materialGeometry,c=stsAngerReference.contours;
 const body={name:'body',kind:'container',position:[0,0],size:[150,210],children:[
  buildReferenceBodyFit(m.outer),sourceRect('paperWell',[306,439],[510,716],m.body),
  sourceRect('topBevel',[304,44],[486,70],m.shade),sourceRect('leftBevel',[29,420],[40,754],m.shade),
  sourceRect('rightBevel',[574,423],[40,754],m.outer),sourceRect('bottomBevel',[301,816],[520,37],m.outer),
  referenceLines('innerLight',{width:6,paths:[[[45,146],[48,780]],[[563,143],[563,781]],[[54,794],[551,794]]]},m.bevel),
  referenceLines('cornerBevel',{width:7,paths:[[[10,13],[53,57]],[[590,15],[550,58]],[[9,831],[49,793]],[[590,830],[554,794]]]},m.bevel)]};
 const centre=g.costEllipse.centre.map((n,i)=>n+c.cost.offset[i]);
 const cost={name:'costMaterial',kind:'container',position:[0,0],size:[150,210],children:[
  sourceRect('rim',centre,g.costEllipse.radii.map(n=>n*2),tokens.cost.rim,100002),
  sourceRect('field',centre,[116,116],tokens.cost.face,100002),sourceRect('light',centre,[88,88],tokens.cost.light,100002)]};
 const banner=buildReferenceBannerStrips(r);banner.name='banner';
 const geometry=theme.officialAssets.stsCardReference.geometry??stsReferenceRuntimeGeometry,profiles=geometry.frameProfiles;
 const capacity=Math.max(...Object.values(profiles).map(items=>items.length));
 const pool=Array.from({length:capacity},(_,i)=>({name:'part'+(i+1),kind:'image',image:100003,colour:r.frame,
  pivot:[.5,0],fill:{shape:'horizontal',from:'right',amount:.5},visible:i<profiles.attack.length,
  ...(profiles.attack[i]??{position:[0,0],size:[1,1],rotation:0,scale:[1,1]})}));
 const frame={name:'frame',kind:'container',position:[0,0],size:[150,210],children:Array.from({length:Math.ceil(capacity/50)},(_,i)=>({name:'batch'+i,kind:'container',position:[0,0],size:[150,210],children:pool.slice(i*50,(i+1)*50)}))};
 // Native CJK minimum 14px uses a 38px content-width/16.8px line budget.
 // Keep the measured source plaque unchanged; this light backing is the
 // explicit native readability adaptation, with about 2px inset per side.
 const plaque={...sourceRect('plaqueFace',g.plaque.centre,g.plaque.size,r.plaque),
  position:[...geometry.type.position],size:[...geometry.type.backingSize]};
 return {name:'stsReferenceChrome',kind:'container',position:[0,0],size:[150,210],children:[body,
  {name:'portraits',kind:'container',position:[0,0],size:[150,210],children:['attack','skill','power'].map(kind=>{
   const well=buildReferencePortrait(kind,tokens,theme.cardSkin.artWells);well.children=well.children.filter(n=>n.name==='well');return {...well,visible:kind==='attack'};
  })},frame,plaque,banner,cost]};
}
// The installer keeps semantic top-level controls and removes obsolete hidden
// decoration payloads. Runtime writers dispatch on the one new root.
export function installStsReferenceCardChrome(face,theme){
 const find=name=>face.children.find(n=>n.name===name),geometry=theme.officialAssets.stsCardReference.geometry??stsReferenceRuntimeGeometry;
 if(find('stsReferenceChrome'))throw Error('Shared StS card chrome already installed');
 const removed=['roundShadow','roundFrame','roundBody','skin','roleMark','tagEdge','tagBody','nativeCardBody','nativeRibbon','nativeCostOrb','v25NodeCardChrome'];
 for(const name of removed){const node=find(name);if(node){node.visible=false;node.children=[];}}
 const oldBody=find('nativeCardBody');if(oldBody)oldBody.children=[{name:'outerBevel',kind:'container',position:[0,0],size:[150,210],children:[]}];
 for(const name of ['nameBand','nameRule','roleRing','nativeBannerRight','artPlate','artWell','costCore','costDisc','typeEdge','typeTag'])if(find(name))find(name).visible=false;
 const root=buildStsSharedCardChrome(theme),back={name:'stsReferenceBack',kind:'container',position:[0,0],size:[150,210],children:root.children.filter(n=>n.name==='body'||n.name==='portraits')};
 root.children=root.children.filter(n=>n.name!=='body'&&n.name!=='portraits');
 const artNode=n=>n.name==='art'||n.name.startsWith('art_')||n.name==='artSamples';
 const textNames=new Set(['name','type','cost','label','description','costDirection']);
 const arts=face.children.filter(artNode),texts=face.children.filter(n=>textNames.has(n.name));
 face.children=face.children.filter(n=>!artNode(n)&&!textNames.has(n.name));
 const overlay=face.children.findIndex(n=>n.name==='blockedVeil');
 face.children.splice(overlay<0?face.children.length:overlay,0,back,...arts,root,...texts);
 const tokens=geoCardReferenceTokens(theme),font=Math.max(14,theme.font.minimum);
 for(const [name,spec,key]of [['name',geometry.title,'title'],['cost',geometry.cost,'cost'],['type',geometry.type,'type'],['label',geometry.body,'body'],['description',geometry.body,'body']]){
  const node=find(name);if(!node)continue;node.position=[...spec.position];node.size=[...spec.size];
  const size=Math.max(font,tokens.typography[key]);Object.assign(node.text,{fontSize:size,minFontSize:size,autoSize:false,align:'centre',valign:'middle'});
  if(name==='type')Object.assign(node.text,{colour:tokens.text.type,outline:false});
  if(name==='label'||name==='description')node.text.colour=tokens.text.body;
 }
 for(const node of face.children)if(node.name==='art'||node.name.startsWith('art_')){node.position=[...geometry.portrait.position];node.size=[...geometry.portrait.size];}
 const samples=find('artSamples');
 if(samples){
  // Native slots retain their authored source coordinates. Fit the holder
  // uniformly; stretching its children would distort the project artwork.
  const fit=Math.min(geometry.portrait.viewport[0]/samples.size[0],geometry.portrait.viewport[1]/samples.size[1]);
  samples.position=[...geometry.portrait.position];samples.scale=[fit,fit];
 }
 for(const name of ['costHalo','costDisc','costCore'])if(find(name))find(name).position=[...geometry.cost.position];
 if(find('costDirection'))find('costDirection').position=[geometry.cost.position[0]+12,geometry.cost.position[1]-12];
 return {profile:stsAngerReference.id,root,back,images:referencePrimitiveCount(root)+referencePrimitiveCount(back),geometry};
}
export function buildStsAngerReferencePrototype({tokens,title='破防斩',body='造成 8 点伤害。\n施加 2 层易伤。',cost='2',artImage=102012}={}){
 if(!tokens?.character||!tokens.rarity?.common)throw Error('Reference study requires explicit shared tokens');
 const p=stsAngerReference,c=p.contours,m=tokens.character,r=tokens.rarity.common,g=p.materialGeometry;
 const costCentre=g.costEllipse.centre.map((n,i)=>n+c.cost.offset[i]);
 const shapes=[referenceGeometry('bodyOutline',c.body.points,m.outer),
  referenceGeometry('innerWell',[[51,81],[550,81],[561,781],[551,797],[54,797]],m.body),
  referenceGeometry('topBevel',[[16,7],[72,4],[541,5],[594,12],[549,81],[84,81]],m.bevel),
  referenceGeometry('leftBevel',[[6,9],[84,81],[51,81],[51,792],[6,835]],m.bevel),
  referenceGeometry('rightBevel',[[594,12],[550,81],[561,781],[595,834]],m.shade),
  referenceGeometry('bottomBevel',[[6,835],[54,797],[551,797],[595,834],[527,839]],m.shade),
  referenceGeometry('portraitWell',[[63,114],[542,114],[544,381],[366,439],[354,430],[255,430],[244,438],[236,438],[66,384]],tokens.portrait),
  {name:'portrait',kind:'image',position:[0,105-p.anchors.portrait[1]*.25],size:[48,48],image:artImage,colour:tokens.portraitInk},
  referenceGeometry('artFrame',c.frame.points,r.frame,c.frame.offset),
  referenceLines('frameShadow',g.frameShadow,r.frameShadow),
  referenceLines('frameSeam',g.frameSeam,r.frameSeam),
  referenceLines('frameHighlight',g.frameHighlight,r.frameHighlight),
  sourceRect('typePlaqueFace',g.plaque.centre,g.plaque.size,r.plaque),
  referenceLines('typePlaqueLight',{width:2,points:[[266,g.plaque.topY],[340,g.plaque.topY]]},r.plaqueHighlight),
  referenceLines('typePlaqueShade',{width:2,points:[[266,g.plaque.bottomY],[340,g.plaque.bottomY]]},r.frame),
  buildReferenceBanner(r),
  referenceLines('bannerLight',g.bannerHighlight,r.bannerHighlight,c.banner.offset),
  sourceRect('costOutline',costCentre,g.costEllipse.radii.map(n=>n*2),tokens.cost.rim,100002),
  sourceRect('costOuterLight',costCentre,[116,116],tokens.cost.face,100002),
  sourceRect('costInnerSeam',costCentre,[98,98],tokens.cost.rim,100002),
  sourceRect('costLens',costCentre,[88,88],tokens.cost.face,100002),
  sourceRect('costCoreLight',costCentre,[58,58],tokens.cost.light,100002),
  sourceRect('costHighlight',[costCentre[0]-8,costCentre[1]-19],[27,12],tokens.cost.light,100002),
  referenceText('name',title,p.anchors.title,[122,30],tokens.typography.title,r.ink),
  referenceText('cost',cost,p.anchors.cost,[30,34],tokens.typography.cost,tokens.cost.ink),
  referenceText('type','攻击',p.anchors.type,[30,18],tokens.typography.type,tokens.text.type),
  referenceText('description',body,p.anchors.body,[120,70],tokens.typography.body,tokens.text.body)];
 for(const shape of shapes)if(shape.text)shape.text.outlineColour=tokens.text.outline;
 return {name:'StsAngerReferencePrototype',kind:'container',position:[0,0],size:[150,210],children:shapes};
}
export function referencePrimitiveCount(root){return parts(root).reduce((count,node)=>count+(node.kind==='image'?1:0)+referencePrimitiveCount(node),0);}
