import {menuRuinsScene} from './menu-ruins-scene.mjs';
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
function face(name,theme){
 const states=['normal','hover','pressed','disabled'].map((state,i)=>({name:state,kind:'container',size:[292,44],visible:i===0,children:[
  image('highlight',[-15,0],[266,42],theme.image.glowWide,'#F0C36A',{opacity:i===1?.9:i===2?.6:0}),
  image('diamond',[-115,0],[13,13],theme.image.rect,i===3?'#8E8B83':'#E6D5AD',{rotation:45}),
  image('diamondHole',[-115,0],[9,9],theme.image.rect,'#202B37',{rotation:45}),
 ]}));
 return {name,kind:'container',size:[292,44],children:states};
}
function style(button,theme){
 for(const name of ['plate','border','normal','disabled','selected']){const old=get(button,name);if(old)old.visible=false;}
 button.size=[292,44];get(button,'hit').size=[292,44];
 const label=get(button,'label');label.position=[22,0];label.size=[218,52];
 label.text={...label.text,fontSize:25,minFontSize:25,align:'left',colour:'#F1E6CC'};
 if(!get(button,'v25MenuFace'))button.children.unshift(face('v25MenuFace',theme));
}
export function applyV25MenuLayout(layout,theme){
 const root=get(layout,'stage')??layout,menu=get(root,'menuPanel');
 if(!menu)throw Error('V25 menu requires menuPanel');
 const start=get(menu,'start');if(!start||!get(start,'hit')||!get(start,'label'))throw Error('V25 menu requires the existing start transaction');
 for(const name of ['emblem','vista','heroArt','lowpolyVeil','titleBand','taglineRuleL','taglineRuleR']){
  const old=get(menu,name);if(old)old.visible=false;
 }
 if(!get(menu,'menuRuinsScene'))menu.children.splice(1,0,menuRuinsScene());
 style(start,theme);start.position=v25MenuRuntimeLayout.start.slice(0,2);
 const resume=get(menu,'continueRun');style(resume,theme);resume.position=[-430,-23];
 let chrome=get(menu,'v25MainMenu');
 if(!chrome){
  chrome={name:'v25MainMenu',kind:'container',size:[1280,720],children:['图鉴','游戏记录'].map((text,i)=>({
   name:'locked'+i,kind:'container',position:[-430,-119-i*48],size:[292,44],children:[
    face('decoration',theme),{name:'label',kind:'text',position:[22,0],size:[218,52],text:{content:text,fontSize:25,minFontSize:25,align:'left',valign:'middle',autoSize:true,colour:'#827F79'}},
   ],
  }))};
  for(const row of chrome.children){const states=get(row,'decoration');for(const state of states.children)state.visible=state.name==='disabled';}
  menu.children.push(chrome);
 }
 let quit=get(menu,'titleQuit');
 if(!quit){quit={name:'titleQuit',kind:'container',position:v25MenuRuntimeLayout.quit.slice(0,2),size:[292,44],children:[
  {name:'label',kind:'text',text:{content:'退出游戏',valign:'middle',autoSize:true}},
  {name:'hit',kind:'cursorArea',size:[292,44],focusable:true},
 ]};menu.children.push(quit);}
 style(quit,theme);
 quit.position=v25MenuRuntimeLayout.quit.slice(0,2);
 return layout;
}
