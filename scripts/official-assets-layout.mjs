import {compactBoundedCardFaces} from './lightweight-card-layout.mjs';
import {applyV25BattleScene} from './v25-battle-scene.mjs';
import {applyV25BattleChrome} from './v25-battle-chrome.mjs';
import {applyV25TurnNoticeLayout} from './v25-turn-notice-layout.mjs';
import {v25Theme,applyV25BattleLayout} from './v25-layout.mjs';
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
  theme.color.officialBackdropVeil=theme.officialAssets.backdropVeil;
  for(const key of Object.keys(source.v25Battle.layout))theme.layout[key]=structuredClone(approved.layout[key]);
  for(const key of Object.keys(source.v25Battle.font))theme.font[key]=approved.font[key];
  Object.assign(theme.motion,source.v25Battle.motion);
  theme.cardSkin.artWells=structuredClone(approved.cardSkin.artWells);
  theme.cardSkin.typeInk=approved.cardSkin.typeInk;
  // The frozen original maps starter/basic shells to the common silver frame.
  theme.cardSkin.rarities.basic=structuredClone(theme.cardSkin.rarities.common);
  theme.cardSkin.rarityWindow=true;
  theme.cardSkin.typePlate=theme.cardSkin.rarities.common[4];
 return theme;
}
function cardFace(face,theme){
 const art=theme.officialAssets;
 for(const name of ['roundShadow','roundFrame','roundBody']){
  const image=required(required(face,name),'flat');
   setImage(image,art.images.cardPanel,name==='roundBody'?art.cardBodyTint:undefined);
 }
 for(const name of ['label','description']){
  const text=child(face,name);if(text?.kind==='text')text.text.colour=art.cardInk;
 }
 setImage(required(face,'costCore'),art.images.costDisc,'#FFFFFF');
 // Preserve the animated, semantic cost ring and red/green cost deltas. The
// official medallion is a single untinted backing, never the dynamic number.
 const disc=required(face,'costCore');disc.size=[Math.min(...disc.size),Math.min(...disc.size)];
}
function buttonFaces(node,theme){
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
 let cardHosts=0,removedControls=0;
  for(const tree of trees){
   const stage=child(tree,'stage')??tree;
   if(child(stage,'battlePanel')||child(stage,'endTurn')){
    applyV25BattleLayout(tree,theme);
    applyV25BattleChrome(tree,theme);
    applyV25TurnNoticeLayout(tree,theme);
    applyV25BattleScene(tree,theme);
   }
   const result=compactBoundedCardFaces(tree,[],{preserveWindows:true});removedControls+=result.removedControls;
   walk(tree,node=>{
    // Several native 28px labels are only 44px high. Their formerly identical
    // preferred/minimum sizes leave no whole line in the real renderer. Keep
    // geometry and preferred sizes, and let the existing autosizer fit the text.
    if(node.kind==='text'&&node.text?.autoSize&&node.text.minFontSize*1.45+4>node.size?.[1])node.text.minFontSize=theme.font.minimum;
   if(child(node,'roundFrame')&&child(node,'skin')&&child(node,'costDisc')){cardFace(node,theme);cardHosts++;}
   else {buttonFaces(node,theme);panelSurfaces(node,theme);pageBackgrounds(node,theme);roomTextFits(node,theme);}
  });
 }
 return {cardHosts,removedControls};
}
