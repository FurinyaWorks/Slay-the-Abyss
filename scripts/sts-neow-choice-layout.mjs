// Normal-state body measured from the 1920x1029 StS1 PC V2.2 screenshot:
// https://mitadmissions.org/wp-content/uploads/2021/02/1613924743.png
// SHA256 329fc67c6183045533b026a1cb5d40002da323729df3f66fcd437e0699495308.
// RGB-mask body is 880x59 with 79px row pitch. Dark rim reconstruction is
// uncertain by 2–4 source pixels; hover/pressed/disabled are not measured parity.
import {polygon} from './v25-node-layout.mjs';
const child=(n,name)=>n?.children?.find(c=>c.name===name);
const body=[[-440,1.5],[-417,29.5],[417,29.5],[440,1.5],[418,-29.5],[-418,-29.5]];
function layer(name,points,colour,size){
 const group=polygon(name,points.map(([x,y])=>[640+x,360-y]),colour);
 group.size=[...size];return group;
}
export function applyStsNeowChoices(event,theme){
 const token=theme.officialAssets.neowChoice;
 if(!token)throw Error('Official Neow choices require measured neowChoice tokens');
 const extent=[0,1].map(axis=>Math.max(...body.map(p=>p[axis]))-Math.min(...body.map(p=>p[axis])));
 if(token.sourceSize.some((v,axis)=>v!==extent[axis]))throw Error('Neow sourceSize must match the measured contour');
 const n=theme.layout.nativeNode.event.neow,w=token.sourceSize[0]*token.scale,h=token.sourceSize[1]*token.scale;
 n.stsChoice=structuredClone(token);
 n.options={x:token.origin[0],bottom:token.origin[1],spacing:token.sourceStep*token.scale,
  size:[w,h],title:[0,0,w-48,44],description:[0,0,w-48,44]};
 for(let index=1;index<=4;index++){
  const row=child(event,'option'+index);if(!row)throw Error('Missing Neow option '+index);
  row.size=[w,h];row.position=[n.options.x,n.options.bottom+(4-index)*n.options.spacing];
  child(row,'hit').size=[w,Math.max(token.hitHeight,h)];
  for(const name of ['border','normal','hover','pressed','disabled','selected','title','description'])child(row,name).visible=false;
  const rim=body.map(([x,y])=>[x+Math.sign(x)*3,y+Math.sign(y)*3]);
  const face=body.map(([x,y])=>[x*.984,y*.78]);
  row.children.push({name:'stsNeowChrome',kind:'container',size:[...token.sourceSize],scale:[token.scale,token.scale],children:[
   layer('shadow',rim.map(([x,y])=>[x,y-4]),token.shadow,token.sourceSize),layer('border',rim,token.border,token.sourceSize),
   layer('bevel',body,token.bevel,token.sourceSize),layer('face',face,token.face,token.sourceSize),
  ]},{name:'stsNeowText',kind:'text',position:[0,0],size:[w-48,44],text:{content:'',fontSize:token.textSize,
   minFontSize:theme.font.minimum,autoSize:true,colour:token.ink,align:'left',valign:'middle',outline:true,outlineColour:token.outline,outlineOpacity:.7}});
 }
}
