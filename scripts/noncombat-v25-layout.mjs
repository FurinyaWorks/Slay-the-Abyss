// Reuse the frozen V25 page layout and existing input paths. Native textures
// replace bounded decorative surfaces; no new page owner or image rasterizer.
import {applyV25MenuLayout} from './v25-menu-layout.mjs';
import {applyV25CharacterLayout} from './v25-character-layout.mjs';
const parts=n=>n?.controls??n?.children??[];
const child=(n,name)=>parts(n).find(c=>c.name===name);
export function applyOfficialNoncombatLayout(layout,theme){
 const stage=child(layout,'stage')??layout;
 if(!child(stage,'menuPanel')||!child(stage,'characterPanel'))return layout;
 const start=child(child(stage,'menuPanel'),'start');
 if(!child(start,'officialResultLabel'))start.children.push({...structuredClone(child(start,'label')),name:'officialResultLabel',visible:false});
 applyV25MenuLayout(layout,theme);
 const characterTheme={...theme,v25Character:{...theme.v25Character,story:theme.v25Character?.story?.replaceAll('\\n','\n')}};
 applyV25CharacterLayout(layout,characterTheme,{nativeFlagImage:theme.officialAssets.images.button});
 const panel=child(stage,'characterPanel'),selected=child(child(panel,'v25Roster'),'selected');
 for(const key of ['confirm','cancel'])for(const state of parts(child(child(panel,key),'hit'))){
  const ink=state.name==='disabled'?theme.color.textMuted:theme.officialAssets.buttonInk;
  const tint=state.name==='disabled'?theme.color.textMuted:'#FFFFFF';
  child(state,'label').text.colour=ink;
  const plate=child(state,'plate');plate.colour=tint;plate.size=[...state.size];
  child(state,'border').colour=theme.officialAssets.buttonBacking;
  const cloth=child(child(state,'v25Flag'),'cloth');cloth.colour=tint;
  cloth.opacity=state.name==='pressed'?.78:state.name==='hover'?1:.92;
 }
 // The private constellation bitmap cannot be imported as a native texture.
 // Keep the reviewed badge footprint and use the existing official geo symbol.
 selected.children.push({name:'officialGeoBadge',kind:'image',position:[0,0],size:[88,88],image:theme.icon.geo,colour:'#FFE0A2'});
 const background=child(panel,'v25Background');
 background.visible=true; background.children=[{name:'landscape',kind:'image',position:[0,0],size:[1280,720],image:theme.image.officialBackdrops.title,colour:'#FFFFFF'},
  {name:'veil',kind:'image',position:[0,0],size:[1280,720],image:theme.image.rect,colour:'#101824',opacity:.35}];
 // The native figure controller owns this host's readiness and presentation.
 // Preserve its established scale instead of enlarging a 133px raster 10x.
 const figure=child(child(panel,'details'),'officialSelectionFigure');
 if(figure){figure.position=[270,-20];figure.size=[133,133];figure.scale=[1,1];}
 child(child(panel,'details'),'portraitNote').visible=false;
 return layout;
}
