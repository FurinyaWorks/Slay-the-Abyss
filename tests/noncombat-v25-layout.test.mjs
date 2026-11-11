import test from 'node:test';
import assert from 'node:assert/strict';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {withViewport} from '../scripts/viewport-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {officialAssetsTheme} from '../scripts/official-assets-layout.mjs';
import {attachOfficialPortraits} from '../scripts/official-portraits.mjs';
import {applyOfficialNoncombatLayout} from '../scripts/noncombat-v25-layout.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeRgbaRectangles} from '../scripts/v25-private-card-assets.mjs';
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
 assert.equal(all(panel).filter(n=>n.name==='officialGeoBadge').length,0,'the supplied constellation cannot be replaced with the geo icon');
 const constellation=child(child(child(panel,'v25Roster'),'selected'),'v25Constellation');
 assert(constellation.visible);assert.deepEqual(constellation.size,[118,118]);
 assert(all(constellation).length<2000);
 for(const n of all(constellation)){assert(parts(n).length<=60);if(n.kind==='image'){assert.equal(n.image,100001);assert.equal(n.colour.toUpperCase(),'#FFE0A2');}}
 const details=child(panel,'details'),bag=child(details,'v25GoldIcon');
 assert.equal(bag.kind,'container');assert.equal(all(bag).some(n=>n.image===theme.icon.gold),false,'approved grey money bag must not become a round coin');
 assert(all(bag).filter(n=>n.kind==='image').every(n=>n.image===theme.image.rect));
 assert.equal(child(bag,'bag').children[0].colour,'#D1D0BD');
 assert.equal(child(selectedSlot(panel),'innerFrame0').colour,'#957749');
 assert.deepEqual(child(child(panel,'details'),'officialSelectionFigure').scale,[1,1]);
});
function selectedSlot(panel){return child(child(panel,'v25Roster'),'selected');}

test('constellation derivative is pinned to the supplied full-bounds PNG and explicitly sampled',()=>{
 const original=readFileSync('docs/design/reference-ui-lab/constellation-exact.png');
 assert.equal(createHash('sha256').update(original).digest('hex'),'5780bc541d322b369b61f656908da59bdeee7f3ad83988edca8be23776720ecd');
 const derivative=JSON.parse(readFileSync('data/presentation/v25-constellation-118.json','utf8'));
 assert.equal(derivative.source.sha256,createHash('sha256').update(original).digest('hex'));
 assert.deepEqual(derivative.source.size,[512,512]);assert.deepEqual(derivative.displaySize,[118,118]);
 assert.equal(derivative.tint,'#FFE0A2');assert.equal(derivative.sampling.alphaLevels,32);
 assert.equal(derivative.sampling.filter,'Pillow-LANCZOS');assert.equal(derivative.sampling.crop,'none');
 assert.equal(derivative.originalSourceLossless,false);assert.equal(derivative.cssRasterExact,false);
 assert.equal(derivative.error.maxAbsAlpha,4);assert(derivative.error.meanAbsAlpha<=.436);
 // Independent fixed golden from original PNG alpha -> Pillow LANCZOS 118px ->
 // round(round(alpha/255*31)*255/31). Decode actual blocks, not claimed metadata.
 const rgba=decodeRgbaRectangles(derivative.asset),alpha=Buffer.alloc(118*118);
 for(let i=0;i<alpha.length;i++){
  assert.deepEqual([...rgba.subarray(i*4,i*4+3)],[255,224,162]);alpha[i]=rgba[i*4+3];
 }
 assert.equal(createHash('sha256').update(alpha).digest('hex'),'2613175996511aee8912765edc03260d3808f53c47093b5e16a5ebfd07eeaab4');
});
