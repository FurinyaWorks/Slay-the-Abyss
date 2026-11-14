import {menuRedScene} from './menu-red-scene.mjs';
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
 const palettes=[['normal','#C69B94','#20151B'],['hover','#FFF0E6','#493039'],['pressed','#FF7867','#100C12'],['disabled','#69535A','#281F25']];
 return {name:'v25MenuFace',kind:'container',size:[280,56],children:palettes.map(([name,rim,fill],i)=>({
  name,kind:'container',size:[280,56],visible:i===0,children:[
   image('rim',[0,0],[280,56],theme.image.rect,rim),
   image('plate',[0,0],[278,54],theme.image.rect,fill),
   image('rail',[-138,0],[4,54],theme.image.rect,i===3?'#69535A':'#FF7867'),
  ],
 }))};
}
function titleMark(theme){
 const text=(name,position,size,content,fontSize,colour)=>({name,kind:'text',position,size,
  text:{content,fontSize,minFontSize:fontSize,align:'left',valign:'middle',autoSize:false,colour,outline:false}});
 return {name:'titleMark',kind:'container',position:[-390,230],size:[360,150],children:[
  image('rule',[-155,64],[50,3],theme.image.rect,'#FF7867'),
  text('shadow',[2,14],[360,92],'杀戮原塔2',52,'#35151D'),
  text('wordmark',[0,17],[360,92],'杀戮原塔2',52,'#FFF0E6'),
  text('subtitle',[0,-36],[360,44],'Slay the Heavens',23,'#F5D7CE'),
  image('underline',[-118,-65],[124,1],theme.image.rect,'#DCA49B'),
 ]};
}
function style(button,theme){
 const minimal=theme.menuPresentation;
 for(const name of ['plate','border','normal','disabled','selected']){const old=get(button,name);if(old)old.visible=false;}
 button.size=[280,56];get(button,'hit').size=[280,56];
 const label=get(button,'label');label.position=[22,0];label.size=[218,52];
 label.position=[minimal.labelX,0];label.size=[218,56];
 label.text={...label.text,fontSize:minimal.fontSize,minFontSize:minimal.fontSize,align:'left',colour:minimal.ink,outline:false,autoSize:false};
 if(!get(button,'v25MenuFace'))button.children.unshift(buttonFace(theme));
 if(!get(button,'menuAccent'))button.children.unshift({name:'menuAccent',kind:'container',children:[image('line',[-116,0],[20,2],theme.image.rect,minimal.accent,{opacity:minimal.lineRestAlpha/255})]});
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
 let quit=get(menu,'titleQuit');
 if(!quit){quit={name:'titleQuit',kind:'container',position:v25MenuRuntimeLayout.quit.slice(0,2),size:[292,44],children:[
  {name:'label',kind:'text',text:{content:'退出游戏',valign:'middle',autoSize:true}},
  {name:'hit',kind:'cursorArea',size:[292,44],focusable:true},
 ]};menu.children.push(quit);}
 style(quit,theme);
 quit.position=theme.menuPresentation.quit.slice(0,2);
 return layout;
}
