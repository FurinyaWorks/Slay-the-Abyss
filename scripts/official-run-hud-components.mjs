// One official run HUD material. Existing pages retain their live writer and
// input handles; mounting a component never creates another action owner.
const parts=node=>node?.children??node?.controls??[];
const child=(node,name)=>parts(node).find(part=>part.name===name);
const clone=structuredClone;

export function prepareOfficialRunHud(root,theme){
 const hud=theme.officialAssets.battleHud,bar=child(root,'topBar');
 for(const [name,key,font]of [['hpIcon','hpIcon'],['player','hp',hud.numberSize],['goldIcon','goldIcon'],['piles','gold',hud.numberSize]]){
  const node=child(root,name);node.position=hud[key].slice(0,2);node.size=hud[key].slice(2);
  if(font&&node.text)Object.assign(node.text,{fontSize:font,minFontSize:14,align:'left'});
 }
 for(const name of ['floorIcon','floor'])child(root,name).visible=false;
 const heading=clone(child(root,'player'));heading.name='officialHeroHeading';
 heading.position=hud.heading.slice(0,2);heading.position[1]-=hud.y;heading.size=hud.heading.slice(2);
 Object.assign(heading.text,{content:hud.headingText,fontSize:hud.headingSize,colour:hud.headingColour});
 bar.children.push(heading);
 for(let index=1;index<=theme.layout.battlePotions.count;index++){
  const x=hud.potionX+(index-1)*hud.potionStep;
  const button=child(root,'potion'+index)??child(child(root,'potionHelp'),'potion'+index);
  if(!button)throw Error('Missing battle potion '+index);
  for(const node of [button,child(child(root,'potionHelp'),'potionHelp'+index)]){
   if(!node)continue;
   node.position=[x,hud.y];
   for(const face of parts(node))if(['normal','hover','pressed','disabled'].includes(face.name)){
    face.scale=(face.scale??[1,1]).map((value,axis)=>value*(Array.isArray(hud.potionScale)?hud.potionScale[axis]:hud.potionScale));
    finishOfficialPotionFace(face);
   }
  }
  const caption=child(child(root,'potionHelp'),'potionCaption'+index);
  if(caption){caption.position=[x,hud.potionCaptionY];caption.visible=false;caption.active=false;caption.text.content='';}
 }
}

export function finishOfficialRunBar(root,theme){
 const hud=theme.officialAssets.battleHud,bar=child(root,'topBar');
 bar.position=[0,hud.y];bar.size[1]=hud.height;
 const steel=child(bar,'steel');steel.size[1]=hud.height;steel.colour=hud.barColour;
 for(const name of ['edge','leftRule','rightRule'])child(bar,name).visible=false;
 const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),top=rgb(hud.barTopColour),bottom=rgb(hud.barColour);
 bar.children.splice(bar.children.indexOf(steel)+1,0,
  {name:'topLight',kind:'container',size:[1280,hud.height],children:Array.from({length:8},(_,i)=>({name:'shade'+i,kind:'image',position:[0,hud.height/2-(i+.5)*hud.height/8],size:[1280,hud.height/8+.05],image:100001,colour:'#'+top.map((v,c)=>Math.round(v+(bottom[c]-v)*i/7).toString(16).padStart(2,'0')).join('')}))},
  {name:'barShadow',kind:'image',position:[0,-hud.height/2-1.5],size:[1280,3],image:100001,colour:'#000000',opacity:.25});
 const heading=child(bar,'officialHeroHeading');if(heading)heading.text.colour=hud.headingColour;
 const title=child(root,'title');
 title.visible=true;title.position=hud.location.slice(0,2);title.size=hud.location.slice(2);
 Object.assign(title.text,{fontSize:14,minFontSize:14,colour:'#B1ACA5'});
 mountOfficialResourceHints(root,theme);
}

export function mountOfficialResourceHints(root,theme){
 const hud=theme.officialAssets.battleHud,hints=child(root,'resourceHints');
 if(!hints)return;
 for(const kind of ['hp','gold']){
  const icon=hud[kind+'Icon'],value=hud[kind],host=child(hints,kind),hit=child(host,'hit');
  const left=Math.min(icon[0]-icon[2]/2,value[0]-value[2]/2);
  const right=Math.min(Math.max(icon[0]+icon[2]/2,value[0]+value[2]/2),kind==='gold'?hud.potionX-26:Infinity);
  host.position=[(left+right)/2,hud.y];host.size=[Math.max(44,right-left),44];
  hit.position=[0,0];hit.size=[...host.size];
 }
}

export function finishOfficialPotionFace(variant){
 const empty=child(variant,'emptyShell');if(!empty)return;
 child(empty,'face').visible=false;
 child(empty,'dashes').children=Array.from({length:12},(_,i)=>{
  const angle=i*Math.PI/6;
  return {name:'dash'+i,kind:'image',image:100001,size:[7,2],position:[21*Math.sin(angle),21*Math.cos(angle)],rotation:-i*30,colour:'#9C8C70',opacity:.8};
 });
}

export function officialRunHudComponent(battle){
 const bar=clone(child(battle,'topBar'));bar.name='officialRunBar';
 bar.children=bar.children.filter(part=>part.name!=='battleRoute');
 const resources=Object.fromEntries([['hpIcon','hpIcon'],['hp','player'],['goldIcon','goldIcon'],['gold','piles']]
  .map(([role,name])=>[role,clone(child(battle,name))]));
 const title=clone(child(battle,'title'));
 const button=child(battle,'potion1')??child(child(battle,'potionHelp'),'potion1');
 const potionFaces=Object.fromEntries(parts(button).filter(part=>['normal','hover','pressed','disabled'].includes(part.name)).map(part=>[part.name,clone(part)]));
 return {bar,resources,title,potionFaces};
}

export function mountOfficialResource(node,reference){
 if(!node)return;
 const name=node.name,content=node.text?.content;
 Object.assign(node,clone(reference),{name});
 if(node.text)node.text.content=content;
}

export function mountOfficialPotionEntry(open,component,theme){
 const frame=theme.layout.nativeNode.topBar.potions;
 open.position=frame.slice(0,2);child(open,'hit').size=frame.slice(2);
 for(const variant of parts(child(open,'hit'))){
  const face=component.potionFaces[variant.name];if(!face)continue;
  // The battle state already includes the approved size and pressed scale.
  // Apply that scale at each physical slot, never again at the management row.
  variant.scale=[1,1];
  for(const name of ['label','entryFace','officialButtonBacking']){
   const old=child(variant,name);if(old)old.visible=false;
  }
  for(const slot of parts(variant).filter(part=>/^slot\d+$/.test(part.name))){
   slot.size=clone(face.size);slot.scale=clone(face.scale??[1,1]);
   slot.children=clone(face.children);
  }
 }
}
