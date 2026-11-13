// Approved 1280x720 HUD composition, using native controls and live owners.
import {prepareOfficialRunHud,finishOfficialRunBar,mountOfficialResourceHints,
 officialRunHudComponent,mountOfficialResource,mountOfficialPotionEntry} from './official-run-hud-components.mjs';
const child=(n,name)=>(n?.children??n?.controls??[]).find(c=>c.name===name);
const text=(name,position,size,content,fontSize,colour)=>({name,kind:'text',position,size,text:{content,fontSize,minFontSize:fontSize,autoSize:true,align:'centre',valign:'middle',colour}});
function energyFinish(root,theme){
 const icon=child(root,'energyIcon'),chrome=child(icon,'v25Chrome'),size=icon.size[0];
 const disc=(name,diameter,colour,position=[0,0],soft=0)=>({name,kind:'image',position,size:[diameter,diameter],image:100002,colour,
  ...(soft?{feather:{pixels:[soft,soft]}}:{})});
 // Replace the tinted ornament texture and dark stack with the approved
 // cream/gold/orange radial hierarchy. Six bounded native discs, no new hits,
 // imported bitmap, frame updates or controller handles.
 chrome.children=[disc('metal',size-4,'#C3B4A1'),disc('darkRim',size-7,'#852024'),
  disc('amber',size-10,'#F39A24'),disc('gold',size-15,'#FFE35D',[-size*.025,size*.04],7),
  disc('warmLight',size*.65,'#FFF7A6',[-size*.05,size*.08],12),
  disc('centreLight',size*.35,'#FFFAD5',[-size*.05,size*.08],12)];
 // One continuous native outline, not two offset text copies. Keep the shadow
 // object for the existing value writer and preserve zero/overcharge semantics.
 child(icon,'valueShadow').visible=false;
 const number=child(root,'energy');
 Object.assign(number.text,{outline:true,outlineColour:'#4C2425',outlineOpacity:1});
}
export function officialBattleUtilityFaces(stage,theme){
 for(const [entry,symbol]of [['deckEntry','▱'],['exitEntry','⚙']]){
  const hit=child(child(child(stage,entry),'open'),'hit');if(!hit)continue;
  for(const variant of hit.children){
   const deck=entry==='deckEntry',colour=variant.name==='hover'?'#FFF3CE':variant.name==='disabled'?'#8F918B':'#D6CBA5';
   variant.children.push({name:'officialBattleHud',kind:'container',size:[...variant.size],visible:false,children:[
    text('symbol',[deck?-16:0,0],[30,36],symbol,18,colour),
    ...(deck?[text('count',[10,0],[34,36],'',18,colour)]:[]),
   ]});
  }
 }
}
// Reuse the final battle bar and resource tokens on every run page.
export function officialRunChrome(tree,theme){
 const stage=child(tree,'stage')??tree,battle=child(stage,'battlePanel');
 const source=child(battle,'topBar');if(!source)return;
 const component=officialRunHudComponent(battle),hud=theme.officialAssets.battleHud;
 const potions=child(child(stage,'potionEntry'),'open');
 if(potions)mountOfficialPotionEntry(potions,component,theme);
 for(const name of ['mapPanel','nodePanel']){
  const page=child(stage,name);if(!page)continue;
  const resources=child(page,'resources')??page;
  const bar=structuredClone(component.bar);
  // The map's opaque paper and the node backdrop must paint before the bar.
  // Keep live titles in their existing owners (MapUI resolves mapGroup/title).
   const titleOwner=page.children.findIndex(part=>name==='mapPanel'?/^mapGroup\d+$/.test(part.name):part.name==='title');
   page.children.splice(titleOwner<0?page.children.length:titleOwner,0,bar);
   if(name==='nodePanel'){
    // A live action belongs to the node page, never to a decorative bar clone.
    // Reuse the battle shortcut face and let GameUI own its context and input.
    const route=structuredClone(child(source,'battleRoute'));
    route.name='runRoute';route.position=[hud.route[0],hud.route[1]];
    page.children.push(route);
   }
  const visit=node=>{
   for(const key of ['headerShade','headerDivider','titleLineLeft','titleLineRight','headerFace','headerDepth','headerRule']){
    const old=child(node,key);if(old)old.visible=false;
   }
   if(child(node,'headerShade')||node===page){
    const title=child(node,'title');
    if(title)mountOfficialResource(title,component.title);
   }
   for(const part of node.children??[])visit(part);
  };
  visit(page);
  for(const [name,reference]of Object.entries(component.resources))mountOfficialResource(child(resources,name),reference);
  mountOfficialResourceHints(page,theme);
 }
}
export function officialBattleHud(root,theme){
 const hud=theme.officialAssets.battleHud,bar=child(root,'topBar');if(!bar)return;
 prepareOfficialRunHud(root,theme);
 energyFinish(root,theme);
 finishOfficialRunBar(root,theme);
 const ex=hud.exhaustPile,exhaust=child(root,'exhaustIcon'),count=child(root,'exhaust');
 exhaust.position=[...ex.position];exhaust.size=[ex.diameter,ex.diameter];
 const exImage=child(exhaust,'image');exImage.image=ex.image;exImage.size=[ex.diameter,ex.diameter];exImage.colour=ex.imageColour;exImage.opacity=ex.imageOpacity;
 child(exhaust,'hit').position=[0,0];child(exhaust,'hit').size=[ex.hit,ex.hit];
 count.position=ex.position.map((value,i)=>value+ex.countOffset[i]);count.size=[...ex.countSize];
 Object.assign(count.text,{colour:ex.colour,fontSize:ex.countFont,minFontSize:ex.countFont});
 // Exhaust joins the same V25 red/cream numeric badge family as draw/discard.
 exhaust.children.splice(exhaust.children.length-1,0,{name:'pileCountBadge',kind:'image',position:[...ex.countOffset],size:[28,28],image:100002,colour:'#B13927'});
 count.text.colour='#FFF0D6';count.size=[28,32];
 const aim=child(root,'dragLayer'),aimStyle=theme.officialAssets.battleAim;
 for(let index=1;index<=aimStyle.segments;index++){
  let node=child(aim,'aim'+index);
  if(!node){node=structuredClone(child(aim,'aim1'));node.name='aim'+index;aim.children.push(node);}
  node.image=100002;node.colour=aimStyle.idle;
  if(index===aimStyle.segments){
   node.kind='container';delete node.image;delete node.colour;
   node.children=[{name:'tip',kind:'image',position:[0,4],size:[30,26],image:100003,colour:aimStyle.idle},
    {name:'stem',kind:'image',position:[0,-10],size:[10,20],image:100001,colour:aimStyle.idle}];
  }
 }
 bar.children.push({name:'battleRoute',kind:'container',position:[hud.route[0],hud.route[1]-hud.y],size:hud.route.slice(2),children:[
  text('label',[0,0],hud.route.slice(2),'地图',18,'#D6CBA5'),
   {name:'hit',kind:'cursorArea',position:[0,-.5],size:hud.route.slice(2).map(value=>Math.max(44,value)),focusable:true},
 ]});
 for(const kind of ['draw','discard']){
  const pile=child(root,kind+'Icon'),draw=kind==='draw';
  child(pile,'glyph').visible=false;
  pile.children.splice(pile.children.length-1,0,{...text('nativePileMark',[0,0],[39,64],draw?'▯':'↶',draw?36:38,draw?'#B74028':'#25536D'),rotation:draw?-16:13});
  const label=child(root,kind+'Label');label.text.content=draw?'抽牌堆':'弃牌堆';label.text.fontSize=14;label.text.minFontSize=14;
  label.size=[draw?60:80,36];label.position=[draw?-595:pile.position[0],pile.position[1]+45];
  // The visible caption belongs to the same pile action. Enclose both it and
  // the original stack; the right pile stays wholly to the right of End Turn.
  const left=Math.min(pile.position[0]-pile.size[0]/2,label.position[0]-label.size[0]/2),right=Math.max(pile.position[0]+pile.size[0]/2,label.position[0]+label.size[0]/2);
  const low=pile.position[1]-pile.size[1]/2,high=Math.max(pile.position[1]+pile.size[1]/2,label.position[1]+label.size[1]/2);
  const hit=child(pile,'hit');hit.position=[(left+right)/2-pile.position[0],(low+high)/2-pile.position[1]];hit.size=[right-left,high-low];
  // Original pile captions are hover tips, not persistent targets above stacks.
  // Keep the actual stack hit separate from ExhaustPanel above the discard pile.
  label.visible=false;label.text.content='';hit.position=[0,0];hit.size=[...pile.size];
 }
}
