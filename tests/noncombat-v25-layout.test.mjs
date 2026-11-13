import test from 'node:test';
import assert from 'node:assert/strict';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {withViewport} from '../scripts/viewport-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {officialAssetsTheme} from '../scripts/official-assets-layout.mjs';
import {attachOfficialPortraits} from '../scripts/official-portraits.mjs';
import {applyOfficialNoncombatLayout} from '../scripts/noncombat-v25-layout.mjs';
import {stsCharacterPortraitProfile} from '../scripts/sts-character-select-layout.mjs';
const parts=n=>n?.controls??n?.children??[],child=(n,name)=>parts(n).find(c=>c.name===name);
const all=n=>[n,...parts(n).flatMap(all)];
const brighten=(hex,factor)=>'#'+[1,3,5].map(i=>Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*factor)).toString(16).padStart(2,'0')).join('').toUpperCase();
function assertSelectionFlags(panel,theme){
 const t=theme.layout.stsCharacter,tokens=theme.officialAssets.flagButton;
 for(const key of ['confirm','cancel'])for(const state of parts(child(child(panel,key),'hit'))){
  const flag=child(state,'v25Flag'),cloth=child(flag,'cloth'),rim=child(flag,'rim');
  assert(rim&&cloth,'approved flag has separate irregular rim and cloth');
  assert(parts(cloth).length<=30);assert(parts(rim).length<=30);
  const normal=tokens[key][1],fill=state.name==='hover'?brighten(normal,tokens.hoverBrightness):state.name==='pressed'?brighten(normal,tokens.pressedBrightness):normal;
  for(const band of parts(cloth)){assert.equal(band.image,theme.image.rect);assert.equal(band.colour,fill,'shared flag material token');}
  assert.equal(child(state,'label').text.colour,state.name==='disabled'?t.colour.muted:t.colour.buttonInk,'shared selection button ink');
  assert.equal(child(state,'label').text.minFontSize,theme.font.minimum);assert(child(state,'label').text.minFontSize>=14);
  assert.equal(child(state,'plate').visible,false);assert.equal(child(state,'border').visible,false);
  assert.equal(all(flag).some(n=>n.image===theme.officialAssets.images.button),false,'official rectangle must not replace original flag');
 }
}
function assertSharedSelectionSlot(panel,theme){
 const t=theme.layout.stsCharacter,slot=child(panel,'traveler'),details=child(panel,'details'),figure=child(details,'officialSelectionFigure');
 assert.equal(child(panel,'v25Roster').visible,false);
 assert.equal(child(panel,'title').visible,false,'no old page title');
 assert(!all(panel).some(n=>['selectedInitial','selectedPixelAvatar'].includes(n.name)),'no old glyph or independent avatar');
 assert.deepEqual(slot.size,t.roster.size);assert.deepEqual(child(slot,'selected').size,t.roster.size.map(v=>v+8));
 assert.equal(child(slot,'selected').colour,t.colour.selected);
 for(const state of parts(child(slot,'hit')))assert.equal(child(state,'bust').visible,false);
 const profile=stsCharacterPortraitProfile(theme);assert.equal(profile.source,'battleApprovedIdle');
 assert(figure,'shared idle slot required');assert.deepEqual(figure.position,profile.position);
 assert.deepEqual(figure.size,t.portrait.sourceSize);assert.deepEqual(figure.scale,[1,1]);
 assert.equal(child(details,'portraits').visible,false);assert.equal(parts(figure).length,0,'native controller fills existing host; no baked avatar');
}
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
 assertSelectionFlags(panel,theme);
 const oldInk=structuredClone(panel);child(child(child(oldInk,'confirm'),'hit'),'normal').children.find(n=>n.name==='label').text.colour=theme.officialAssets.buttonInk;
 assert.throws(()=>assertSelectionFlags(oldInk,theme),/shared selection button ink/,'old generic official ink cannot replace selection token');
 const changed=structuredClone(theme);changed.layout.stsCharacter.colour.buttonInk='#EEDDBB';changed.officialAssets.flagButton.confirm[1]='#335577';
 const tokenLayout=withViewport(gameLayout(),changed);attachOfficialPortraits(tokenLayout);applyOfficialNoncombatLayout(tokenLayout,changed);
 assertSelectionFlags(child(child(tokenLayout,'stage')??tokenLayout,'characterPanel'),changed);
 assert.equal(child(panel,'v25Background').visible,true);
 assert.equal(all(panel).filter(n=>n.name==='officialGeoBadge').length,0,'the selected character must not become an unrelated geo icon');
 const constellation=child(child(child(panel,'v25Roster'),'selected'),'v25Constellation');
 assert.equal(constellation.visible,false);assert.equal(parts(constellation).length,0);
 assertSharedSelectionSlot(panel,theme);
 const details=child(panel,'details'),bag=child(details,'v25GoldIcon');
 assert.equal(bag.kind,'container');assert.equal(all(bag).some(n=>n.image===theme.icon.gold),false,'approved grey money bag must not become a round coin');
 assert(all(bag).filter(n=>n.kind==='image').every(n=>n.image===theme.image.rect));
 assert.equal(child(bag,'bag').children[0].colour,'#D1D0BD');
 assert.equal(child(selectedSlot(panel),'innerFrame0').colour,'#957749','frozen superseded frame remains hidden');
});
function selectedSlot(panel){return child(child(panel,'v25Roster'),'selected');}

test('release selection reuses the same live battle idle host without a glyph or independent avatar fallback',()=>{
 const theme=officialAssetsTheme(nativeTheme),layout=withViewport(gameLayout(),theme);attachOfficialPortraits(layout);applyOfficialNoncombatLayout(layout,theme);
 const panel=child(child(layout,'stage')??layout,'characterPanel'),figure=child(child(panel,'details'),'officialSelectionFigure');
 assertSharedSelectionSlot(panel,theme);
 const old=structuredClone(panel);child(old,'traveler').children.push({name:'selectedInitial',kind:'text',text:{content:'荧'}});
 assert.throws(()=>assertSharedSelectionSlot(old,theme),/no old glyph or independent avatar/,'old first-glyph fallback must fail');
 applyOfficialNoncombatLayout(layout,theme);
 assert.equal(child(child(panel,'details'),'officialSelectionFigure'),figure);
 assert.equal(parts(child(panel,'details')).filter(n=>n.name==='officialSelectionFigure').length,1,'reapplying cannot create a second portrait owner');
});
