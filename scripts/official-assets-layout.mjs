import {compactBoundedCardFaces} from './lightweight-card-layout.mjs';
import {applyV25BattleScene} from './v25-battle-scene.mjs';
import {applyV25BattleChrome} from './v25-battle-chrome.mjs';
import {applyV25TurnNoticeLayout} from './v25-turn-notice-layout.mjs';
import {v25Theme,applyV25BattleLayout,rebuildV25CardFaces} from './v25-layout.mjs';
import {officialBattleHud,officialBattleUtilityFaces} from './official-battle-hud.mjs';
import {officialBattleCardChrome} from './official-battle-card-chrome.mjs';
import {battlePileReturn} from './official-battle-pile-chrome.mjs';
import {preflightOfficialRoots,composeOfficialRun,finishOfficialComposition} from './official-run-layout.mjs';
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
  theme.layout.v25Menu=structuredClone(approved.layout.v25Menu);
  Object.assign(theme.layout.rewardPick,structuredClone(approved.layout.rewardPick));
  theme.layout.nativeNode.event.neow.bubbleText=[-45,96,270,130];
 if(theme.officialAssets?.profile!=='official-assets-first-v1')throw Error('Missing official asset theme');
 theme.presentationProfile='official-assets-first';
 theme.cardSkin.text.body=theme.officialAssets.cardInk;
  theme.cardSkin.costText=theme.officialAssets.battleCostInk;
  theme.cardSkin.text.title=theme.officialAssets.battleCardTitleInk;
  const runHud=theme.officialAssets.battleHud;
  theme.layout.nativeNode.topBar.potions=[runHud.potionX+runHud.potionStep,runHud.y,runHud.potionStep*3,44];
  theme.cardSkin.battleCostText=theme.officialAssets.battleCostInk;
  theme.cardSkin.battleCostRingOpacity=theme.officialAssets.battleCostRingOpacity;
  theme.cardSkin.battleArtWells=theme.officialAssets.battleArtWells;
  theme.color.officialBackdropVeil=theme.officialAssets.backdropVeil;
  theme.color.topPanelHp='#EF7777';theme.color.topPanelGold='#F1CA67';
  for(const key of Object.keys(source.v25Battle.layout))theme.layout[key]=structuredClone(approved.layout[key]);
  for(const key of Object.keys(source.v25Battle.font))theme.font[key]=approved.font[key];
  Object.assign(theme.motion,source.v25Battle.motion);
  // One full illustration slot and five native body rows for every card;
  // long descriptions never borrow height from a single card's illustration.
  const content=theme.layout.card.v25Content,slots=theme.officialAssets.battleCardContent;
  theme.layout.card.art=slots.art;theme.layout.card.textBox=[...slots.textBox];
  content.bodyPosition=[...slots.bodyPosition];content.typePosition=[...slots.typePosition];
  for(const kind of ['attack','skill','power']){
   content.windows[kind].size[1]=slots.windowHeight;content.windows[kind].position=[...slots.windowPosition];
   content.icons[kind]=[...slots.iconPosition];
  }
  theme.layout.energy.faceColour='#FFE35D00';
  // The native sans glyph occupies more area than V25's serif. Owner's
  // device feedback calls for a quieter readout inside the unchanged 86px orb.
  theme.layout.energy.numberSize=26;
  theme.layout.cardDrag.aimDots=theme.officialAssets.battleAim.segments;
  theme.layout.cardDrag.aimBend=[...theme.officialAssets.battleAim.bend];
  // Existing exhaust-flight readers retain their historical topBar token path.
  const exhaust=theme.officialAssets.battleHud.exhaustPile.position;
  theme.layout.topBar.exhaustIcon[0]=exhaust[0];theme.layout.topBar.y=exhaust[1];
  theme.cardSkin.artWells=structuredClone(theme.officialAssets.battleArtWells);
  theme.cardSkin.typeInk=theme.officialAssets.battleTypePlaque.ink;
  // The frozen original maps starter/basic shells to the common silver frame.
  theme.cardSkin.rarities.basic=structuredClone(theme.cardSkin.rarities.common);
  theme.cardSkin.rarityWindow=true;
   theme.cardSkin.typePlate=theme.officialAssets.battleTypePlaque.plate;
   const {shelfColumns,...merchant}=theme.layout.merchant.official;
   Object.assign(theme.layout.merchant,structuredClone(merchant));
   theme.layout.nativeNode.shop.columns=[...shelfColumns];
  return theme;
}
function cardFace(face,theme){
 const art=theme.officialAssets;
 // The bottom role medallion is decoration, not a card state. Retain handles
 // for shared runtime writers while removing it from every official card host.
 for(const name of ['roleRing','roleMark'])required(face,name).visible=false;
 for(const name of ['roundShadow','roundFrame','roundBody']){
  const image=required(required(face,name),'flat');
   setImage(image,theme.image.rect,name==='roundBody'?art.cardBodyTint:undefined);
 }
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
  for(const [name,size]of [['tagEdge',art.battleTypePlaque.edgeSize],['tagBody',art.battleTypePlaque.bodySize]]){
   const tag=required(face,name),flat=required(tag,'flat');tag.size=[...size];flat.size=[...size];
   if(name==='tagBody'){flat.colour=theme.cardSkin.typePlate;flat.position=[...art.battleTypePlaque.bodyOffset];}
  }
  for(const kind of ['attack','skill','power']){
   const window=required(skin,kind),well=required(window,'well');
   // Leave a substantial inset frame around each type silhouette, rather than
   // the previous hairline. Scale only the well: icon and hit geometry stay put.
   well.scale=[.975,.965];
   for(const [index,scale]of [.95,.7,.45].entries())well.children.push({name:'nativeWindowLight'+index,kind:'image',position:[0,window.size[1]*.12],size:[window.size[0]*scale,window.size[1]*scale*.8],image:106056,imageType:'basic',colour:kind==='attack'?'#A94D47':'#C46A60',opacity:.14});
  }
 for(const name of ['label','description']){
  const text=child(face,name);if(text?.kind==='text')text.text.colour=art.cardInk;
 }
 setImage(required(face,'costCore'),art.images.battleCoin,'#FFD06A');
 // Preserve the animated, semantic cost ring and red/green cost deltas. The
// official medallion is a single untinted backing, never the dynamic number.
 const disc=required(face,'costCore');disc.size=[Math.min(...disc.size),Math.min(...disc.size)];
  disc.size=[34,34];disc.imageType='basic';
  const cost=required(face,'cost');cost.text.outline=true;cost.text.outlineColour='#4A2B27';cost.text.outlineOpacity=1;
  officialBattleCardChrome(face,theme);
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
function relicSurfaces(stage,theme){
 const bar=child(stage,'relicBar'),panel=child(stage,'relicPanel'),protectedHosts=new Set();
 if(bar){
  const style=theme.officialAssets.battleRelicBar;
  for(let i=1;i<=style.count;i++){
   const slot=required(bar,'slot'+i);slot.position=[style.origin[0]+style.step*(i-1),style.origin[1]];
   required(slot,'icon').size=[style.icon,style.icon];required(slot,'hit').size=[style.hit,style.hit];
   required(slot,'rim').visible=false;required(slot,'face').visible=false;
  }
 }
 if(panel)for(const host of [panel,...children(panel).filter(n=>/^row\d+$/.test(n.name))]){
  // The existing battle potion information window uses these same native
  // rectangle materials. Keep its live bounds and every read-only input owner.
  setImage(required(host,host===panel?'frame':'border'),theme.image.rect,theme.color.goldDim);
  setImage(required(host,'plate'),theme.image.rect,theme.color.panelSunken);protectedHosts.add(host);
 }
 return protectedHosts;
}
function panelSurfaces(node,theme,protectedHosts){
 // Keep all modal catchers, live field paths, sizes and visibility. Only replace
// large landscape image surfaces; do not stretch the landscape plaque into icons.
 if(node.kind!=='container'||protectedHosts?.has(node))return;
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
 preflightOfficialRoots(trees);
 let cardHosts=0,removedControls=0;
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
   const relicHosts=relicSurfaces(stage,theme);
   if(child(stage,'battlePanel')||child(stage,'endTurn')){
    applyV25BattleLayout(tree,theme);
    applyV25BattleChrome(tree,theme);
    applyV25TurnNoticeLayout(tree,theme);
    applyV25BattleScene(tree,theme);
    const battle=child(stage,'battlePanel')??stage;
    battleSurfaces(battle,theme);
    officialBattleHud(battle,theme);officialBattleUtilityFaces(stage,theme);
   }
   rebuildV25CardFaces(tree,theme);
   const result=compactBoundedCardFaces(tree,[],{preserveWindows:true});removedControls+=result.removedControls;
   walk(tree,node=>{
    // Several native 28px labels are only 44px high. Their formerly identical
    // preferred/minimum sizes leave no whole line in the real renderer. Keep
    // geometry and preferred sizes, and let the existing autosizer fit the text.
    if(node.kind==='text'&&node.text?.autoSize&&node.text.minFontSize*1.45+4>node.size?.[1])node.text.minFontSize=theme.font.minimum;
   if(child(node,'roundFrame')&&child(node,'skin')&&child(node,'costDisc')){cardFace(node,theme);cardHosts++;}
   else {buttonFaces(node,theme);panelSurfaces(node,theme,relicHosts);pageBackgrounds(node,theme);roomTextFits(node,theme);}
  });
  const pileReturn=child(child(tree,'stage')??tree,'deckPanel');
  if(child(pileReturn,'pileReturn'))battlePileReturn(child(pileReturn,'pileReturn'),true,theme.officialAssets.images.button,theme.officialAssets.buttonInk);
  const tools=child(pileReturn,'pileTools');
  if(tools)for(const control of children(tools)){
   const backing=child(control,'officialButtonBacking');if(backing)backing.visible=false;
  }
  composeOfficialRun(tree,theme);
 }
 finishOfficialComposition(trees);
 return {cardHosts,removedControls};
}
