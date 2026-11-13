import test from 'node:test';
import assert from 'node:assert/strict';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {withViewport} from '../scripts/viewport-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {officialAssetsTheme} from '../scripts/official-assets-layout.mjs';
import {attachOfficialPortraits} from '../scripts/official-portraits.mjs';
import {applyOfficialNoncombatLayout} from '../scripts/noncombat-v25-layout.mjs';
const parts=n=>n?.controls??n?.children??[],child=(n,name)=>parts(n).find(c=>c.name===name);
const all=n=>[n,...parts(n).flatMap(all)];
test('official menu and selection reuse live inputs with bounded native decoration',()=>{
 const theme=officialAssetsTheme(nativeTheme),layout=withViewport(gameLayout(),theme);
 attachOfficialPortraits(layout,{selectionAvatar:true,battlePortrait:true});
 const stage=child(layout,'stage')??layout,menu=child(stage,'menuPanel'),panel=child(stage,'characterPanel');
 const start=child(child(menu,'start'),'hit'),confirm=child(child(panel,'confirm'),'hit'),modal=child(panel,'deckView');
 const resultLabel=structuredClone(child(child(menu,'start'),'label'));
 const oldBattle=JSON.stringify(child(stage,'battlePanel'));
 applyOfficialNoncombatLayout(layout,theme);
 assert.equal(child(child(menu,'start'),'hit'),start);
 assert.equal(child(child(panel,'confirm'),'hit'),confirm);
 assert.equal(parts(panel).at(-1),modal);
 assert.equal(JSON.stringify(child(stage,'battlePanel')),oldBattle);
 assert.equal(child(menu,'vista').visible,false);
 assert.equal(child(menu,'emblem').visible,false);
 assert.deepEqual(child(menu,'start').position,[-450,-170]);
 assert.equal(child(menu,'title').visible,false,'the approved minimalist menu omits the game title');
 assert.deepEqual(child(child(menu,'start'),'officialResultLabel'),{...resultLabel,name:'officialResultLabel',visible:false});
 const fills={cancel:{normal:'#8C3739',hover:'#A54143',pressed:'#813334',disabled:'#8C3739'},
  confirm:{normal:'#477B89',hover:'#5491A2',pressed:'#41717E',disabled:'#477B89'}};
 for(const key of ['confirm','cancel'])for(const state of parts(child(child(panel,key),'hit'))){
  const flag=child(state,'v25Flag'),cloth=child(flag,'cloth'),rim=child(flag,'rim');
  assert(rim&&cloth,'approved flag has separate irregular rim and cloth');
  assert(parts(cloth).length<=30);assert(parts(rim).length<=30);
  for(const band of parts(cloth)){assert.equal(band.image,theme.image.rect);assert.equal(band.colour,fills[key][state.name]);}
  assert.equal(child(state,'label').text.colour,state.name==='disabled'?theme.color.textMuted:theme.officialAssets.buttonInk,'shared official button ink preserves disabled distinction');
  assert.equal(child(state,'plate').visible,false);assert.equal(child(state,'border').visible,false);
  assert.equal(all(flag).some(n=>n.image===theme.officialAssets.images.button),false,'official rectangle must not replace original flag');
 }
 assert.equal(child(panel,'v25Background').visible,true);
 assert.equal(all(panel).filter(n=>n.name==='officialGeoBadge').length,0,'the selected character must not become an unrelated geo icon');
 const constellation=child(child(child(panel,'v25Roster'),'selected'),'v25Constellation');
 assert.equal(constellation.visible,false);assert.equal(parts(constellation).length,0);
 const initial=child(selectedSlot(panel),'selectedInitial');
 assert(initial.visible);assert.equal(initial.kind,'text');assert.equal(initial.text.content,'荧');
 assert.equal(child(selectedSlot(panel),'selectedPixelAvatar'),undefined);
 const details=child(panel,'details'),bag=child(details,'v25GoldIcon');
 assert.equal(bag.kind,'container');assert.equal(all(bag).some(n=>n.image===theme.icon.gold),false,'approved grey money bag must not become a round coin');
 assert(all(bag).filter(n=>n.kind==='image').every(n=>n.image===theme.image.rect));
 assert.equal(child(bag,'bag').children[0].colour,'#D1D0BD');
 assert.equal(child(selectedSlot(panel),'innerFrame0').colour,'#957749');
 assert.deepEqual(child(child(panel,'details'),'officialSelectionFigure').scale,[1,1]);
});
function selectedSlot(panel){return child(child(panel,'v25Roster'),'selected');}

test('release selection placeholder is one readable glyph and reuses the selected frame',()=>{
 const theme=officialAssetsTheme(nativeTheme),layout=withViewport(gameLayout(),theme);applyOfficialNoncombatLayout(layout,theme);
 const panel=child(child(layout,'stage')??layout,'characterPanel'),slot=selectedSlot(panel),initial=child(slot,'selectedInitial');
 assert.deepEqual(slot.size,[124,124]);assert(child(slot,'rim'));
 assert.deepEqual(initial.position,[0,0]);assert.deepEqual(initial.size,[104,108]);
 assert.equal(initial.text.fontSize,54);assert.equal(initial.text.minFontSize,54);
 assert.equal(initial.text.align,'centre');assert.equal(initial.text.valign,'middle');
 assert.equal(initial.text.colour,'#FFE0A2');assert.equal(initial.focusable,false);assert.equal(parts(initial).length,0);
 applyOfficialNoncombatLayout(layout,theme);
 assert.equal(parts(selectedSlot(panel)).filter(n=>n.name==='selectedInitial').length,1);
});
