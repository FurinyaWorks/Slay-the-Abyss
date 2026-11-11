import test from 'node:test';
import assert from 'node:assert/strict';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {withViewport} from '../scripts/viewport-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {officialAssetsTheme} from '../scripts/official-assets-layout.mjs';
import {attachOfficialPortraits} from '../scripts/official-portraits.mjs';
import {applyOfficialNoncombatLayout,selectedPixelAvatarSource} from '../scripts/noncombat-v25-layout.mjs';
import {lightweightAssets} from '../scripts/art/lightweight-2d-assets.mjs';
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
 assert.deepEqual(child(menu,'start').position,[-430,-71]);
 assert.deepEqual(child(child(menu,'start'),'officialResultLabel'),{...resultLabel,name:'officialResultLabel',visible:false});
 const fills={cancel:{normal:'#8C3739',hover:'#A54143',pressed:'#813334',disabled:'#8C3739'},
  confirm:{normal:'#477B89',hover:'#5491A2',pressed:'#41717E',disabled:'#477B89'}};
 for(const key of ['confirm','cancel'])for(const state of parts(child(child(panel,key),'hit'))){
  const flag=child(state,'v25Flag'),cloth=child(flag,'cloth'),rim=child(flag,'rim');
  assert(rim&&cloth,'approved flag has separate irregular rim and cloth');
  assert(parts(cloth).length<=30);assert(parts(rim).length<=30);
  for(const band of parts(cloth)){assert.equal(band.image,theme.image.rect);assert.equal(band.colour,fills[key][state.name]);}
  assert.equal(child(state,'label').text.colour,'#FFF0B1');
  assert.equal(child(state,'plate').visible,false);assert.equal(child(state,'border').visible,false);
  assert.equal(all(flag).some(n=>n.image===theme.officialAssets.images.button),false,'official rectangle must not replace original flag');
 }
 assert.equal(child(panel,'v25Background').visible,true);
 assert.equal(all(panel).filter(n=>n.name==='officialGeoBadge').length,0,'the selected character must not become an unrelated geo icon');
 const constellation=child(child(child(panel,'v25Roster'),'selected'),'v25Constellation');
 assert.equal(constellation.visible,false);assert.equal(parts(constellation).length,0);
 const avatar=child(selectedSlot(panel),'selectedPixelAvatar');
 assert(avatar.visible);assert.deepEqual(avatar.size,[118,118]);assert(parts(avatar).length<=20);
 const details=child(panel,'details'),bag=child(details,'v25GoldIcon');
 assert.equal(bag.kind,'container');assert.equal(all(bag).some(n=>n.image===theme.icon.gold),false,'approved grey money bag must not become a round coin');
 assert(all(bag).filter(n=>n.kind==='image').every(n=>n.image===theme.image.rect));
 assert.equal(child(bag,'bag').children[0].colour,'#D1D0BD');
 assert.equal(child(selectedSlot(panel),'innerFrame0').colour,'#957749');
 assert.deepEqual(child(child(panel,'details'),'officialSelectionFigure').scale,[1,1]);
});
function selectedSlot(panel){return child(child(panel,'v25Roster'),'selected');}

test('selected avatar preserves the actual battlePixel head identity and proportions',()=>{
 const asset=lightweightAssets().battle133;
 assert.equal(asset.sourceSha256,'b396f1af9e5c259fab4b63f973f184ffee3612404a8abc993d65fe698e8a65e0');
 assert.equal(selectedPixelAvatarSource.sourceSha256,asset.sourceSha256);
 assert.equal(selectedPixelAvatarSource.firstShape,40);assert.equal(selectedPixelAvatarSource.count,17);
 const theme=officialAssetsTheme(nativeTheme),layout=withViewport(gameLayout(),theme);applyOfficialNoncombatLayout(layout,theme);
 const panel=child(child(layout,'stage')??layout,'characterPanel'),avatar=child(selectedSlot(panel),'selectedPixelAvatar'),images=parts(avatar);
 assert.equal(images.length,17);const rows=asset.rows.slice(40),scale=images[0].size[0]/rows[0][3];
 for(let i=0;i<17;i++){
  const n=images[i],r=rows[i];assert.equal(n.name,'head'+(40+i));assert.equal(n.image,r[0]);
  assert.equal(n.colour,'#'+r.slice(14,17).map(c=>c.toString(16).padStart(2,'0')).join(''));assert.equal(n.opacity,r[17]/255);
  for(const axis of [0,1]){
   assert(Math.abs(n.size[axis]-r[3+axis]*scale)<1e-9);
   assert(Math.abs((n.position[axis]-images[0].position[axis])-(r[1+axis]-rows[0][1+axis])*scale)<1e-9);
   assert(Math.abs(n.position[axis])+n.size[axis]/2<=50.001,'full head bounds fit within 118px selected slot');
  }
 }
});
