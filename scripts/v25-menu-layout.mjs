import {menuRedScene} from './menu-red-scene.mjs';
import {readFileSync} from 'node:fs';
import {flatTriangle} from './menu-flat-triangle.mjs';
import {nativeMenuTriangle} from './menu-red-scene.mjs';
const lettering=JSON.parse(readFileSync(new URL('../data/presentation/menu-title-mark.json',import.meta.url),'utf8'));
// Finish the approved 96219b31 menu without changing its native background.
export const v25MenuReference={
 sourceCommit:'7e40d2d361fff6b9c89d9f409db29a9d8ac44352',
 record:'menus.js renderMenu/bindReferenceMenuMotion; menu-reference.css .mr-mainlinks/.mr-option',
 unverified:['tower-image-binding','logo-image-binding','native-font-and-gradient-parity'],
};
export const v25MenuRuntimeLayout={title:[-350,160,500,160],start:[-430,-71,292,44],quit:[-430,-215,292,44]};
const nodes=n=>n?.controls??n?.children??[];
const get=(n,name)=>nodes(n).find(c=>c.name===name);
const image=(name,position,size,id,colour,extra={})=>({name,kind:'image',position,size,image:id,colour,...extra});
function buttonFace(theme){
 const palettes=[['normal','#EBCBA8',0],['hover','#FF292E',1],['pressed','#FFD2A4',1],['disabled','#69535A',0]];
 return {name:'v25MenuFace',kind:'container',size:[280,56],children:palettes.map(([name,colour,opacity],i)=>({
  name,kind:'container',size:[280,56],visible:i===0,children:[
   image('arrowTop',[-77,5],[14,5],theme.image.rect,colour,{rotation:-45,opacity}),
   image('arrowBottom',[-77,-3],[14,5],theme.image.rect,colour,{rotation:45,opacity}),
   image('pressRule',[9,-24],[134,3],theme.image.rect,colour,{opacity:name==='pressed'?1:0}),
  ],
 }))};
}
function polygon(name,points,colour,opacity=1){
 return points.slice(1,-1).map((p,i)=>{
  const triangle=[points[0],p,points[i+2]].map(([x,y])=>[x-640,360-y]);
  const node=flatTriangle(triangle,name+i,colour)??nativeMenuTriangle(triangle,name+i,colour);
  if(node.kind==='image')node.opacity=opacity;else node.children[0].opacity=opacity;
  return node;
 });
}
function titleMark(theme){
 const shapes=[
  ...polygon('badgeRim',[[26,173],[61,108],[434,108],[455,144],[416,210],[48,210]],'#F9E6CA'),
  ...polygon('badge',[[28,173],[63,110],[432,110],[453,144],[415,208],[49,208]],'#471D25'),
  ...polygon('redEdge',[[415,208],[453,144],[454,148],[418,211]],'#FF292E'),
  ...polygon('redBottom',[[49,208],[415,208],[418,210],[48,210]],'#FF292E'),
  ...polygon('subtitlePlate',[[72,210],[328,210],[306,240],[54,240]],'#F9E6CA'),
  ...polygon('slash',[[333,210],[348,210],[327,240],[313,240]],'#FF292E'),
  ...polygon('crest',[[52,83],[77,83],[49,111]],'#FF292E'),
  ...polygon('crest2',[[86,83],[105,83],[78,104],[61,104]],'#FF292E'),
  ...lettering.shapes.map((s,i)=>{
   const points=s.points.map(([x,y])=>[x-640,360-y]);
   return flatTriangle(points,'letter'+i,s.colour)??nativeMenuTriangle(points,'letter'+i,s.colour);
  }),
 ];
 return {name:'titleMark',kind:'container',size:[1280,720],children:Array.from({length:Math.ceil(shapes.length/50)},(_,i)=>({name:'titleBatch'+i,kind:'container',children:shapes.slice(i*50,(i+1)*50)}))};
}
function style(button,theme){
 const minimal=theme.menuPresentation;
 for(const name of ['plate','border','normal','disabled','selected']){const old=get(button,name);if(old)old.visible=false;}
 button.size=[280,56];get(button,'hit').size=[280,56];
 const label=get(button,'label');label.position=[22,0];label.size=[218,52];
 label.position=[minimal.labelX,0];label.size=[218,56];
 label.text={...label.text,fontSize:minimal.fontSize,minFontSize:minimal.fontSize,align:'left',colour:minimal.ink,outline:false,autoSize:false};
 if(!get(button,'v25MenuFace'))button.children.unshift(buttonFace(theme));
 if(!get(button,'menuAccent'))button.children.unshift({name:'menuAccent',kind:'container',children:[image('line',[9,-24],[134,3],theme.image.rect,minimal.accent,{opacity:minimal.lineRestAlpha/255})]});
}
export function applyV25MenuLayout(layout,theme){
 const root=get(layout,'stage')??layout,menu=get(root,'menuPanel');
 if(!menu)throw Error('V25 menu requires menuPanel');
 const start=get(menu,'start');if(!start||!get(start,'hit')||!get(start,'label'))throw Error('V25 menu requires the existing start transaction');
 for(const name of ['title','emblem','vista','heroArt','lowpolyVeil','titleBand','taglineRuleL','taglineRuleR']){
  const old=get(menu,name);if(old)old.visible=false;
 }
 if(!get(menu,'menuRuinsScene'))menu.children.splice(1,0,menuRedScene());
 style(start,theme);start.position=theme.menuPresentation.start.slice(0,2);
 let chrome=get(menu,'v25MainMenu');
 if(!chrome){
  chrome={name:'v25MainMenu',kind:'container',size:[1280,720],children:[]};
  menu.children.push(chrome);
 }
 if(!get(chrome,'titleMark'))chrome.children.push(titleMark(theme));
 if(!get(chrome,'buttonBacking'))chrome.children.unshift({name:'buttonBacking',kind:'container',children:polygon('backing',[[85,500],[443,500],[395,636],[54,663],[45,620]],'#29171D',0.88)});
 // Keep the shared title/backing below both original button labels and hits.
 menu.children.splice(menu.children.indexOf(chrome),1);
 menu.children.splice(menu.children.indexOf(start),0,chrome);
 let quit=get(menu,'titleQuit');
 if(!quit){quit={name:'titleQuit',kind:'container',position:v25MenuRuntimeLayout.quit.slice(0,2),size:[292,44],children:[
  {name:'label',kind:'text',text:{content:'退出游戏',valign:'middle',autoSize:true}},
  {name:'hit',kind:'cursorArea',size:[292,44],focusable:true},
 ]};menu.children.push(quit);}
 style(quit,theme);
 quit.position=theme.menuPresentation.quit.slice(0,2);
 return layout;
}

