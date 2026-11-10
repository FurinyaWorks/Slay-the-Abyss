// Independent geometric reconstruction of the authorized V25 scene. No private
// SVG/texture/code bytes are included. Canonical design geometry stays separate
// from the native material adapter so a platform round-trip can correct it.
export const v25SceneSource=Object.freeze({
 sha256:'b81d1dbf57874df0efdf68bff2894b256bda954fc8e2f235a657085f518a1ec7',record:'battle.js:72 scene(false)',
 imageSheetSha256:'08d22be8fe422e740b4e05f098ac7dfcb7b63352a8e6335498a44ecae17d8412',
 plateSheetSha256:'dc4fb4dc149a65e57831920cfdd40e7159a6a54c488facca18127e16c1a0cd7b',
 gradientSheetSha256:'666cea6d6e8c50d7127afb788422dbf69e6aa78512c0b36439d2acfa382dd674',
 triangle:'100003 is upward isosceles in the local official image_catalog photograph; right-half mask, pivot and seams still require current-candidate platform validation',
 differences:'12-segment curves, native fade106095/glow106057/vignette106059, a flat curved floor cap through y451, opaque sky-preblended polygons with 0.45px edge bleed approximate the SVG; official atlas alpha, visual parity and device performance are unverified',
});
const children=node=>node.controls??node.children??[];
const polygon=(name,points,colour,opacity=1)=>({name,type:'polygon',points,colour,opacity});
const rect=(name,x,y,w,h,colour,opacity=1)=>({name,type:'rect',box:[x,y,w,h],colour,opacity});
const fade=(name,box,colour,direction)=>({name,type:'fade',box,colour,direction,opacity:1});
const line=(name,points,colour,opacity=1,width=2)=>({name,type:'line',points,colour,opacity,width});
const curve=(start,control,end,steps=12)=>Array.from({length:steps+1},(_,i)=>{
 const t=i/steps,q=1-t;return [q*q*start[0]+2*q*t*control[0]+t*t*end[0],q*q*start[1]+2*q*t*control[1]+t*t*end[1]];
});

export function buildV25BattleSceneGeometry(){
 const layer=(name,shapes)=>({name,shapes});
 const outer=curve([489,198],[650,15],[791,198]);
 const inner=curve([519,211],[642,61],[761,211]);
 const horizon=[...curve([0,421],[260,384],[442,417]),...curve([442,417],[624,450],[846,409]).slice(1),...curve([846,409],[1068,368],[1280,411]).slice(1)];
 return [
  layer('sky',[
   rect('skyBase',0,0,1280,676,'#516371'),
   fade('upperSky',[0,0,1280,676*.68],'#273F50','top'),
   fade('lowerSky',[0,676*.68,1280,676*.32],'#19252B','bottom'),
  ]),
  layer('haze',[{name:'distantLight',type:'ellipse',box:[226,-35,880,620],colour:'#96ABB4',opacity:.24}]),
  layer('walls',[
   polygon('leftWall',[[0,0],[168,0],[190,182],[152,339],[170,470],[0,470]],'#24323E',.8),
   polygon('rightWall',[[1100,0],[1280,0],[1280,478],[1100,478],[1081,343],[1112,171]],'#24323E',.8),
   polygon('leftPillar',[[428,0],[467,0],[460,341],[419,341]],'#24323E',.8),
   polygon('rightPillar',[[817,0],[870,0],[864,349],[816,349]],'#24323E',.8),
  ]),
  layer('wallEngraving',[[[39,0],[67,377]],[[112,0],[126,376]],[[1143,0],[1133,376]],[[1227,0],[1195,376]],[[443,0],[443,318]],[[842,0],[842,319]]].map((points,i)=>line('groove'+i,points,'#5E6C73',.35))),
  layer('lintels',[rect('leftShelf',156,355,306,27,'#32434C'),rect('rightShelf',821,355,300,27,'#32434C'),rect('leftCapital',376,312,115,22,'#32434C'),rect('rightCapital',791,312,105,22,'#32434C')]),
  layer('gate',[
   polygon('arch',[[489,337],...outer,[791,337],[761,337],...inner.slice().reverse(),[519,337]],'#32434C'),
   polygon('recess',[[524,369],...curve([524,218],[641,79],[756,218]),[756,369]],'#101D28',.45),
  ]),
  layer('gateGrid',[[[601,102],[601,367]],[[681,102],[681,367]],[[527,218],[755,218]],[[527,289],[755,289]]].map((points,i)=>line('grid'+i,points,'#86949B',.18))),
  layer('floor',[
   polygon('horizon',[...horizon,[1280,451],[0,451]],'#455463'),
   rect('floorBase',0,451,1280,225,'#455463'),
   fade('floorDepth',[0,451,1280,225],'#17212B','bottom'),
  ]),
  layer('perspective',[
   [[0,475],[384,447],[756,455],[1280,463]],[[0,538],[410,498],[810,512],[1280,527]],[[0,620],[391,565],[889,587],[1280,622]],
   [[193,438],[75,676]],[[460,443],[423,676]],[[733,442],[779,676]],[[1001,435],[1121,676]],
   [[345,456],[386,485],[368,501]],[[918,466],[879,506],[927,521]],[[574,533],[601,564],[587,592]],
  ].map((points,i)=>line('joint'+i,points,'#6D7D87',.24))),
  layer('rubble',[
   polygon('leftRock',[[25,381],[107,338],[168,379],[152,417],[20,417]],'#1E2A33'),
   polygon('rightRock',[[1077,397],[1112,350],[1185,359],[1252,414],[1069,414]],'#1E2A33'),
   polygon('centerRock',[[404,403],[434,381],[470,391],[478,416],[400,416]],'#1E2A33'),
  ]),
  layer('rubbleLines',[[[17,398],[101,376],[140,384]],[[1109,398],[1163,374],[1220,396]],[[401,407],[438,393],[464,400]]].map((points,i)=>line('rockEdge'+i,points,'#7D857F',.2))),
  layer('vignette',[{name:'edgeShade',type:'vignette',box:[0,0,1280,676],colour:'#020709',opacity:.57}]),
 ];
}

const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function triangulate(points){
 const polygon=points.filter((point,index)=>Math.abs(cross(points[(index+points.length-1)%points.length],point,points[(index+1)%points.length]))>1e-7);
 const area=polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p[0]*q[1]-p[1]*q[0];},0);
 const remaining=Array.from(polygon.keys());if(area<0)remaining.reverse();
 const result=[];
 while(remaining.length>3){
  let clipped=false;
  for(let i=0;i<remaining.length;i++){
   const indices=[remaining[(i+remaining.length-1)%remaining.length],remaining[i],remaining[(i+1)%remaining.length]];
   const [a,b,c]=indices.map(index=>polygon[index]);
   if(cross(a,b,c)<=1e-7)continue;
   const contains=remaining.some(index=>!indices.includes(index)&&cross(a,b,polygon[index])>=-1e-7&&cross(b,c,polygon[index])>=-1e-7&&cross(c,a,polygon[index])>=-1e-7);
   if(contains)continue;
   result.push([a,b,c]);remaining.splice(i,1);clipped=true;break;
  }
  if(!clipped)throw Error('V25 scene has invalid polygon geometry');
 }
 if(remaining.length===3)result.push(remaining.map(index=>polygon[index]));
 return result;
}

// Restoration CSS applies brightness(.9) and saturation(.65) to scene-art only.
function tone(hex){
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)*.9),luma=rgb[0]*.213+rgb[1]*.715+rgb[2]*.072;
 return '#'+rgb.map(c=>Math.round(luma+(c-luma)*.65).toString(16).padStart(2,'0')).join('');
}
const nativePoint=([x,y])=>[x-640,338-y];
export const nativeSceneEdgeBleed=.45;
// Shared triangle edges must be opaque. Per-triangle translucent alpha exposes
// antialias seams in Simulator. Bake the intended tint against the sky once,
// then give adjacent native triangles a subpixel overlap (no extra controls).
function polygonTone(hex,alpha){
 const sky='#516371';return tone('#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*alpha+parseInt(sky.slice(i,i+2),16)*(1-alpha)).toString(16).padStart(2,'0')).join(''));
}
const group=(name,items)=>({name,kind:'container',position:[0,0],size:[1280,676],children:items});
function nativeShape(shape,theme){
 const picture=(name,box,image,extra={})=>({name,kind:'image',position:nativePoint([box[0]+box[2]/2,box[1]+box[3]/2]),size:box.slice(2),image,colour:tone(shape.colour),opacity:shape.opacity,...extra});
 if(shape.type==='rect')return [picture(shape.name,shape.box,theme.image.rect)];
 // 106095 is vertically transparent-to-white in the local catalog photo.
 // Its stretched alpha ramp still needs actual atlas/engine confirmation.
 if(shape.type==='fade')return [picture(shape.name,shape.box,106095,{rotation:shape.direction==='top'?180:0})];
 // The catalog photograph shows 106029 as a solid circular plate. Haze needs
 // the transparent radial glow106057 instead; their names are not interchangeable.
 if(shape.type==='ellipse'||shape.type==='vignette')return [picture(shape.name,shape.box,shape.type==='ellipse'?theme.image.glowWide:theme.image.vignette)];
 if(shape.type==='line')return shape.points.slice(1).map((p,index)=>{
  const a=shape.points[index],dx=p[0]-a[0],dy=p[1]-a[1],length=Math.hypot(dx,dy);
  return picture(shape.name+index,[(p[0]+a[0]-length)/2,(p[1]+a[1]-shape.width)/2,length,shape.width],theme.image.rect,{rotation:-Math.atan2(dy,dx)*180/Math.PI});
 });
 const images=[];
 for(const vertices of triangulate(shape.points)){
  // Longest edge ensures the altitude foot lies on the edge. Splitting there
  // needs two right triangles, each a masked half of the observed equal-sided
  // library triangle. No shear or per-pixel rectangle conversion is involved.
  const sides=vertices.map((a,i)=>({i,length:Math.hypot(a[0]-vertices[(i+1)%3][0],a[1]-vertices[(i+1)%3][1])}));
  const edge=sides.sort((a,b)=>b.length-a.length)[0].i;
  const [b,c,a]=[vertices[edge],vertices[(edge+1)%3],vertices[(edge+2)%3]].map(nativePoint);
  const dx=c[0]-b[0],dy=c[1]-b[1],t=((a[0]-b[0])*dx+(a[1]-b[1])*dy)/(dx*dx+dy*dy);
  const foot=[b[0]+dx*t,b[1]+dy*t],height=Math.hypot(a[0]-foot[0],a[1]-foot[1]);
  for(const end of [b,c]){
   const ux=end[0]-foot[0],uy=end[1]-foot[1],width=Math.hypot(ux,uy);
   if(width<1e-7||height<1e-7)continue;
   const sign=Math.sign(ux*(a[1]-foot[1])-uy*(a[0]-foot[0])),pad=nativeSceneEdgeBleed;
   const origin=[foot[0]-ux/width*pad+uy/width*sign*pad,foot[1]-uy/width*pad-ux/width*sign*pad];
   images.push({name:shape.name+'Tri'+images.length,kind:'image',position:origin,size:[(width+pad*3)*2,height+pad*3],image:100003,
    colour:polygonTone(shape.colour,shape.opacity),opacity:1,pivot:[.5,0],rotation:Math.atan2(uy,ux)*180/Math.PI,
    scale:[1,Math.sign(ux*(a[1]-foot[1])-uy*(a[0]-foot[0]))],fill:{shape:'horizontal',from:'right',amount:.5}});
  }
 }
 return images;
}

export function applyV25BattleScene(layout,theme){
 const host=children(layout).find(node=>node.name==='battlePanel')?layout:children(layout).find(node=>node.name==='stage');
 const root=children(host??{}).find(node=>node.name==='battlePanel')??host;
 if(!root||!children(root).some(node=>node.name==='endTurn'))throw Error('V25 scene requires a battle stage');
 if(children(root).some(node=>node.name==='v25BattleScene'))throw Error('V25 battle scene already applied');
 const layers=buildV25BattleSceneGeometry().map(layer=>{
  const images=layer.shapes.flatMap(shape=>nativeShape(shape,theme));
  return group(layer.name,images.length<=60?images:Array.from({length:Math.ceil(images.length/60)},(_,i)=>group('batch'+i,images.slice(i*60,(i+1)*60))));
 });
 const scene=group('v25BattleScene',layers);scene.position=[0,-22];
 root.children=[scene,...children(root).filter(node=>node.name!=='lowpolyScene')];
 return layout;
}
