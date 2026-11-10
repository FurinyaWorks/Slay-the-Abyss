// Independently authored native geometry from the frozen V25 room composition.
// No private raster, SVG path, sample transactions or random data is embedded.
export const v25NodeSource=Object.freeze({
 record:'genshin-rooms.js renderRoom: shop/camp/event/rewards; genshin-rooms.css .gr-*',
 scriptSha256:'5169706502ca4c958999b48417c5d463ef732bcdf5e1aa50a840e4b1c9e21452',
 stylesSha256:'abf9e5188e076062646153358bbfa16b498adf0e08b90d92a0fb1b5801760100',
 differences:'Camp portrait is not available through this static transformer. Paper grain, serif font, fire curves/glow and alpha ramps require official comparison. The treasure page has no recovered V25 screenshot; its authored chest uses the shared room materials. Four full event options, merchant dialogue and paged pickers retain real gameplay beyond the three-option reference sample. No visual or performance parity is claimed.',
});

// Merge this patch into the V25 theme BEFORE generating layouts and abyss_theme.
// Runtime writers use these real fields; changing only the JSON would snap back.
export const v25NodeThemePatch=Object.freeze({layout:{
 nativeNode:{backdrop:[0,0,1280,720],back:[-552,-235,186,52],confirm:[-552,-235,186,52],notice:[0,-300,880,96],
  topBar:{title:[116,338,220,40],hpIcon:[-465,338,18,18],hp:[-425,338,70,40],goldIcon:[-369,338,13,13],gold:[-342,338,56,40]},
  shop:{referenceBareGoods:true,columns:[-373,-179,15,209,403,-373,-185],cardRows:[121,121,121,121,121,-159,-159],priceRows:[-6,-6,-6,-6,-6,-286,-286],
   removal:[407,-173,147,208],removalPriceY:-300,relics:{columns:[-3,99,201],y:-104,size:[92,66],disc:44,priceY:-145},
   potions:{columns:[-3,99,201],y:-257,size:[92,56],priceY:-303},
   confirm:[510,-320,180,52],cancel:[300,-320,180,52],detail:[60,-260,420,100]},
  camp:{tiles:[[-105,111],[111,111]],tileSize:[150,210],icon:[0,8,76,76],name:[0,-70,160,44],description:[0,-132,210,72],medallion:[0,224,1,1]},
  event:{plate:[0,-55,1230,490],art:[-372,-50,155,155],caption:[-372,-235,360,32],name:[-280,203,620,60],body:[225,58,700,180],
   options:{x:225,rows:[-88,-143,-198,-253],size:[700,44],title:[0,0,650,36],description:[0,0,650,36]},
   neow:{bubbleText:[190,135,230,72]}},
 },
 merchant:{frame:[0,273,680,66],box:[0,273,676,62],portrait:[-300,273,54,54],name:[-15,288,500,28],line:[25,259,560,32],next:[320,251,14,14]},
 rewardPick:{stage:[0,0,1280,720],title:[0,180,550,70],subtitle:[0,130,760,40],y:-50,step:270,scale:1.133333333333,hoverScale:1.18,hoverLift:6,skip:[0,-235,186,44]},
}});

const parts=n=>n.controls??n.children??[];
const must=(n,name)=>{const a=parts(n).filter(c=>c.name===name);if(a.length!==1)throw Error('V25 nodes require '+name);return a[0];};
const group=(name,items,position=[0,0],size=[1280,720])=>({name,kind:'container',position:[...position],size:[...size],children:items});
const image=(name,x,y,w,h,id,colour,extra={})=>({name,kind:'image',position:[x,y],size:[w,h],image:id,colour,...extra});
const rect=(name,x,y,w,h,colour,extra={})=>image(name,x,y,w,h,100001,colour,extra);
const text=(name,x,y,w,h,content,fontSize,colour)=>({name,kind:'text',position:[x,y],size:[w,h],
 text:{content,fontSize,minFontSize:fontSize,colour,outline:true,outlineColour:'#171311',outlineOpacity:.4,align:'centre',valign:'middle'}});
const fade=(name,x,y,w,h,colour,extra={})=>image(name,x,y,w,h,106095,colour,extra);
const setRect=(n,v)=>{n.position=v.slice(0,2);n.size=v.slice(2);};
const type=(n,size,colour,extra={})=>{n.size[1]=Math.max(n.size[1],size*2);Object.assign(n.text,{fontSize:size,minFontSize:size,colour,...extra});};
const local=([x,y])=>[x-640,360-y];
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);

// Ear clipping of a small authored silhouette. Each triangle uses the observed
// 100003 upward isosceles, half-filled to a right triangle; not a guessed atlas ID.
function polygon(name,points,colour){
 const area=points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p[0]*q[1]-p[1]*q[0];},0),indices=Array.from(points.keys()),triangles=[];
 if(area<0)indices.reverse();
 while(indices.length>3){
  let found=false;
  for(let i=0;i<indices.length;i++){
   const ids=[indices[(i+indices.length-1)%indices.length],indices[i],indices[(i+1)%indices.length]],v=ids.map(n=>points[n]);
   if(cross(...v)<=1e-8||indices.some(n=>!ids.includes(n)&&cross(v[0],v[1],points[n])>=0&&cross(v[1],v[2],points[n])>=0&&cross(v[2],v[0],points[n])>=0))continue;
   triangles.push(v);indices.splice(i,1);found=true;break;
  }
  if(!found)throw Error('Invalid V25 room silhouette');
 }
 triangles.push(indices.map(n=>points[n]));const out=[];
 for(const vertices of triangles){
  const edge=vertices.map((a,i)=>({i,d:Math.hypot(a[0]-vertices[(i+1)%3][0],a[1]-vertices[(i+1)%3][1])})).sort((a,b)=>b.d-a.d)[0].i;
  const [b,c,a]=[vertices[edge],vertices[(edge+1)%3],vertices[(edge+2)%3]].map(local),dx=c[0]-b[0],dy=c[1]-b[1];
  const t=((a[0]-b[0])*dx+(a[1]-b[1])*dy)/(dx*dx+dy*dy),foot=[b[0]+t*dx,b[1]+t*dy],h=Math.hypot(a[0]-foot[0],a[1]-foot[1]);
  for(const end of [b,c]){const ux=end[0]-foot[0],uy=end[1]-foot[1],w=Math.hypot(ux,uy);if(w<1e-7||h<1e-7)continue;
   out.push(image('triangle'+out.length,...foot,w*2,h,100003,colour,{pivot:[.5,0],rotation:Math.atan2(uy,ux)*180/Math.PI,
    scale:[1,Math.sign(ux*(a[1]-foot[1])-uy*(a[0]-foot[0]))],fill:{shape:'horizontal',from:'right',amount:.5}}));}
 }
 return group(name,out.length<=60?out:Array.from({length:Math.ceil(out.length/50)},(_,i)=>group('part'+i,out.slice(i*50,(i+1)*50))));
}

function rounded(name,w,h,r,colour){return group(name,[rect('vertical',0,0,w-r*2,h,colour),rect('horizontal',0,0,w,h-r*2,colour),
 ...[-1,1].flatMap(x=>[-1,1].map(y=>image('corner'+x+'_'+y,x*(w/2-r),y*(h/2-r),r*2,r*2,100002,colour)))],[0,0],[w,h]);}

// Independently traced room silhouettes, sampled as bounded native triangles.
// These quadratic curves preserve the reference's smooth fire lobes, rather
// than connecting its extrema into sharp straight-sided flames.
function curvedPolygon(name,start,segments,colour){
 const points=[start];let previous=start;
 for(const[cx,cy,x,y]of segments){
  for(let i=1;i<=5;i++){const t=i/5,u=1-t;points.push([u*u*previous[0]+2*u*t*cx+t*t*x,u*u*previous[1]+2*u*t*cy+t*t*y]);}
  previous=[x,y];
 }
 if(Math.hypot(points.at(-1)[0]-start[0],points.at(-1)[1]-start[1])<1e-6)points.pop();
 return polygon(name,points,colour);
}

function shopCloth(){return group('v25ShopCloth',[
 rect('shadow',0,-7,1128,660,'#2E392F'),rounded('hem',1128,660,12,'#8D9D7D'),
 rect('cloth',0,3,1116,654,'#52644A'),fade('clothLight',0,3,1116,654,'#69805C',{rotation:180,opacity:.12}),
 rect('leftHem',-560,0,5,660,'#8D9D7D'),rect('rightHem',560,0,5,660,'#8D9D7D'),
 rect('lowerHem',0,-327,1100,5,'#7F9073'),
 ],[0,-18]);}

function campScene(theme){
 const logs=group('logs',[-18,18,-65,65].map((rotation,i)=>{const n=rounded('log'+i,350,42,20,'#271A13');n.position=[350,-326-i*4];n.rotation=rotation;
  n.children.push(rect('grain',0,0,310,11,'#754734'));return n;}));
 return group('v25CampScene',[
  rect('night',0,-22,1280,676,'#211816'),fade('nightDepth',0,90,1280,452,'#100F0F',{opacity:.5}),
  rect('ground',0,-260,1280,200,'#39352A'),fade('groundShade',0,-240,1280,240,'#181413',{rotation:180}),
  image('dialogueHaze',0,90,720,340,theme.image.glowWide,'#D1CABE',{opacity:.68}),
  image('fireLight',365,-175,650,610,theme.image.glowWide,'#DA9B30',{opacity:.23}),
  image('fireShadow',343,-345,470,65,100002,'#090908'),logs,
  curvedPolygon('fireOuter',[822,645],[[780,587,818,501],[839,455,835,375],[899,436,921,529],[962,415,972,270],
   [1045,345,1044,502],[1044,548,1064,555],[1106,458,1132,321],[1122,392,1160,488],[1208,576,1168,637],
   [1140,682,1018,682],[884,685,841,659],[829,653,822,645]],'#C77939'),
  curvedPolygon('fireInner',[867,631],[[842,586,860,541],[884,507,875,469],[913,515,928,572],[941,612,941,588],
   [943,523,990,448],[1022,404,999,359],[1054,410,1047,470],[1038,536,1066,588],[1095,519,1103,441],
   [1174,536,1158,598],[1146,664,995,670],[909,665,867,631]],'#E8BC52'),
  curvedPolygon('fireCore',[943,646],[[932,620,941,581],[968,533,973,493],[1020,531,1019,594],
   [1025,632,1039,647],[987,650,943,646]],'#F6E6A3'),
 ]);
}

const palette={normal:'#25484C',hover:'#427D81',pressed:'#183B40',disabled:'#152B2D',selected:'#345D60'};
function framedSkin(box,kind='teal'){
 const [w,h]=box.size,border=must(box,'border');border.size=[w,h];border.colour=kind==='flag'?'#B59C52':'#406166';
 // Runtime keeps tinting these original Image objects. A static bevel plus
 // distinct continuous state ramps preserve that writer without illegal children.
 for(const state of ['normal','hover','pressed','disabled','selected']){
  const n=must(box,state);n.image=106095;n.colour=kind==='flag'?({normal:'#813633',hover:'#A0524C',pressed:'#5C2828',disabled:'#483332',selected:'#9A5445'})[state]:palette[state];
  n.opacity=1;n.size=[w-4,h-4];
 }
 const chrome=group('v25StateChrome',[
  rect('topStitch',0,h/2-2,w-8,2,kind==='flag'?'#B59C52':'#6D9695',{opacity:.75}),
  rect('lowerRim',0,-h/2+2,w-8,2,kind==='flag'?'#806A35':'#182E30'),
  image('faceDepth',0,0,w-6,h-6,106095,kind==='flag'?'#552624':'#173539',{opacity:.2}),
 ],[0,0],[w,h]);
 box.children.splice(1,0,rect('v25BaseMaterial',0,0,w-4,h-4,kind==='flag'?'#813633':'#25484C'));
 box.children.splice(7,0,chrome);if(parts(box).some(n=>n.name==='label'))type(must(box,'label'),kind==='flag'?25:22,'#F4DE8E');
}

function styleShop(panel,theme){
 panel.children.unshift(shopCloth());
 const l=theme.layout.nativeNode.shop;
 for(let i=1;i<=7;i++){
  const card=must(panel,'card'+i);card.position=[l.columns[i-1],l.cardRows[i-1]];
  const price=must(panel,'price'+i);price.position=[l.columns[i-1],l.priceRows[i-1]];
  type(must(price,'value'),19,'#F2EEE2');must(price,'coin').size=[13,13];
 }
 for(const category of ['relic','potion'])for(let i=1;i<=3;i++){
  const n=must(panel,category+i),entry=category==='relic'?l.relics:l.potions;setRect(n,[entry.columns[i-1],entry.y,...entry.size]);must(n,'hit').size=[...n.size];
  n.children.push(group('v25BareGoods',[],[0,0],[1,1]),image('v25GoodsFocus',0,8,74,74,theme.image.glowWide,'#D4BD83',{visible:false,opacity:.35}));
  must(n,'border').visible=false;must(n,'icon').position=[0,8];must(n,'icon').size=[42,48];must(n,'icon').colour='#D5DDD0';
  if(category==='relic')must(n,'disc').visible=false;
  const name=must(n,'name');name.visible=false;
  for(const state of ['normal','hover','pressed','disabled','selected'])must(n,state).visible=false;
  const price=must(panel,category+'Price'+i);price.position=[entry.columns[i-1],entry.priceY];type(must(price,'value'),17,'#F2EEE2');must(price,'coin').size=[10,10];
 }
 const removal=must(panel,'removal');setRect(removal,l.removal);must(removal,'hit').size=l.removal.slice(2);framedSkin(removal);
 for(const state of ['normal','hover','pressed','disabled','selected'])must(removal,state).colour=({normal:'#68656C',hover:'#827C86',pressed:'#4B4851',disabled:'#403F42',selected:'#817277'})[state];
 must(removal,'v25BaseMaterial').colour='#68656C';
 must(removal,'v25BaseMaterial').size=[133,194];
 for(const state of ['normal','hover','pressed','disabled','selected'])must(removal,state).size=[133,194];
 removal.children.push(image('deckMark',0,-44,76,92,theme.icon.deck.id??theme.icon.deck,'#CBB16A',{opacity:.8}));
 setRect(must(removal,'name'),[0,64,128,74]);type(must(removal,'name'),19,'#EED689');must(removal,'icon').visible=false;
 setRect(must(removal,'description'),[0,13,135,32]);type(must(removal,'description'),14,'#EEE1C5');must(removal,'description').visible=false;
 setRect(must(panel,'removalPrice'),[l.removal[0],l.removalPriceY,100,40]);
}

function styleCamp(panel,theme){
 panel.children.unshift(campScene(theme),text('v25CampTitle',4,224,600,62,'嗯……',31,'#EEEADD'));must(panel,'medallion').visible=false;
 for(const [i,name]of ['rest','forge'].entries()){
  const n=must(panel,name);setRect(n,[...theme.layout.nativeNode.camp.tiles[i],150,210]);must(n,'hit').size=[150,210];
  const colour=i?'#9A6268':'#4F8C4C',rotation=i?-1:2;must(n,'border').size=[150,105];must(n,'border').position=[0,8];must(n,'border').rotation=rotation;
  n.children.unshift(rect('v25TileShadow',4,4,150,105,'#4B463D',{rotation,opacity:.5}));
  for(const state of ['normal','hover','pressed','disabled','selected']){const p=must(n,state);setRect(p,[0,8,138,93]);p.rotation=rotation;p.image=100001;p.colour=state==='disabled'?'#3B4038':state==='hover'?'#9FB97D':state==='pressed'?'#425842':colour;}
  const icon=must(n,'icon');setRect(icon,[0,8,76,76]);icon.image=102012;icon.colour='#F3EFE3';icon.visible=i===1;
  if(i===0)n.children.push(text('v25Breath',0,8,144,88,'呼……',44,'#F4E972'));
  setRect(must(n,'name'),[0,-70,160,48]);type(must(n,'name'),24,'#EFD377');
  setRect(must(n,'description'),[i?-107:109,-135,600,72]);type(must(n,'description'),19,'#F0ECDB');
 }
 const result=must(panel,'result');must(result,'border').opacity=0;must(result,'panel').opacity=0;
 setRect(must(result,'name'),[0,224,600,62]);type(must(result,'name'),31,'#EEEADD');
 setRect(must(result,'description'),[0,90,600,120]);type(must(result,'description'),26,'#F0ECDB');
}

function styleEvent(panel,theme){
 // plateBorder is visibility-only in the real event writer, including Neow.
 // Keep its identity and path, adding children only after making it a container.
 const border=must(panel,'plateBorder');border.kind='container';border.position=[0,0];border.size=[1280,720];delete border.image;delete border.colour;
 border.children=[group('v25EventParchment',[
  rect('field',0,-22,1280,676,'#2E3B38'),rect('storyPanel',...theme.layout.nativeNode.event.plate,'#020504'),
  image('panelShadow',0,-55,1260,522,theme.image.glowWide,'#000000'),
  polygon('ribbon',[[14,145],[49,132],[219,129],[558,130],[678,139],[704,152],[676,163],[697,173],[626,177],[138,176],[42,186]],'#A3967E'),
  rect('storyWell',-372,-50,410,410,'#121B18'),
  rect('ribbonTopLight',-285,228,525,1,'#C6BA9F',{opacity:.35}),
 ])];
 const plate=must(panel,'plate');setRect(plate,theme.layout.nativeNode.event.plate);plate.colour='#020504';
 // Put the well/ribbon after the black field while preserving all original paths.
 const at=panel.children.indexOf(border);panel.children.splice(at,1);panel.children.splice(panel.children.indexOf(plate)+1,0,border);
 must(panel,'glow').opacity=0;must(panel,'caption').text.opacity=0;const art=must(panel,'art');setRect(art,theme.layout.nativeNode.event.art);art.opacity=.25;
 const name=must(panel,'name');setRect(name,theme.layout.nativeNode.event.name);type(name,27,'#F0CF60');
 setRect(must(panel,'body'),theme.layout.nativeNode.event.body);type(must(panel,'body'),21,'#EDEEDF',{align:'left',valign:'top'});
 const o=theme.layout.nativeNode.event.options;
 for(let i=1;i<=4;i++){const n=must(panel,'option'+i);setRect(n,[o.x,o.rows[i-1],...o.size]);must(n,'hit').size=[...o.size];framedSkin(n);
  // Anchored corner covers follow the original Neow/ordinary option resizing.
  // All colours/states still come from the original Image feedback targets.
  for(const side of [0,1])for(const top of [0,1])n.children.splice(7,0,image('v25Corner'+side+'_'+top,0,0,42,22,100003,'#020504',{
   pivot:[.5,0],anchor:{min:[side,top],max:[side,top]},scale:[side?-1:1,top?-1:1],fill:{shape:'horizontal',from:'right',amount:.5}}));
  must(n,'border').opacity=1;must(n,'border').colour='#406166';
  for(const state of ['normal','hover','pressed','disabled','selected']){must(n,state).image=100001;must(n,state).size=[696,40];}
  must(n,'v25StateChrome').children.find(c=>c.name==='lowerRim').opacity=0;
  must(n,'v25StateChrome').children.find(c=>c.name==='faceDepth').opacity=0;
  setRect(must(n,'title'),o.title);type(must(n,'title'),18,'#EDEEDF',{align:'left'});setRect(must(n,'description'),o.description);type(must(n,'description'),18,'#EDEEDF',{align:'left'});}
}

function styleTreasure(panel,theme){
 panel.children.unshift(group('v25TreasureField',[rect('dark',0,-22,1280,676,'#070B0B'),
  image('warmth',-350,40,560,460,theme.image.glowWide,'#8D7B45',{opacity:.15}),
  fade('lowerShade',0,-240,1280,240,'#000000',{opacity:.3}),
  rect('lowerRule',0,-345,1180,1,'#252C29',{opacity:.2}),
  image('backGlow',0,140,900,300,theme.image.glowWide,'#485B50',{opacity:.12})]));
 // The original closed/open owners are driven by the real shake/pop timeline.
 // Both are visibility/transform-only (no SetImage/imageColor writer), so native
 // containers preserve their identities while carrying distinct vector poses.
 for(const state of ['closed','open']){
  const n=must(panel,state),opened=state==='open';n.kind='container';delete n.image;delete n.colour;
  n.children=[group('v25ChestGeometry',[
   rect('shadow',0,-58,188,12,'#000000',{opacity:.5}),rect('body',0,-8,176,92,'#543B26'),
   rect('bodyLight',0,3,164,65,'#775336'),fade('bodyDepth',0,-8,168,84,'#352A21'),
   Object.assign(rounded('lid',184,58,15,'#8F6940'),{position:[0,opened?83:42],rotation:opened?-12:0}),
   image('interior',0,27,162,35,100002,'#1E1B17',{visible:opened}),
   rect('lidEdge',0,22,182,7,'#C6A46A'),rect('leftBand',-61,-7,12,92,'#B5985A'),rect('rightBand',61,-7,12,92,'#B5985A'),
   rect('lock',0,12,25,32,'#D2B66C'),image('keyhole',0,12,6,10,100002,'#302B23'),
  ])];
 }
 for(const n of parts(panel))if(parts(n).some(c=>c.name==='normal'))framedSkin(n);
}

function styleMerchant(panel,theme){
 const m=theme.layout.merchant,relative=v=>[v[0]-m.frame[0],v[1]-m.frame[1],...v.slice(2)];setRect(panel,m.frame);
 setRect(must(panel,'panel'),relative(m.box));setRect(must(panel,'border'),relative([m.box[0],m.box[1],m.box[2]+4,m.box[3]+4]));
 const portrait=must(panel,'portrait'),ratio=m.portrait[2]/portrait.size[0];setRect(portrait,relative(m.portrait));portrait.scale=[ratio,ratio];
 for(const name of ['namePlate','name'])setRect(must(panel,name),relative(m.name));
 type(must(panel,'name'),14,'#E5DBBC');setRect(must(panel,'line'),relative(m.line));type(must(panel,'line'),16,'#EFE8D6');
 setRect(must(panel,'next'),relative(m.next));const talk=must(panel,'talk');setRect(talk,relative(m.box));must(talk,'hit').size=m.box.slice(2);
 setRect(must(panel,'accent'),[m.box[0]-m.frame[0],m.box[1]-m.frame[1]+m.box[3]/2-2,m.box[2]-8,2]);
}

function stylePreset(button){
 const [w,h]=button.size;
 for(const state of parts(button)){
  const border=must(state,'border'),plate=must(state,'plate');border.visible=false;plate.visible=false;
  const colour=({normal:'#37777A',hover:'#499397',pressed:'#255458',disabled:'#263F40'})[state.name];
  state.children.splice(2,0,group('v25StateChrome',[image('rim',0,0,w,h,100002,'#C8B35E'),
   image('face',0,0,w-6,h-6,100002,colour),image('topLight',0,4,w-15,h*.65,106057,'#7BA8A2',{opacity:.25})],[0,0],[w,h]));
  const label=must(state,'label');label.size=[w-10,h-4];type(label,24,'#F3ECDA');
 }
}

function nodeCardChrome(face,theme){
 const reference=theme.layout.nativeNode.cardReference;
 if(!reference)return;
 if(parts(face).some(n=>n.name==='skin')&&parts(face).some(n=>n.name==='art_attack')){
  const ribbon=group('ribbon',[]),cost=must(face,'costCore').position;
  for(let i=0;i<8;i++){
   const x=(i-3.5)*159/8,y=86-10*(x/79.5)**2,rotation=Math.atan(-20*x/(79.5**2))*180/Math.PI;
   ribbon.children.push(rect('rim'+i,x,y,159/8+.8,22,reference.ribbonEdge,{rotation}),
    rect('face'+i,x,y+.4,159/8+.8,19,reference.rarities.basic,{rotation}));
  }
  ribbon.children.sort((a,b)=>Number(a.name.startsWith('face'))-Number(b.name.startsWith('face')));
  for(const side of [-1,1])ribbon.children.unshift(image('fold'+side,side*73,68,19,16,100003,reference.ribbonEdge,{rotation:side*105}));
  const chrome=group('v25NodeCardChrome',[
   image('paper',0,0,150,208,reference.paperImage,reference.paperInk),
   rounded('body',136,196,5,reference.bodyInk),ribbon,
   image('costOrb',...cost,32,32,reference.costImage,reference.costOrbInk),
  ],[0,0],[150,210]);
  face.children.splice(face.children.indexOf(must(face,'roundBody'))+1,0,chrome);
  return;
 }
 for(const child of parts(face))nodeCardChrome(child,theme);
}

function styleRewards(battle,theme){
 const stage=must(battle,'rewardStage'),r=theme.layout.rewardPick;setRect(stage,r.stage);
 must(stage,'border').opacity=0;must(stage,'plate').opacity=0;
 stage.children.unshift(group('v25RewardField',[rect('dark',0,-22,1280,676,'#070B0B')]));
 stage.children.splice(3,0,group('v25RewardPaper',[polygon('banner',[[365,170],[409,164],[425,153],[563,151],[859,153],[877,165],[915,171],[893,205],[855,202],[849,211],[431,211],[420,202],[387,205]],'#A79E80'),
  fade('paperLight',0,180,450,55,'#D0C8AA',{rotation:180,opacity:.14})]));
 setRect(must(stage,'title'),r.title);type(must(stage,'title'),29,'#EFE8D4');
 setRect(must(stage,'subtitle'),r.subtitle);type(must(stage,'subtitle'),16,'#D6D5C5');
 const skip=must(battle,'skip');setRect(skip,r.skip);for(const state of parts(skip))state.size=r.skip.slice(2);stylePreset(skip);
}

function preflight(root){
 for(const name of ['backdrop','headerShade','headerDivider','titleLineLeft','titleLineRight','title','hpIcon','hp','goldIcon','gold','shopView','campView','pickerView','eventView','treasureView','merchant','back','confirm','notice'])must(root,name);
 const visit=n=>{if(parts(n).some(c=>c.name==='normal'))for(const name of ['border','normal','hover','pressed','disabled','selected','hit'])must(n,name);for(const c of parts(n))visit(c);};visit(root);
 for(let i=1;i<=4;i++)must(must(root,'eventView'),'option'+i);
}

function rewardPreflight(battle){
 const stage=must(battle,'rewardStage');if(parts(stage).some(n=>n.name==='v25RewardField'))throw Error('V25 reward layout already applied');
 for(const name of ['border','plate','title','subtitle'])must(stage,name);
 for(const name of ['rewardList','skip'])must(battle,name);
 const skip=must(battle,'skip');for(const name of ['normal','hover','pressed','disabled'])must(skip,name);
 for(const state of parts(skip))for(const name of ['border','plate','label'])must(state,name);
}

export function applyV25NodeLayout(layout,theme){
 const stage=parts(layout).find(n=>n.name==='stage'),host=stage??layout;
 const root=parts(host).find(n=>n.name==='nodePanel');if(!root)throw Error('V25 nodes require nodePanel');
 if(parts(root).some(n=>n.name==='v25NodeBackdrop'))throw Error('V25 node layout already applied');preflight(root);
 const battle=parts(host).find(n=>n.name==='battlePanel');
 if(battle)rewardPreflight(battle);
 root.children.unshift(group('v25NodeBackdrop',[rect('dark',0,0,1280,720,'#080C0C'),rect('top',0,338,1280,44,'#44464F'),fade('topShade',0,338,1280,44,'#2C3038')]));
 root.children.push(text('v25Identity',-552,338,128,36,'',16,'#E4DDD0'));
 for(const name of ['backdrop','headerShade','headerDivider','titleLineLeft','titleLineRight'])must(root,name).visible=false;
 for(const name of ['title','hpIcon','hp','goldIcon','gold'])setRect(must(root,name),theme.layout.nativeNode.topBar[name]);
 type(must(root,'title'),14,'#E4DDD0');type(must(root,'hp'),20,'#EE7275');type(must(root,'gold'),20,'#F0C65E');
 setRect(must(root,'notice'),theme.layout.nativeNode.notice);type(must(root,'notice'),16,'#DDD6C3');styleMerchant(must(root,'merchant'),theme);
 styleShop(must(root,'shopView'),theme);styleCamp(must(root,'campView'),theme);styleEvent(must(root,'eventView'),theme);styleTreasure(must(root,'treasureView'),theme);
 nodeCardChrome(root,theme);
 for(const name of ['back','confirm']){const n=must(root,name);setRect(n,theme.layout.nativeNode[name]);must(n,'hit').size=[...n.size];framedSkin(n,'flag');}
 if(battle)styleRewards(battle,theme);return layout;
}

export function applyV25RewardLayout(layout,theme){
 const stage=parts(layout).find(n=>n.name==='stage'),host=stage??layout;
 const battle=parts(host).find(n=>n.name==='battlePanel')??host;
 rewardPreflight(battle);styleRewards(battle,theme);return layout;
}
