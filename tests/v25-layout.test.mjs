import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {withViewport} from '../scripts/viewport-layout.mjs';
import {v25Theme,applyV25BattleLayout,rebuildV25CardFaces} from '../scripts/v25-layout.mjs';
import {applyV25MenuLayout} from '../scripts/v25-menu-layout.mjs';
import {applyV25TurnNoticeLayout} from '../scripts/v25-turn-notice-layout.mjs';
import {assertNativeUiCapacity} from '../scripts/build-ui.mjs';
import {cardFaceChildren} from '../scripts/card-face.mjs';

test('V25 card windows follow the final CSS geometry rather than earlier generic cards',()=>{
 const theme=v25Theme(nativeTheme),face=cardFaceChildren(theme,'battle'),find=(nodes,name)=>nodes.find(n=>n.name===name);
 const skin=find(face,'skin');
 for(const kind of ['attack','skill']){
  const window=find(skin.children,kind);
  assert.deepEqual(window.position,[0,32.5625]);assert.deepEqual(window.size,[126,86.09375]);
 }
 const attack=find(skin.children,'attack').children.find(n=>n.name==='well');
 assert.equal(find(attack.children,'upper').size[1],(86.09375-3)*.78);
 const power=find(skin.children,'power'),well=find(power.children,'well');
 assert.deepEqual(power.position,[0,43.578125]);assert.deepEqual(power.size,[129,112.34375]);
 assert.deepEqual(find(well.children,'arch').size,[126,109.34375]);assert.equal(find(well.children,'base').visible,false);
 assert.deepEqual(find(face,'art').position,[0,36.875]);
 assert.deepEqual(find(face,'label').position,[0,-59.8515625]);
 assert.deepEqual(find(face,'type').position,[0,-14.6953125]);
 assert.deepEqual(find(face,'cost').position,[-66.5078125,95]);
 assert.equal(theme.cardSkin.artWells.attack,'#551C24');assert.equal(theme.cardSkin.artWells.skill,'#1A3042');assert.equal(theme.cardSkin.artWells.power,'#252536');
 assert.equal(theme.cardSkin.text.body,'#FFF6E2');
 assert.equal(find(face,'name').text.valign,'top');assert.equal(find(face,'label').text.valign,'top');
 assert.equal(find(cardFaceChildren(nativeTheme,'battle'),'label').text.valign,'middle');
});

test('native preflight rejects alpha baked into RGB fields before a GIL is written',()=>{
 for(const control of [
  {name:'image',kind:'image',colour:'#03080CCD'},
  {name:'text',kind:'text',text:{colour:'#000000CC'}},
 ])assert.throws(()=>assertNativeUiCapacity(control),/colour.*six|colour.*rrggbb/i);
 assertNativeUiCapacity({name:'image',kind:'image',colour:'#03080C',opacity:205/255});
 assertNativeUiCapacity({name:'text',kind:'text',text:{colour:'#000000',opacity:204/255}});
});

test('V25 turn notice is a fixed noninteractive layer and leaves the action timing unchanged',()=>{
 const theme=v25Theme(nativeTheme),layout=withViewport(gameLayout(),nativeTheme);
 const all=n=>[n,...(n.controls??n.children??[]).flatMap(all)];
 const before=all(layout),inputs=before.filter(n=>['cursorArea','presetButton'].includes(n.kind));
 applyV25TurnNoticeLayout(layout,theme);
 const notice=all(layout).find(n=>n.name==='v25TurnNotice');
 assert(notice);assert.equal(notice.visible,false);
 assert.deepEqual(notice.position,[0,43]);assert.deepEqual(notice.size,[1280,100]);
 assert.equal(theme.layout.v25TurnNotice.duration,1.7);
 assert.deepEqual(theme.motion.banner,nativeTheme.motion.banner);
 assert.deepEqual(all(layout).filter(n=>['cursorArea','presetButton'].includes(n.kind)),inputs);
 assertNativeUiCapacity(layout);
 const frozen=structuredClone(layout);
 assert.throws(()=>applyV25TurnNoticeLayout(layout,theme),/already/);assert.deepEqual(layout,frozen);
});
test('V25 tokens preserve the source theme while freezing original battle coordinates',()=>{
 const before=structuredClone(nativeTheme),t=v25Theme(nativeTheme);
 assert.deepEqual(nativeTheme,before);
 assert.deepEqual(t.layout.player.position,[-324,-37]);
 assert.equal(t.layout.player.portrait,210);
 assert.deepEqual(t.layout.endTurn.size,[143,56]);
 assert.deepEqual(t.layout.card.size,[150,210]);
 assert.equal(t.layout.enemyRow.floorY,330);
});

test('V25 menu keeps the real start transaction and presents unavailable entries without fake actions',()=>{
 const layout=withViewport(gameLayout(),nativeTheme),stage=layout.controls.find(n=>n.name==='stage');
 const menu=stage.children.find(n=>n.name==='menuPanel'),start=menu.children.find(n=>n.name==='start'),hit=start.children.find(n=>n.name==='hit');
 applyV25MenuLayout(layout,v25Theme(nativeTheme));
 assert.equal(start.children.find(n=>n.name==='hit'),hit);assert.equal(hit.kind,'cursorArea');
 const chrome=menu.children.find(n=>n.name==='v25MainMenu');
 const walk=n=>[n,...(n.children??[]).flatMap(walk)];
 assert.ok(!walk(chrome).some(n=>['cursorArea','presetButton'].includes(n.kind)));
 assert.equal(menu.children.find(n=>n.name==='titleQuit').children.find(n=>n.name==='hit').kind,'cursorArea');
 assert.equal(start.children.find(n=>n.name==='v25MenuFace').children.length,4);
});
test('shared V25 faces retain node-specific Match and Keep backs and input identity',()=>{
 const layout=gameLayout(),t=v25Theme(nativeTheme);
 const at=path=>path.reduce((node,name)=>(node.controls??node.children).find(n=>n.name===name),layout);
 const card=at(['nodePanel','pickerView','forgeGrid','card1']);
 const back=card.children.find(n=>n.name==='matchBack'),hit=card.children.find(n=>n.name==='hit');
 assert(back);assert(hit);
 rebuildV25CardFaces(layout,t);
 assert.equal(card.children.find(n=>n.name==='matchBack'),back);
 assert.equal(card.children.find(n=>n.name==='hit'),hit);
});
test('battle reflow shares tokens with runtime and retains ten live faces and hits',()=>{
 const layout=withViewport(gameLayout(),nativeTheme),t=v25Theme(nativeTheme);
 const stage=layout.controls.find(n=>n.name==='stage'),battle=stage.children.find(n=>n.name==='battlePanel');
 const hero=battle.children.find(n=>n.name==='hero'),hit=hero.children.find(n=>n.name==='hit');
 const menu=structuredClone(stage.children.find(n=>n.name==='menuPanel'));
 applyV25BattleLayout(layout,t);
 assert.equal(hero.children.find(n=>n.name==='hit'),hit);
 assert.deepEqual(hero.position,t.layout.player.position);
 assert.deepEqual(battle.children.find(n=>n.name==='endTurn').position,t.layout.endTurn.position);
 for(let i=1;i<=10;i++){
  const card=battle.children.find(n=>n.name==='card'+i);
  assert.deepEqual(card.size,[150,210]);
  for(const name of ['hit','name','cost','label'])assert(card.children.find(n=>n.name===name));
 }
 assert.deepEqual(stage.children.find(n=>n.name==='menuPanel'),menu);
});
