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
export function officialBattleCardChrome(face,theme){
 const art=theme.officialAssets,chrome=art.battleCardChrome;
 for(const name of ['roundShadow','roundFrame','roundBody'])child(child(face,name),'flat').visible=false;
 child(child(face,'roundBody'),'nativePaperTrim').visible=false;
 const body={name:'nativeCardBody',kind:'container',size:[150,210],children:[
  rounded('outerBevel',150,210,9,chrome.shell[0]),
  rounded('paperBevel',146,206,7,chrome.shell[1]),
  rounded('innerWell',136,196,5,art.battleCardBodyTint),
 ]};
 face.children.splice(face.children.indexOf(child(face,'roundBody'))+1,0,body);
 const ribbon={name:'nativeRibbon',kind:'container',size:[159,38],children:[]};
 for(let i=0;i<8;i++){
  const x=(i-3.5)*159/8,y=86-10*(x/79.5)**2,rotation=Math.atan(-20*x/(79.5**2))*180/Math.PI;
  ribbon.children.push(image('rim'+i,[159/8+.8,22],chrome.ribbonEdge,[x,y],{rotation}),
   image('face'+i,[159/8+.8,19],art.battleCardBannerTint,[x,y+.4],{rotation}));
 }
 for(const side of [-1,1])ribbon.children.unshift(image('fold'+side,[19,16],chrome.ribbonFold,[side*73,68],{image:100003,rotation:side*105}));
 // Paint every backing first: interleaving rim/face pairs exposes dark seams
 // where adjacent rotated segments overlap.
 ribbon.children.sort((a,b)=>Number(a.name.startsWith('face'))-Number(b.name.startsWith('face')));
 child(face,'nameBand').visible=false;child(face,'nativeBannerRight').visible=false;
 face.children.splice(face.children.indexOf(child(face,'name')),0,ribbon);
 const rim=child(face,'nativePlayableRim');
 rim.children=[rounded('softEdge',162,222,14,chrome.ready,{opacity:.13,feather:{pixels:[8,8]}}),
  ...Array.from({length:4},(_,index)=>({...rounded(index===0?'pulseEdge':'pulseEdge'+(index+1),150,210,9,chrome.ready,
   {opacity:1,feather:{pixels:[3,3]}}),visible:false}))];
 const core=child(face,'costCore');core.visible=false;
 const orb={name:'nativeCostOrb',kind:'container',position:[...core.position],size:[chrome.costSize,chrome.costSize],children:
  chrome.orb.map((colour,index)=>image('ring'+index,[chrome.costSize-index*4,chrome.costSize-index*4],colour,index===chrome.orb.length-1?[-1,1]:[0,0],{image:100002}))};
 child(face,'cost').size=[chrome.costSize,42];
 face.children.splice(face.children.indexOf(core)+1,0,orb);
}
