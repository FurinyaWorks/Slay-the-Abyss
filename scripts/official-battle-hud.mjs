// Approved 1280x720 HUD composition, using native controls and live owners.
const child=(n,name)=>(n?.children??n?.controls??[]).find(c=>c.name===name);
const text=(name,position,size,content,fontSize,colour)=>({name,kind:'text',position,size,text:{content,fontSize,minFontSize:fontSize,autoSize:true,align:'centre',valign:'middle',colour}});
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
export function officialBattleHud(root,theme){
 const hud=theme.officialAssets.battleHud,bar=child(root,'topBar');if(!bar)return;
 bar.position=[0,hud.y];bar.size[1]=hud.height;
 const steel=child(bar,'steel');steel.size[1]=hud.height;steel.colour=hud.barColour;
 for(const name of ['edge','leftRule','rightRule'])child(bar,name).visible=false;
 const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),top=rgb(hud.barTopColour),bottom=rgb(hud.barColour);
 bar.children.splice(bar.children.indexOf(steel)+1,0,
  {name:'topLight',kind:'container',size:[1280,hud.height],children:Array.from({length:8},(_,i)=>({name:'shade'+i,kind:'image',position:[0,hud.height/2-(i+.5)*hud.height/8],size:[1280,hud.height/8+.05],image:100001,colour:'#'+top.map((v,c)=>Math.round(v+(bottom[c]-v)*i/7).toString(16).padStart(2,'0')).join('')}))},
  {name:'barShadow',kind:'image',position:[0,-hud.height/2-1.5],size:[1280,3],image:100001,colour:'#000000',opacity:.25});
 const heading=child(bar,'officialHeroHeading');if(heading)heading.text.colour=hud.headingColour;
 // Resource hints are separate input owners created before the opt-in layout.
 // Move their hits with the visible values; otherwise gold covers potion one.
 const hints=child(root,'resourceHints');
 if(hints)for(const kind of ['hp','gold']){
  const icon=hud[kind+'Icon'],value=hud[kind],host=child(hints,kind),hit=child(host,'hit');
  const left=Math.min(icon[0]-icon[2]/2,value[0]-value[2]/2);
  const right=Math.min(Math.max(icon[0]+icon[2]/2,value[0]+value[2]/2),kind==='gold'?hud.potionX-26:Infinity);
  host.position=[(left+right)/2,hud.y];host.size=[Math.max(44,right-left),44];
  hit.position=[0,0];hit.size=[...host.size];
 }
 const ex=hud.exhaustPile,exhaust=child(root,'exhaustIcon'),count=child(root,'exhaust');
 exhaust.position=[...ex.position];exhaust.size=[ex.diameter,ex.diameter];
 const exImage=child(exhaust,'image');exImage.image=100002;exImage.size=[ex.diameter,ex.diameter];exImage.colour='#000000';exImage.opacity=2/3;
 child(exhaust,'hit').position=[0,0];child(exhaust,'hit').size=[ex.hit,ex.hit];
 count.position=[ex.position[0],ex.position[1]+4/3];count.size=[60,44];count.text.colour=ex.colour;
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
 const title=child(root,'title');title.visible=true;title.position=hud.location.slice(0,2);title.size=hud.location.slice(2);title.text.fontSize=14;title.text.minFontSize=14;title.text.colour='#B1ACA5';
 bar.children.push({name:'battleRoute',kind:'container',position:[hud.route[0],hud.route[1]-hud.y],size:hud.route.slice(2),children:[
  text('label',[0,0],hud.route.slice(2),'地图',18,'#D6CBA5'),
  {name:'hit',kind:'cursorArea',size:hud.route.slice(2),focusable:true},
 ]});
 for(let index=1;index<=3;index++)for(const button of [child(root,'potion'+index),child(child(root,'potionHelp'),'potionHelp'+index)]){
  if(!button)continue;
  for(const variant of button.children??[]){
   const empty=child(variant,'emptyShell');if(!empty)continue;
   child(empty,'face').visible=false;
   const dashes=child(empty,'dashes'),r=21;
   dashes.children=Array.from({length:12},(_,i)=>{const angle=i*Math.PI/6;return {name:'dash'+i,kind:'image',image:100001,size:[7,2],position:[r*Math.sin(angle),r*Math.cos(angle)],rotation:-i*30,colour:'#9C8C70',opacity:.8};});
  }
 }
 for(let index=1;index<=3;index++){
  const caption=child(child(root,'potionHelp'),'potionCaption'+index);
  if(caption)caption.size=[20,28];
 }
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
