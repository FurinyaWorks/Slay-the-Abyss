import {compactBoundedCardFaces} from './lightweight-card-layout.mjs';
import {applyV25BattleScene} from './v25-battle-scene.mjs';
import {applyV25BattleChrome} from './v25-battle-chrome.mjs';
import {applyV25TurnNoticeLayout} from './v25-turn-notice-layout.mjs';
import {v25Theme,applyV25BattleLayout} from './v25-layout.mjs';
import {officialBattleHud,officialBattleUtilityFaces} from './official-battle-hud.mjs';
import {officialBattleCardChrome} from './official-battle-card-chrome.mjs';
import {battlePileReturn} from './official-battle-pile-chrome.mjs';
const children=node=>node?.controls??node?.children??[];
const child=(node,name)=>children(node).find(item=>item.name===name);
const required=(node,name)=>{const value=child(node,name);if(!value)throw Error('Official assets missing '+name);return value;};
const walk=(node,visit)=>{visit(node);for(const item of children(node))walk(item,visit);};
const setImage=(control,id,colour)=>{
 if(!control||control.kind!=='image')throw Error('Official asset target must be an existing image');
 control.image=id;if(colour)control.colour=colour;
};

// Only candidate-local presentation values. The game rules, geometry and IDs of
// dynamic semantic icons remain those of the original controllers.
export function officialAssetsTheme(source){
  const theme=structuredClone(source);
  const approved=v25Theme(source);
 if(theme.officialAssets?.profile!=='official-assets-first-v1')throw Error('Missing official asset theme');
 theme.presentationProfile='official-assets-first';
 theme.cardSkin.text.body=theme.officialAssets.cardInk;
  theme.cardSkin.costText=theme.officialAssets.costInk;
  theme.cardSkin.battleCostText=theme.officialAssets.battleCostInk;
  theme.cardSkin.battleCostRingOpacity=theme.officialAssets.battleCostRingOpacity;
  theme.cardSkin.battleArtWells=theme.officialAssets.battleArtWells;
  theme.color.officialBackdropVeil=theme.officialAssets.backdropVeil;
  theme.color.topPanelHp='#EF7777';theme.color.topPanelGold='#F1CA67';
  for(const key of Object.keys(source.v25Battle.layout))theme.layout[key]=structuredClone(approved.layout[key]);
  for(const key of Object.keys(source.v25Battle.font))theme.font[key]=approved.font[key];
  Object.assign(theme.motion,source.v25Battle.motion);
  theme.layout.energy.faceColour='#FFE35D00';
  // The native sans glyph occupies more area than V25's serif. Owner's
  // device feedback calls for a quieter readout inside the unchanged 86px orb.
  theme.layout.energy.numberSize=26;
  theme.layout.cardDrag.aimDots=theme.officialAssets.battleAim.segments;
  theme.layout.cardDrag.aimBend=[...theme.officialAssets.battleAim.bend];
  // Existing exhaust-flight readers retain their historical topBar token path.
  const exhaust=theme.officialAssets.battleHud.exhaustPile.position;
  theme.layout.topBar.exhaustIcon[0]=exhaust[0];theme.layout.topBar.y=exhaust[1];
  theme.cardSkin.artWells=structuredClone(approved.cardSkin.artWells);
  theme.cardSkin.typeInk=approved.cardSkin.typeInk;
  // The frozen original maps starter/basic shells to the common silver frame.
  theme.cardSkin.rarities.basic=structuredClone(theme.cardSkin.rarities.common);
  theme.cardSkin.rarityWindow=true;
  theme.cardSkin.typePlate=theme.cardSkin.rarities.common[4];
 return theme;
}
function cardFace(face,theme,battle=false){
 const art=theme.officialAssets;
 for(const name of ['roundShadow','roundFrame','roundBody']){
  const image=required(required(face,name),'flat');
   setImage(image,battle?theme.image.rect:art.images.cardPanel,name==='roundBody'?art.cardBodyTint:undefined);
 }
 if(battle){
  face.children.unshift({name:'nativePlayableRim',kind:'container',visible:false,size:[150,210],children:[
   ...[-1,1].map(side=>({name:'side'+side,kind:'image',position:[side*75,0],size:[4,212],image:100001,colour:'#43C6BD',opacity:.55,feather:{pixels:[2,2]}})),
   ...[-1,1].map(side=>({name:'edge'+side,kind:'image',position:[0,side*105],size:[154,4],image:100001,colour:'#43C6BD',opacity:.55,feather:{pixels:[2,2]}})),
  ]});
  const body=required(face,'roundBody'),flat=required(body,'flat');flat.colour=art.battleCardBodyTint;
  body.children.unshift({name:'nativePaperTrim',kind:'image',position:[...flat.position],size:[...flat.size],image:art.images.cardPanel,imageType:'basic',colour:art.battleCardTrim});
  flat.size=flat.size.map(value=>value-art.battleCardInset);
  const band=required(face,'nameBand'),skin=required(face,'skin'),title=required(face,'name');
  band.image=art.images.battleBanner;band.imageType='basic';band.position=[title.position[0],title.position[1]+2];band.size=[title.size[0],art.battleCardChrome.ribbonHeight];band.colour=art.battleCardBannerTint;
  face.children.splice(face.children.indexOf(band),1);face.children.splice(face.children.indexOf(title),0,band);
  // Two clipped halves gently bend the native ribbon without raster rebuilds.
  band.rotation=art.battleRibbonTilt;band.fill={shape:'horizontal',from:'left',amount:art.battleRibbonFill};
  const right=structuredClone(band);right.name='nativeBannerRight';right.rotation=-art.battleRibbonTilt;right.fill.from='right';
  face.children.splice(face.children.indexOf(band)+1,0,right);
  required(face,'nameRule').visible=false;
  // Reuse the live rarity-owned banner path above. Old rectangle bands would
  // cover its folded silhouette; retain their handles for cached tint writers.
  for(const part of children(skin))if(part.name==='gloss'||/^band\d+$/.test(part.name))part.visible=false;
  title.text.fontSize=14;title.text.minFontSize=14;
  title.text.colour=art.battleCardTitleInk;title.text.outline=true;title.text.outlineColour='#373737';title.text.outlineOpacity=1;
  for(const [name,width]of [['tagEdge',45],['tagBody',42]]){
   const tag=required(face,name);tag.size[0]=width;required(tag,'flat').size[0]=width;
   if(name==='tagBody')required(tag,'flat').colour='#C4CAD3';
  }
  for(const kind of ['attack','skill','power']){
   const window=required(skin,kind),well=required(window,'well');
   for(const [index,scale]of [.95,.7,.45].entries())well.children.push({name:'nativeWindowLight'+index,kind:'image',position:[0,window.size[1]*.12],size:[window.size[0]*scale,window.size[1]*scale*.8],image:106056,imageType:'basic',colour:kind==='attack'?'#A94D47':'#C46A60',opacity:.14});
  }
 }
 for(const name of ['label','description']){
  const text=child(face,name);if(text?.kind==='text')text.text.colour=art.cardInk;
 }
 setImage(required(face,'costCore'),battle?art.images.battleCoin:art.images.costDisc,battle?'#FFD06A':'#FFFFFF');
 // Preserve the animated, semantic cost ring and red/green cost deltas. The
// official medallion is a single untinted backing, never the dynamic number.
 const disc=required(face,'costCore');disc.size=[Math.min(...disc.size),Math.min(...disc.size)];
 if(battle){
  disc.size=[34,34];disc.imageType='basic';
  const cost=required(face,'cost');cost.text.outline=true;cost.text.outlineColour='#4A2B27';cost.text.outlineOpacity=1;
  officialBattleCardChrome(face,theme);
 }
}
function battleSurfaces(root,theme){
 walk(root,node=>{
  // A solid native disc is sufficient for these monochrome materials. Avoid
  // depending on an atlas sprite's default nine-slice centre for solid fills.
  if(node.kind==='image'&&node.image===106025)node.image=100002;
  if(node.name==='dashes'&&children(node).length>1&&children(node).every(c=>/^dash\d+$/.test(c.name)&&c.kind==='image')){
   node.children=[{name:'nativeRing',kind:'image',size:[...node.size],image:theme.image.ring,colour:theme.color.goldDim,opacity:.55}];
  }
 });
 const bar=child(root,'topBar');
 if(!bar)return;
 const hud=theme.officialAssets.battleHud;
 bar.position=[0,hud.y];
 for(const name of ['leftRule','rightRule'])required(bar,name).visible=false;
 required(bar,'steel').colour=hud.barColour;
 const place=(name,position,size,font)=>{
  const node=required(root,name);node.position=position;if(size)node.size=size;
  if(font&&node.text){node.text.fontSize=font;node.text.minFontSize=14;node.text.align='left';}
 };
 for(const [name,key,font]of [['hpIcon','hpIcon'],['player','hp',hud.numberSize],['goldIcon','goldIcon'],['piles','gold',hud.numberSize]])place(name,hud[key].slice(0,2),hud[key].slice(2),font);
 for(const name of ['title','floorIcon','floor'])required(root,name).visible=false;
 const heading=structuredClone(required(root,'player'));heading.name='officialHeroHeading';heading.position=hud.heading.slice(0,2);heading.size=hud.heading.slice(2);heading.text.content=hud.headingText;heading.text.fontSize=hud.headingSize;heading.text.colour=theme.color.gold;
 heading.position[1]-=hud.y;bar.children.push(heading);
 for(let index=1;index<=5;index++){
  const x=hud.potionX+(index-1)*hud.potionStep;
  const bottle=child(root,'potion'+index)??child(child(root,'potionHelp'),'potion'+index);
  if(!bottle)throw Error('Missing battle potion '+index);
  for(const node of [bottle,child(child(root,'potionHelp'),'potionHelp'+index)]){
   if(node){
    node.position=[x,hud.y];
    for(const face of children(node))if(['normal','hover','pressed','disabled'].includes(face.name))face.scale=(face.scale??[1,1]).map((value,axis)=>value*(Array.isArray(hud.potionScale)?hud.potionScale[axis]:hud.potionScale));
   }
  }
  const caption=child(child(root,'potionHelp'),'potionCaption'+index);if(caption)caption.position=[x,hud.potionCaptionY];
 }
}
function buttonFaces(node,theme){
 if(node.name==='endTurn'&&child(child(node,'normal'),'v25Chrome'))return;
 const parts=children(node),isStateButton=node.kind==='presetButton';
 const hasHit=parts.some(item=>item.name==='hit'&&item.kind==='cursorArea');
 const hasCaption=parts.some(item=>item.name==='label'&&item.kind==='text');
 if(!isStateButton&&!(hasHit&&hasCaption))return;
 const faces=isStateButton?parts:[node];
  for(const face of faces){
  const label=child(face,'label');if(!label||!face.size||face.size[0]<face.size[1]*1.8)continue;
  for(const name of ['plate','normal','hover','pressed','disabled','selected']){
   const plate=child(face,name);
    if(plate?.kind==='image')setImage(plate,theme.officialAssets.images.button,
      face.name==='disabled'||name==='disabled'?theme.color.textMuted:'#FFFFFF');
   }
   // Match the dark material all the way to the hit surface. This also covers
   // the Simulator's generic blue button backing without editing its renderer.
   const border=child(face,'border');if(border?.kind==='image'){border.opacity=1;border.colour=theme.officialAssets.buttonBacking;}
   if(!border&&!child(face,'officialButtonBacking'))face.children.unshift({name:'officialButtonBacking',kind:'image',size:[...face.size],image:theme.image.rect,colour:theme.officialAssets.buttonBacking});
   const plate=child(face,'plate');if(plate?.kind==='image')plate.size=[...face.size];
    label.text.colour=face.name==='disabled'?theme.color.textMuted:theme.officialAssets.buttonInk;
 }
}
function panelSurfaces(node,theme){
 // Keep all modal catchers, live field paths, sizes and visibility. Only replace
// large landscape image surfaces; do not stretch the landscape plaque into icons.
 if(node.kind!=='container')return;
 const hasText=children(node).some(item=>item.kind==='text');
 if(!hasText)return;
 for(const name of ['face','panel','plate']){
  const plate=child(node,name);
  if(plate?.kind==='image'&&plate.size?.[0]>=240&&plate.size[1]>=96&&plate.size[0]>=plate.size[1]*1.4)
   setImage(plate,theme.officialAssets.images.panel,'#FFFFFF');
 }
}
function roomTextFits(node,theme){
 if(node.name!=='shopView')return;
 const description=required(required(node,'removal'),'description');
 if(description.kind!=='text'||!description.text?.autoSize)throw Error('Official shop removal needs autosizing text');
 // Keep the full live description and box. Seven CJK glyphs do not fit the
 // former fixed 20px minimum; permit the existing native minimum as needed.
 description.text.minFontSize=theme.font.minimum;
}
function pageBackgrounds(node,theme){
 const ids=theme.image.officialBackdrops;
 if(node.name==='menuPanel'){
  setImage(required(node,'backdrop'),ids.title,'#FFFFFF');
  // Results share this page. Keep the four live value fields and reveal poses,
  // but give their compact plaques the same official surface as other rooms.
  const result=required(node,'result');
  for(const key of ['floor','victories','time','deck']){
   const stat=required(result,'stat_'+key);
   setImage(required(stat,'face'),theme.officialAssets.images.panel,'#FFFFFF');
   required(stat,'border').colour=theme.color.goldDim;
  }
 }
  if(node.name==='nodePanel'){
  const backdrop=child(node,'backdrop');if(backdrop)setImage(backdrop,ids.act1_3,'#FFFFFF');
  }
  if(node.name==='officialBattleBackdrop'){
   // Runtime scene switches remain valid; the foreground V25 scene now owns
   // the complete architecture and floor rather than stretched icon silhouettes.
   for(const scene of children(node)){
    if(!/^(act[12]_[123]|boss[12])$/.test(scene.name))continue;
    scene.kind='container';scene.children=[];
    delete scene.image;delete scene.colour;delete scene.opacity;
   }
   const veil=child(node,'readabilityVeil');if(veil)veil.opacity=0;
  }
 // The map has grouped mapField/mapLight surfaces, not a backdrop child. Its
 // quiet low-control background and semantic official node icons stay intact.
}
export function applyOfficialAssets(trees,theme){
 if(!Array.isArray(trees)||!trees.length)throw Error('Official assets require layout trees');
 const images=theme.officialAssets?.images;
 if(!images||Object.values(images).some(id=>!Number.isSafeInteger(id)||id<=0))throw Error('Invalid official image manifest');
 let cardHosts=0,removedControls=0;const battleCards=new Set();
  for(const tree of trees){
   const stage=child(tree,'stage')??tree;
   const relicBar=child(stage,'relicBar');
   if(relicBar)for(let i=1;i<=theme.officialAssets.battleRelicBar.count;i++){
    if(!child(relicBar,'slot'+i)){
     const slot=structuredClone(required(relicBar,'slot1'));slot.name='slot'+i;slot.visible=false;relicBar.children.push(slot);
    }
   }
   for(const host of [child(stage,'relicBar'),child(stage,'relicPanel')])if(host)walk(host,node=>{
    if(node.kind==='image'&&node.name==='icon')node.colour='#FFFFFF';
   });
   if(child(stage,'battlePanel')||child(stage,'endTurn')){
    applyV25BattleLayout(tree,theme);
    applyV25BattleChrome(tree,theme);
    applyV25TurnNoticeLayout(tree,theme);
    applyV25BattleScene(tree,theme);
    const battle=child(stage,'battlePanel')??stage;
    for(const node of children(battle))if(/^card\d+$/.test(node.name))battleCards.add(node);
    battleSurfaces(battle,theme);
    officialBattleHud(battle,theme);officialBattleUtilityFaces(stage,theme);
   }
   const result=compactBoundedCardFaces(tree,[],{preserveWindows:true});removedControls+=result.removedControls;
   walk(tree,node=>{
    // Several native 28px labels are only 44px high. Their formerly identical
    // preferred/minimum sizes leave no whole line in the real renderer. Keep
    // geometry and preferred sizes, and let the existing autosizer fit the text.
    if(node.kind==='text'&&node.text?.autoSize&&node.text.minFontSize*1.45+4>node.size?.[1])node.text.minFontSize=theme.font.minimum;
   if(child(node,'roundFrame')&&child(node,'skin')&&child(node,'costDisc')){cardFace(node,theme,battleCards.has(node));cardHosts++;}
   else {buttonFaces(node,theme);panelSurfaces(node,theme);pageBackgrounds(node,theme);roomTextFits(node,theme);}
  });
  const pileReturn=child(child(tree,'stage')??tree,'deckPanel');
  if(child(pileReturn,'pileReturn'))battlePileReturn(child(pileReturn,'pileReturn'),true,theme.officialAssets.images.button);
  const tools=child(pileReturn,'pileTools');
  if(tools)for(const control of children(tools)){
   const backing=child(control,'officialButtonBacking');if(backing)backing.visible=false;
  }
 }
 return {cardHosts,removedControls};
}
