// Reuse the frozen V25 page layout and existing input paths. Native textures
// replace bounded decorative surfaces; no new page owner or image rasterizer.
import {applyV25MenuLayout} from './v25-menu-layout.mjs';
import {applyV25CharacterLayout} from './v25-character-layout.mjs';
import {lightweightAssets} from './art/lightweight-2d-assets.mjs';
const parts=n=>n?.controls??n?.children??[];
const child=(n,name)=>parts(n).find(c=>c.name===name);
export const selectedPixelAvatarSource=Object.freeze({asset:'battlePixel',source:'scripts/art/lightweight-2d-assets.mjs#travelerRows',
 sourceSha256:'b396f1af9e5c259fab4b63f973f184ffee3612404a8abc993d65fe698e8a65e0',firstShape:40,count:17,displaySize:118});
function selectedPixelAvatar(){
 const asset=lightweightAssets().battle133,source=selectedPixelAvatarSource;
 if(asset.sourceSha256!==source.sourceSha256||asset.count!==57)throw Error('Selected avatar must use the reviewed battlePixel figure');
 // travelerRows is back-to-front: indices 0..39 are body/hands/sword, while
 // 40..56 are precisely the head, fringe, flower and eyes used in combat.
 const rows=asset.rows.slice(source.firstShape,source.firstShape+source.count);
 const bounds=[Math.min(...rows.map(r=>r[1]-r[3]/2)),Math.max(...rows.map(r=>r[1]+r[3]/2)),
  Math.min(...rows.map(r=>r[2]-r[4]/2)),Math.max(...rows.map(r=>r[2]+r[4]/2))];
 const cx=(bounds[0]+bounds[1])/2,cy=(bounds[2]+bounds[3])/2,scale=100/Math.max(bounds[1]-bounds[0],bounds[3]-bounds[2]);
 return {name:'selectedPixelAvatar',kind:'container',position:[0,0],size:[118,118],visible:true,focusable:false,
  children:rows.map((r,i)=>({name:'head'+(source.firstShape+i),kind:'image',image:r[0],position:[(r[1]-cx)*scale,(r[2]-cy)*scale],
   size:[r[3]*scale,r[4]*scale],colour:'#'+r.slice(14,17).map(c=>c.toString(16).padStart(2,'0')).join(''),opacity:r[17]/255,visible:true,focusable:false}))};
}
export function applyOfficialNoncombatLayout(layout,theme){
 const stage=child(layout,'stage')??layout;
 if(!child(stage,'menuPanel')||!child(stage,'characterPanel'))return layout;
 const start=child(child(stage,'menuPanel'),'start');
 if(!child(start,'officialResultLabel'))start.children.push({...structuredClone(child(start,'label')),name:'officialResultLabel',visible:false});
 applyV25MenuLayout(layout,theme);
 const characterTheme={...theme,v25Character:{...theme.v25Character,story:theme.v25Character?.story?.replaceAll('\\n','\n')}};
 applyV25CharacterLayout(layout,characterTheme);
 const panel=child(stage,'characterPanel'),selected=child(child(panel,'v25Roster'),'selected');
 // The user approved the existing pixel character's head in the selected slot.
 // Keep the optional private mask host untouched and reuse 17 static shapes.
 selected.children.splice(selected.children.indexOf(child(selected,'spark')),0,selectedPixelAvatar());
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
