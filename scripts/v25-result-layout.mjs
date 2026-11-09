// Independently authored native composition measured from the frozen V25 result
// screens. No original SVG, browser implementation, fonts or bitmaps are bundled.
// This layout never creates a score, records a result or sends a command.
export const v25ResultReference=Object.freeze({
 sourceCommit:'7e40d2d361fff6b9c89d9f409db29a9d8ac44352',
 record:'results.js:renderResults; results.css:result-banner/result-stats/result-actions',
 scriptSha256:'06d9106dd7abf47f4b840b2bfb9002f8d3379a049d8766e20177fea3dd1ca334',
 stylesSha256:'fd155f1e98942f7eff6eacc35c0ca619705cd3f94aca12a22297c8f51cc8ace8',
 unverified:['native-font-and-shadow-parity','native-paper-and-gradient-parity','outcome-subject-binding','live-hud-binding','six-row-runtime-binding','button-state-runtime-binding','same-candidate-device-capture'],
});
// The shared menu controller animates these objects. Integration must use these
// result-only frames while preserving its separate main-menu frames and rules.
export const v25ResultRuntimeLayout=Object.freeze({
 title:[0,224,490,72],subtitle:[0,147,760,34],
 stats:[0,84.5,294,35],statStepY:-35,health:[0,-121,294,35],
 positions:[[0,84.5],[0,49.5],[0,14.5],[0,-20.5],[0,-55.5],[0,-121]],
 resultRestart:[-210,-265.5,176,53],settle:[4,-265.5,204,70],
 detail:[0,-144,820,28],status:[0,-334,1000,28],
 subjectVictory:[-342.5,-56,215,260],subjectDefeat:[-342.5,-157,215,260],subjectDefeatRotation:-83,
});
const children=n=>n?.controls??n?.children??[];
const find=(n,name)=>children(n).find(c=>c.name===name);
function must(n,name){const found=children(n).filter(c=>c.name===name);if(found.length!==1)throw Error('V25 result requires one '+name);return found[0];}
const frame=(x,y,w,h)=>({position:[x+w/2-640,360-y-h/2],size:[w,h]});
const group=(name,size,items=[],position=[0,0])=>({name,kind:'container',position:[...position],size:[...size],children:items});
const image=(name,position,size,id,colour,extra={})=>({name,kind:'image',position:[...position],size:[...size],image:id,colour,...extra});
function text(name,rectangle,content,font,colour,align='centre'){
 const result={name,kind:'text',...frame(...rectangle),text:{content,fontSize:font,minFontSize:font,autoSize:true,align,valign:'middle',colour}};
 result.size[1]=Math.max(result.size[1],font*2);return result;
}
function put(parent,node,index=children(parent).length){
 const existing=find(parent,node.name);if(existing){Object.assign(existing,node);return existing;}
 children(parent).splice(index,0,node);return node;
}
function place(control,rectangle,font,align='centre',colour='#F2E9CB'){
 Object.assign(control,frame(...rectangle));
 control.size[1]=Math.max(control.size[1],font*2);
 control.text={...control.text,fontSize:font,minFontSize:font,align,valign:'middle',colour};
}
// Fixed construction-time horizontal bands express an independently traced
// paper silhouette. No per-frame drawing or private card-texture conversion.
function silhouette(name,points,size,colour,theme){
 const bands=[];
 for(let y=0;y<size[1];y+=2){
  const intersections=[],scan=y+1;
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length];
   if((a[1]<=scan&&b[1]>scan)||(b[1]<=scan&&a[1]>scan))intersections.push(a[0]+(scan-a[1])*(b[0]-a[0])/(b[1]-a[1]));
  }
  if(intersections.length<2)continue;
  intersections.sort((a,b)=>a-b);const left=intersections[0],right=intersections.at(-1);
  bands.push(image('band'+bands.length,[(left+right)/2-size[0]/2,size[1]/2-y-1],[right-left,2],theme.image.rect,colour));
 }
 return group(name,size,bands);
}
function paper(theme){
 const tail=[[3,88],[23,79],[12,63],[52,69],[66,54],[116,47],[545,48],[581,54],[599,67],[635,63],[624,76],[643,80],[619,94],[564,101],[524,82],[126,82],[89,99],[39,96]];
 const face=[[97,78],[102,23],[127,15],[278,12],[376,8],[374,14],[518,17],[546,27],[552,82],[532,91],[515,84],[139,83],[110,94]];
 const shrink=points=>points.map(([x,y])=>[325+(x-325)*.989,56+(y-56)*.94]);
 return group('paper',[650,112],[silhouette('tailRim',tail,[650,112],'#3F3A30',theme),
  silhouette('tail',shrink(tail),[650,112],'#746E57',theme),silhouette('faceRim',face,[650,112],'#4E493B',theme),
  silhouette('face',shrink(face),[650,112],'#ABA383',theme),
  image('paperLight',[0,18],[390,32],theme.image.glowWide,'#C9C19C',{opacity:.14}),
 ],frame(315,84,650,112).position);
}
function chrome(theme){
 const full=[1280,720],hud=group('hud',full,[
  image('plate',[0,338.5],[1280,43],theme.image.rect,'#34424A'),
  image('light',[0,350],[1280,20],theme.image.glowWide,'#73858B',{opacity:.18}),
  image('rule',[0,318],[1280,2],theme.image.rect,'#1A2125'),
  text('name',[22,0,127,43],'',18,'#CEC9B8','left'),
  text('hp',[159,0,105,43],'',22,'#F06E5B','left'),text('gold',[285,0,90,43],'',22,'#EAC44F','left'),
  text('floor',[548,0,110,43],'',22,'#E1D8BE','left'),text('deck',[1170,0,88,43],'',22,'#E1D8BE','right'),
 ]);
 return group('v25ResultChrome',full,[
  image('backdrop',[0,0],full,theme.image.rect,'#111015'),
  image('atmosphere',[0,-21],[1280,678],theme.image.rect,'#151018'),
  image('leftHaze',[-102,121],[1100,660],theme.image.glowWide,'#51424D',{opacity:.22}),
  image('rightHaze',[282,-122],[1000,700],theme.image.glowWide,'#312735',{opacity:.35}),
  image('vignette',[0,-21],[1280,678],theme.image.vignette,'#000000',{opacity:.7}),hud,
  {...group('subject',[215,260],[],v25ResultRuntimeLayout.subjectVictory.slice(0,2)),visible:false},paper(theme),
  image('healthRule',[0,-85],[294,2],theme.image.rect,'#E4DBC1'),
  text('supportHeading',[265,520,750,28],theme.v25Result?.supportHeading??'',17,'#DEC88C'),
  text('supportBody',[265,551,750,29],theme.v25Result?.supportBody??'',16,'#C4BDA9'),
 ]);
}
function row(result,key,index){
 let control=find(result,'stat_'+key);
 const y=index===5?463.5:258+index*35;
 if(!control){control=group('stat_'+key,[294,35],[text('label',[0,0,200,35],key==='relics'?'遗物件数':'剩余生命',23,'#F2E9CB'),text('value',[0,0,100,35],'',23,'#F2E9CB')]);put(result,control);}
 Object.assign(control,frame(493,y,294,35));
 for(const name of ['border','face']){const old=find(control,name);if(old)old.visible=false;}
 // Children are local to the row, unlike the full-canvas measured rectangles.
 const label=must(control,'label'),value=must(control,'value');
 for(const [node,x,w,align]of [[label,-47,200,'left'],[value,97,100,'right']]){
  node.position=[x,0];node.size=[w,46];node.text={...node.text,fontSize:23,minFontSize:23,align,valign:'middle',colour:'#F2E9CB'};
 }
}
function hexButton(button,rectangle,palette,theme){
 Object.assign(button,frame(...rectangle));const [w,h]=rectangle.slice(2),hit=must(button,'hit');hit.position=[0,0];hit.size=[w,h];
 for(const name of ['plate','border','normal','disabled','selected']){const old=find(button,name);if(old)old.visible=false;}
 const face=group('v25Face',[w,h]);
 const points=[[w*.07,0],[w*.94,0],[w,h/2],[w*.94,h],[w*.07,h],[0,h/2]];
 for(const [i,name]of ['normal','hover','pressed','disabled'].entries()){
  const [rim,fill]=palette[i],inner=points.map(([x,y])=>[w/2+(x-w/2)*(w-4)/w,h/2+(y-h/2)*(h-4)/h]);
  put(face,{...group(name,[w,h],[silhouette('edge',points,[w,h],rim,theme),silhouette('face',inner,[w,h],fill,theme)]),visible:name==='normal'});
 }
 put(button,face,children(button).indexOf(hit));
 const label=must(button,'label');label.position=[0,0];label.size=[w-20,Math.max(42,h-8)];label.text={...label.text,fontSize:21,minFontSize:21,colour:'#F2E9CB'};
 // Keep the existing live label above the state decoration and the existing hit.
 const items=children(button);items.splice(items.indexOf(label),1);items.push(label);
}
export function applyV25ResultLayout(layout,theme){
 const root=find(layout,'stage')??layout,menu=must(root,'menuPanel'),result=must(menu,'result');
 put(result,chrome(theme),0);
 for(const [i,key]of ['floor','victories','time','deck','relics','health'].entries())row(result,key,i);
 place(must(result,'subtitle'),[260,198,760,30],17,'centre','#D2C7AB');
 place(must(result,'detail'),[230,492,820,24],14,'centre','#C4BDA9');
 place(must(result,'status'),[140,681,1000,26],14,'centre','#B7B4A8');
 const title=must(menu,'title');place(title,[395,105,490,62],36);
 const items=children(menu);items.splice(items.indexOf(title),1);items.splice(items.indexOf(result)+1,0,title);
 hexButton(must(menu,'start'),[342,599,176,53],[['#927C50','#4C3432'],['#B09661','#5A3D3B'],['#806D46','#412C2B'],['#655E4D','#343033']],theme);
 hexButton(must(menu,'settle'),[542,590.5,204,70],[['#DDAE42','#315664'],['#FFD052','#3B6676'],['#BD9539','#294957'],['#747062','#303D42']],theme);
 const egg=find(result,'viewEasterEgg');if(egg){Object.assign(egg,frame(798,599,160,53));must(egg,'hit').size=[160,53];
  for(const name of ['plate','border']){const part=find(egg,name);if(part)part.visible=false;}
  const label=must(egg,'label');label.size=[160,53];label.text={...label.text,fontSize:17,minFontSize:17,colour:'#D6C089'};
 }
 return layout;
}
