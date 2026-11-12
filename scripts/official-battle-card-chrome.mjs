// Bounded native geometry for the reference shell; no raster decomposition.
const child=(node,name)=>node.children.find(part=>part.name===name);
const image=(name,size,colour,position=[0,0],extra={})=>({name,kind:'image',size,position,image:100001,colour,...extra});
function rounded(name,w,h,r,colour,extra={}){
 return {name,kind:'container',size:[w,h],children:[
  image('vertical',[w-r*2,h],colour,[0,0],extra),
  image('horizontal',[w,h-r*2],colour,[0,0],extra),
  ...[-1,1].flatMap(x=>[-1,1].map(y=>image('corner'+x+'_'+y,[r*2,r*2],colour,[x*(w/2-r),y*(h/2-r)],{...extra,image:100002}))),
 ]};
}
function softOutline(name,blur,colour,opacity=1){
 const k=blur/48,r=9,cx=75-r,cy=105-r;
 // Native image rects must fit 1600x900 before local scale. Keep the short
 // alpha falloff at `blur`, with a bounded long axis and soft overlapping caps.
 const edge=(n,vertical,position)=>image(n,vertical?[96,768]:[1024,96],colour,position,
  {image:106056,imageType:'stretch',scale:vertical?[k,(192+2*blur)/768]:[(132+2*blur)/1024,k],opacity});
 return {name,kind:'container',size:[150,210],children:[
  edge('vertical',true,[-75,0]),edge('horizontal',false,[0,105]),
  edge('vertical2',true,[75,0]),edge('horizontal2',false,[0,-105]),
  ...[-1,1].flatMap(x=>[-1,1].map(y=>image('corner'+x+'_'+y,[2*(r+blur),2*(r+blur)],colour,[x*cx,y*cy],
   {image:106057,imageType:'basic',opacity}))),
 ]};
}
export function officialBattleCardChrome(face,theme){
 const art=theme.officialAssets,chrome=art.battleCardChrome;
 const material=art.battleCardBodyMaterials.red;
 const layerOpacity=art.battleCardBodyLayerOpacity;
 for(const name of ['roundShadow','roundFrame','roundBody'])child(child(face,name),'flat').visible=false;
 child(child(face,'roundBody'),'nativePaperTrim').visible=false;
 const body={name:'nativeCardBody',kind:'container',size:[150,210],children:[
  {...rounded('castShadow',152,212,10,'#0A1012',{opacity:.32,feather:{pixels:[4,4]}}),position:[1,-2]},
  rounded('outerBevel',150,210,9,material.outerBevel),
  {...rounded('paperBevel',144,204,7,material.paperBevel),position:[-.6,.6]},
  {...rounded('recessShadow',136,196,6,material.recessShadow),position:[.6,-.6]},
  rounded('innerWell',132,192,5,material.innerWell),
  image('topCatchlight',[130,1.2],material.topCatchlight,[0,102],{opacity:layerOpacity.topCatchlight,feather:{pixels:[2,.5]}}),
  image('leftCatchlight',[1,184],material.leftCatchlight,[-72,0],{opacity:layerOpacity.leftCatchlight,feather:{pixels:[.4,4]}}),
  image('bottomShade',[130,1.4],material.bottomShade,[0,-102],{opacity:layerOpacity.bottomShade,feather:{pixels:[2,.5]}}),
 ]};
 face.children.splice(face.children.indexOf(child(face,'roundBody'))+1,0,body);
 const ribbon={name:'nativeRibbon',kind:'container',size:[159,38],children:[]};
 for(let i=0;i<8;i++){
  const x=(i-3.5)*159/8,y=86-13*(x/79.5)**2,rotation=Math.atan(-26*x/(79.5**2))*180/Math.PI;
  ribbon.children.push(image('rim'+i,[159/8+.8,22],chrome.ribbonEdge,[x,y],{rotation}),
   image('face'+i,[159/8+.8,19],art.battleCardBannerTint,[x,y+.4],{rotation}),
   image('shade'+i,[159/8+.8,4.5],'#40362D',[x,y-7],{rotation,opacity:.32,feather:{pixels:[.5,1.8]}}),
   image('shine'+i,[159/8+.8,4.2],'#FFF4CF',[x,y+7.5],{rotation,opacity:.42,feather:{pixels:[.5,1.8]}}));
 }
 for(const side of [-1,1])ribbon.children.unshift(image('fold'+side,[23,20],chrome.ribbonFold,[side*74,66],{image:100003,rotation:side*105}));
 // Paint every backing first: interleaving rim/face pairs exposes dark seams
 // where adjacent rotated segments overlap.
 const ribbonOrder=name=>name.startsWith('fold')?0:name.startsWith('rim')?1:name.startsWith('face')?2:3;
 ribbon.children.sort((a,b)=>ribbonOrder(a.name)-ribbonOrder(b.name));
 child(face,'nameBand').visible=false;child(face,'nativeBannerRight').visible=false;
 face.children.splice(face.children.indexOf(child(face,'name')),0,ribbon);
 const rim=child(face,'nativePlayableRim');
 rim.children=[softOutline('softEdge',2,chrome.ready,.25),
  ...Array.from({length:4},(_,index)=>({...softOutline(index===0?'pulseEdge':'pulseEdge'+(index+1),3,chrome.ready),visible:false}))];
 const core=child(face,'costCore');core.visible=false;
 const lens=art.battleCostMaterial;
 const orb={name:'nativeCostOrb',kind:'container',position:[...core.position],size:[chrome.costSize,chrome.costSize],children:[
  image('aura',[chrome.costSize,chrome.costSize],lens.warm,[...lens.offset],{image:lens.soft,opacity:.18,imageType:'basic'}),
  image('rim',[lens.hardSize,lens.hardSize],lens.rimTint,[...lens.offset],{image:lens.rim,imageType:'basic'}),
  image('warmLight',[27,27],lens.warm,[...lens.offset],{image:lens.soft,opacity:.8,imageType:'basic'}),
  image('highlight',[13,13],lens.light,[-3,3.5],{image:lens.highlight,opacity:.85,imageType:'basic'}),
 ]};
 child(face,'cost').size=[chrome.costSize,42];
 face.children.splice(face.children.indexOf(core)+1,0,orb);
}
