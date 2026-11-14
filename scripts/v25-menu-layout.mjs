import {menuRedScene} from './menu-red-scene.mjs';
// Retain the V25 menu controls and transactions. The native ruins background
// uses the new user reference; the existing text title occupies its left clearance.
export const v25MenuReference={
 sourceCommit:'7e40d2d361fff6b9c89d9f409db29a9d8ac44352',
 record:'menus.js renderMenu/bindReferenceMenuMotion; menu-reference.css .mr-mainlinks/.mr-option',
 unverified:['tower-image-binding','logo-image-binding','native-font-and-gradient-parity'],
};
export const v25MenuRuntimeLayout={title:[-350,160,500,160],start:[-430,-71,292,44],quit:[-430,-215,292,44]};
const nodes=n=>n?.controls??n?.children??[];
const get=(n,name)=>nodes(n).find(c=>c.name===name);
const image=(name,position,size,id,colour,extra={})=>({name,kind:'image',position,size,image:id,colour,...extra});
function style(button,theme){
 const minimal=theme.menuPresentation;
 for(const name of ['plate','border','normal','disabled','selected']){const old=get(button,name);if(old)old.visible=false;}
 button.size=[280,56];get(button,'hit').size=[280,56];
 const label=get(button,'label');label.position=[22,0];label.size=[218,52];
 label.position=[minimal.labelX,0];label.size=[218,56];
 label.text={...label.text,fontSize:minimal.fontSize,minFontSize:minimal.fontSize,align:'left',colour:minimal.ink,outline:false,autoSize:false};
 if(!get(button,'v25MenuFace'))button.children.unshift({name:'v25MenuFace',kind:'container',children:['normal','hover','pressed','disabled'].map((name,i)=>({name,kind:'container',visible:i===0,children:[]}))});
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
 let quit=get(menu,'titleQuit');
 if(!quit){quit={name:'titleQuit',kind:'container',position:v25MenuRuntimeLayout.quit.slice(0,2),size:[292,44],children:[
  {name:'label',kind:'text',text:{content:'退出游戏',valign:'middle',autoSize:true}},
  {name:'hit',kind:'cursorArea',size:[292,44],focusable:true},
 ]};menu.children.push(quit);}
 style(quit,theme);
 quit.position=theme.menuPresentation.quit.slice(0,2);
 return layout;
}
