import {cardFaceChildren} from './card-face.mjs';
import {v25MenuRuntimeLayout} from './v25-menu-layout.mjs';
import {v25ResultRuntimeLayout} from './v25-result-layout.mjs';
import {v25NodeThemePatch} from './v25-node-layout.mjs';

function merge(base,patch){
 for(const [key,value] of Object.entries(patch)){
  if(value&&typeof value==='object'&&!Array.isArray(value))base[key]=merge(base[key]??{},value);
  else base[key]=structuredClone(value);
 }
 return base;
}
export function v25Theme(source){
 if(source.v25Battle?.sourceCommit!=='7e40d2d361fff6b9c89d9f409db29a9d8ac44352')throw Error('Missing frozen V25 battle tokens');
 const theme=merge(structuredClone(source),source.v25Battle);
 merge(theme,v25NodeThemePatch);
 // Room-only tokens must not enter the shared battle profile enumeration.
 merge(theme.layout.nativeNode,source.v25Nodes??{});
 theme.layout.v25Menu=structuredClone(v25MenuRuntimeLayout);
 theme.layout.v25Result=structuredClone(v25ResultRuntimeLayout);
 return theme;
}
const children=node=>node.children??node.controls??[];
function rootOf(layout){
 const stage=children(layout).find(n=>n.name==='stage');
 return children(layout).find(n=>n.name==='battlePanel')??(stage&&(children(stage).find(n=>n.name==='battlePanel')??stage));
}
function child(node,name){
 const control=children(node).find(n=>n.name===name);
 if(!control)throw Error('V25 layout missing '+name);
 return control;
}
function oneLineTextBox(control){
 // Native text needs transparent vertical room beyond its glyph line. Preserve
 // the reviewed centre, width and typography; only remove evidenced clipping.
 control.size[1]=Math.max(control.size[1],control.text.fontSize*2);
}
export function rebuildV25CardFaces(node,theme){
 const parts=children(node);
 if(parts.some(n=>n.name==='skin')&&parts.some(n=>n.name==='cost')&&parts.some(n=>n.name==='name')){
  const interactive=parts.some(n=>n.name==='hit');
  const context=parts.some(n=>n.name==='description')?'node':interactive?'battle':'deck';
  const rebuilt=cardFaceChildren(theme,context,interactive),names=new Set(rebuilt.map(item=>item.name));
  node.children=rebuilt.map(item=>{
   const old=parts.find(part=>part.name===item.name);
   return old&&['text','cursorArea'].includes(item.kind)?Object.assign(old,item):item;
  });
  for(const extra of parts.filter(item=>!names.has(item.name))){
   const next=parts.slice(parts.indexOf(extra)+1).find(item=>names.has(item.name));
   const index=next?node.children.findIndex(item=>item.name===next.name):node.children.length;
   node.children.splice(index,0,extra);
  }
  if(theme.presentationProfile==='v25-reference')oneLineTextBox(child(node,'cost'));
  node.size=[...theme.layout.card.size];
  return;
 }
 for(const item of parts)rebuildV25CardFaces(item,theme);
}
export function applyV25BattleLayout(layout,theme){
 const root=rootOf(layout);if(!root)throw Error('V25 layout requires a battle root');
 if(theme.presentationProfile==='v25-reference')for(const name of ['title','player','piles'])oneLineTextBox(child(root,name));
 const l=theme.layout,hero=child(root,'hero'),energy=child(root,'energyIcon');
 hero.position=[...l.player.position];
  // The V25 resting pose names the player in the HUD; a second line at the feet
  // would overlap its thin health bar. The existing detail hit remains intact.
  child(hero,'name').visible=false;
  child(hero,'hp').text.fontSize=14;child(hero,'hp').text.minFontSize=14;
 child(hero,'hit').size=[l.player.portrait,l.player.portrait];
 for(const name of ['portrait','impact','shield'])child(hero,name).size=[l.player.portrait,l.player.portrait];
 const healthY=-l.player.portrait/2-l.battleUnit.heroHealthGap-l.hpBar.size[1]/2;
 for(const name of ['hpBorder','hpTrack','hpGhost','hpFill','hp']){
  const node=child(hero,name);node.position=[0,healthY];
  if(name!=='hp')node.size=[...l.hpBar.size];
 }
 for(const name of ['energyRing','energyDisc','energyIcon','energy'])child(root,name).position=[...l.energy.position];
 child(root,'energyRing').size=[l.energy.size,l.energy.size];
 child(root,'energyDisc').size=[l.energy.size-4,l.energy.size-4];
 energy.size=[l.energy.size,l.energy.size];
 for(const node of [child(root,'energy'),child(energy,'valueShadow')]){
  node.text.fontSize=l.energy.numberSize;node.text.minFontSize=l.energy.numberSize;
 }
 const turn=child(root,'endTurn');turn.position=[...l.endTurn.position];turn.size=[...l.endTurn.size];
 for(const state of turn.children){
  state.size=[...turn.size];const label=child(state,'label');
  label.size=[turn.size[0]-14,turn.size[1]-8];label.text.fontSize=l.endTurn.numberSize;label.text.minFontSize=l.endTurn.numberSize;
 }
 for(const [kind,sign]of [['draw',1],['discard',-1]]){
  const position=[l.drawPile.position[0]*sign,l.drawPile.position[1]];
  const pile=child(root,kind+'Icon');pile.position=position;pile.size=[...l.drawPile.size];
  const hit=child(pile,'hit');hit.position=[0,0];hit.size=[...l.drawPile.size];
  for(const suffix of ['Badge','BadgeRing','']){
   const node=child(root,kind+suffix),v=l.pileBadge.visual;
   node.position=[position[0]+sign*v.offset[0],position[1]+v.offset[1]];
   node.size=suffix?[v.diameter,v.diameter]:[v.textWidth,theme.layout.nativeText.lineHeight];
  }
  child(root,kind+'Label').text.content='';
 }
 rebuildV25CardFaces(root,theme);
 return layout;
}
