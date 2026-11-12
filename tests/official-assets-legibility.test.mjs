import test from 'node:test';
import assert from 'node:assert/strict';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {applyOfficialAssets,officialAssetsTheme} from '../scripts/official-assets-layout.mjs';
import {battleLayout} from '../scripts/ui-layout.mjs';
import {deckCardTemplate} from '../scripts/deck-ui-layout.mjs';
const children=n=>n.controls??n.children??[];
const child=(n,key)=>children(n).find(c=>c.name===key);
const all=n=>[n,...children(n).flatMap(all)];
test('official battle HUD can render at least one full native text line without hiding its values',()=>{
 const layout=gameLayout(),theme=officialAssetsTheme(nativeTheme);applyOfficialAssets([layout],theme);
 const battle=child(layout,'battlePanel');
 for(const key of ['player','piles','title']){
  const n=child(battle,key),minimum=n.text.minFontSize;
  assert(n.text.autoSize&&minimum*1.45+4<=n.size[1],key+' has no fitting native text size');
 }
});
test('official dark buttons retain light ink and cover their whole native hit surface with the same material',()=>{
 const layout=gameLayout(),theme=officialAssetsTheme(nativeTheme);applyOfficialAssets([layout],theme);
 const hit=child(child(child(layout,'characterPanel'),'confirm'),'hit');
 for(const state of ['normal','hover','pressed']){
  const face=child(hit,state);
  assert.equal(child(face,'plate').colour,'#FFFFFF');
  assert.equal(child(face,'label').text.colour,'#FFF8E7');
  assert.equal(child(face,'border').colour,'#17252D');
  assert.deepEqual(child(face,'plate').size,face.size);
 }
});
test('official cost medallions pair the selected light material with neutral dark ink across card hosts',()=>{
 const source=JSON.stringify(nativeTheme),theme=officialAssetsTheme(nativeTheme);
 const layout=gameLayout(),template=deckCardTemplate();applyOfficialAssets([layout,template],theme);
 // 5b3e9f11 replaced dark 107202 with light 107270. Bind both sides of that
 // material/ink choice; this is a source contract, not measured texture contrast.
 assert.equal(theme.officialAssets.images.costDisc,107270);
 assert.equal(theme.cardSkin.costText,'#FFF8D8');
 assert.equal(theme.cardSkin.battleCostText,'#FFF8D8');
 const battleCards=new Set(all(child(layout,'battlePanel')).filter(n=>child(n,'roundFrame')&&child(n,'costDisc')));
 assert.equal(battleCards.size,10);
 const cards=[...all(layout),...all(template)].filter(n=>child(n,'roundFrame')&&child(n,'costDisc'));
 assert(cards.length>=40);
 for(const card of cards){
  const core=child(card,'costCore');
  assert.equal(core.image,107203,card.name+' shared cost material');
  assert.equal(core.colour,'#FFD06A',card.name+' shared cost tint');
  assert(child(card,'nativeRibbon')&&child(card,'nativeCardBody')&&child(card,'nativeCostOrb'),card.name+' shares battle chrome');
  assert.equal(core.size[0],core.size[1],card.name+' cost material must remain circular');
 }
 assert.deepEqual(theme.cardSkin.costTone,nativeTheme.cardSkin.costTone,'red/green cost semantics');
 assert.equal(JSON.stringify(nativeTheme),source,'candidate must not change the legacy theme');
});
test('official battle reuses the approved complete V25 architecture instead of stretched pillar icons',()=>{
 const layout=gameLayout(),theme=officialAssetsTheme(nativeTheme);applyOfficialAssets([layout],theme);
 const scenes=child(layout,'officialBattleBackdrop');
 for(const key of ['act1_1','act1_2','act1_3','act2_1','act2_2','act2_3','boss1','boss2']){
  const scene=child(scenes,key);assert.equal(scene.kind,'container');assert.equal(scene.visible,false);
  assert.equal(children(scene).length,0,key+' retains the superseded icon scenery');
 }
 const foreground=child(child(layout,'battlePanel'),'v25BattleScene');assert(foreground);
 assert(child(foreground,'gate')&&child(foreground,'floor')&&child(foreground,'perspective'));
});
test('approved card inner frames retain their point/rounded silhouettes and unchanged illustration identities',()=>{
 const layout=gameLayout(),theme=officialAssetsTheme(nativeTheme);applyOfficialAssets([layout],theme);
 const card=child(child(layout,'battlePanel'),'card1'),skin=child(card,'skin');
 const attack=child(child(skin,'attack'),'edge');
 assert.deepEqual(children(attack).map(n=>n.name),['upper','point']);
 assert.equal(child(attack,'point').rotation,180);
 const skill=child(child(skin,'skill'),'edge');
 assert(children(skill).some(n=>n.name==='corner-1_-1'));
 assert(!children(skill).some(n=>n.name==='flat'));
 assert.deepEqual(theme.cardSkin.artWells,theme.officialAssets.battleArtWells);
 assert.deepEqual(theme.icon.cardPortraits,nativeTheme.icon.cardPortraits);
 assert.deepEqual(theme.icon.cardArt,nativeTheme.icon.cardArt);
 assert.deepEqual(theme.cardSkin.rarities.basic,nativeTheme.cardSkin.rarities.common);
});
test('standalone battle output receives the same geometry and required turn-notice tree',()=>{
 const layout=battleLayout(),theme=officialAssetsTheme(nativeTheme);applyOfficialAssets([layout],theme);
 const stage=child(layout,'stage')??layout;
 assert.deepEqual(child(stage,'card1').size,[150,210]);
 assert(child(child(stage,'feedback'),'v25TurnNotice'));
 assert(child(stage,'v25BattleScene'));
});
test('generic disabled buttons remain visibly distinct from enabled buttons',()=>{
 const layout=gameLayout(),theme=officialAssetsTheme(nativeTheme);applyOfficialAssets([layout],theme);
 const hit=child(child(child(layout,'characterPanel'),'confirm'),'hit');
 const enabled=child(hit,'normal'),disabled=child(hit,'disabled');
 assert.equal(child(disabled,'label').text.colour,nativeTheme.color.textMuted);
 assert.notEqual(child(disabled,'label').text.colour,child(enabled,'label').text.colour);
 assert.notEqual(child(disabled,'plate').colour,child(enabled,'plate').colour);
});

test('run pages share the final battle bar without copied inputs or a covering legacy header',()=>{
 const theme=officialAssetsTheme(nativeTheme),layout=gameLayout(theme);applyOfficialAssets([layout],theme);
 const battle=child(layout,'battlePanel'),hud=theme.officialAssets.battleHud;
 const original=structuredClone(child(battle,'topBar'));original.name='officialRunBar';
 original.children=children(original).filter(part=>part.name!=='battleRoute');
 for(const name of ['mapPanel','nodePanel']){
  const page=child(layout,name),bar=child(page,'officialRunBar'),resources=child(page,'resources')??page;
  assert.deepEqual(bar,original,name+' shares the canonical bar');
  assert(!all(bar).some(control=>control.kind==='cursorArea'),name+' has no unbound cloned receiver');
  for(const control of all(page).filter(control=>['headerShade','headerDivider','titleLineLeft','titleLineRight'].includes(control.name)))assert.equal(control.visible,false,name+'/'+control.name);
  for(const [key,reference]of [['hp','player'],['gold','piles']]){
   assert.deepEqual(child(resources,key).position,hud[key].slice(0,2));
   assert.equal(child(resources,key).text.colour,child(battle,reference).text.colour);
  }
 }
 assert.equal(child(child(layout,'potionEntry'),'open').position[1],hud.y);
});
