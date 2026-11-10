import test from 'node:test';
import assert from 'node:assert/strict';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {applyOfficialAssets,officialAssetsTheme} from '../scripts/official-assets-layout.mjs';
import {battleLayout} from '../scripts/ui-layout.mjs';
const children=n=>n.controls??n.children??[];
const child=(n,key)=>children(n).find(c=>c.name===key);
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
 assert.equal(theme.cardSkin.costText,'#FFF8E7','cost numbers must contrast with their dark medallions');
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
 assert.equal(theme.cardSkin.artWells.attack,'#551C24');
 assert.equal(theme.cardSkin.artWells.skill,'#1A3042');
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
