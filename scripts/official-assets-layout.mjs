import {compactBoundedCardFaces} from './lightweight-card-layout.mjs';
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
 if(theme.officialAssets?.profile!=='official-assets-first-v1')throw Error('Missing official asset theme');
 theme.presentationProfile='official-assets-first';
 theme.cardSkin.text.body=theme.officialAssets.cardInk;
 theme.cardSkin.costText=theme.officialAssets.cardInk;
 return theme;
}
function cardFace(face,theme){
 const art=theme.officialAssets;
 for(const name of ['roundShadow','roundFrame','roundBody']){
  const image=required(required(face,name),'flat');
  setImage(image,art.images.cardPanel,name==='roundBody'?'#FFFFFF':undefined);
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
   if(plate?.kind==='image')setImage(plate,theme.officialAssets.images.button);
  }
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
function pageBackgrounds(node,theme){
 const ids=theme.image.officialBackdrops;
 if(node.name==='menuPanel')setImage(required(node,'backdrop'),ids.title,'#FFFFFF');
 if(node.name==='nodePanel'){
  const backdrop=child(node,'backdrop');if(backdrop)setImage(backdrop,ids.act1_3,'#FFFFFF');
 }
 if(node.name==='mapPanel'){
  const backdrop=child(node,'backdrop');if(backdrop?.kind==='image')setImage(backdrop,ids.selection,'#FFFFFF');
 }
}
export function applyOfficialAssets(trees,theme){
 if(!Array.isArray(trees)||!trees.length)throw Error('Official assets require layout trees');
 const images=theme.officialAssets?.images;
 if(!images||Object.values(images).some(id=>!Number.isSafeInteger(id)||id<=0))throw Error('Invalid official image manifest');
 let cardHosts=0,removedControls=0;
 for(const tree of trees){
  const result=compactBoundedCardFaces(tree);removedControls+=result.removedControls;
  walk(tree,node=>{
   if(child(node,'roundFrame')&&child(node,'skin')&&child(node,'costDisc')){cardFace(node,theme);cardHosts++;}
   else {buttonFaces(node,theme);panelSurfaces(node,theme);pageBackgrounds(node,theme);}
  });
 }
 return {cardHosts,removedControls};
}
