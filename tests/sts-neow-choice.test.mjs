import test from 'node:test';
import assert from 'node:assert/strict';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {officialAssetsTheme,applyOfficialAssets} from '../scripts/official-assets-layout.mjs';

const child=(n,name)=>(n?.children??n?.controls??[]).find(c=>c.name===name);
// Calibrated normal-state body from the immutable 1920px-wide V2.2 screenshot.
// Interaction-state colours are functional project feedback, not measured StS parity.
const reference={sourceSize:[880,59],sourceStep:79,scale:2/3,origin:[-227,-278],hitHeight:44,textSize:20,
 border:'#172D30',bevel:'#326668',face:'#29494A',shadow:'#0C1719',ink:'#FFFFFF',rewardInk:'#7FFF00',costInk:'#FF6563',
 disabledInk:'#8E9690',hover:'#426B6C',pressed:'#203A3C',disabled:'#24383A'};

function official(){
 const theme=officialAssetsTheme(nativeTheme);
 const layout=gameLayout(theme);applyOfficialAssets([layout],theme);
 const host=child(layout,'stage')??layout;
 return {theme,event:child(child(host,'nodePanel'),'eventView')};
}

test('official Neow normal choices use one measured narrow body and independent touch target',()=>{
 const {theme,event}=official();
 for(let i=1;i<=4;i++){
  const row=child(event,'option'+i);
  assert.deepEqual(row.size,reference.sourceSize.map(v=>v*reference.scale),'old 80px double-decker body must fail');
  assert.equal(child(row,'stsNeowText')?.text.align,'left','old centred title must fail');
  assert.equal(child(row,'title').visible,false,'old separate title is not the normal-state copy');
  assert.equal(child(row,'description').visible,false,'one inline baseline must own the visible copy');
  assert(child(row,'hit').size[1]>=44,'touch target may exceed visible body');
  const chrome=child(row,'stsNeowChrome');assert(chrome,'all rows mount the same normal material');
  assert.equal(child(row,'border').visible,false,'legacy gold outline cannot survive');
  assert.equal(child(chrome,'face').children[0].colour,reference.face);
 }
 assert.equal(theme.layout.nativeNode.event.neow.options.spacing,79*2/3);
});

test('Neow token geometry cannot silently diverge from its measured body contour',()=>{
 const theme=officialAssetsTheme(nativeTheme),layout=gameLayout(theme);
 theme.officialAssets.neowChoice.sourceSize[1]=80;
 assert.throws(()=>applyOfficialAssets([layout],theme),/sourceSize must match the measured contour/);
});
