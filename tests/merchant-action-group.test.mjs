import test from 'node:test';
import assert from 'node:assert/strict';
import {runLua} from '../scripts/test-lua.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {nodeLayout} from '../scripts/node-ui-layout.mjs';
import {officialAssetsTheme,applyOfficialAssets} from '../scripts/official-assets-layout.mjs';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {v25Theme} from '../scripts/v25-layout.mjs';
import {applyV25NodeLayout} from '../scripts/v25-node-layout.mjs';
const child=(node,name)=>(node.children??node.controls??[]).find(part=>part.name===name);
const bounds=([x,y,w,h])=>[x-w/2,y-h/2,x+w/2,y+h/2];
const overlaps=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
function assertClearance(theme,page=child(nodeLayout(theme),'nodePanel')){
 const m=theme.layout.merchant,merchant=child(page,'merchant');
 const bubble=child(merchant,'bubble');
 assert(bubble,'bottom rectangular dialogue must be replaced by a speech bubble');
 assert(child(bubble,'tail'),'speech bubble needs a pointing tail');
 for(const name of ['panel','border','accent','namePlate'])assert.equal(child(merchant,name).visible,false,`${name} must not expose an RPG bar`);
 assert(m.box[1]-m.box[3]/2>m.portrait[1]+m.portrait[3]/2,'bubble must clear the head');
 assert.equal(child(merchant,'line').text.colour,m.bubble.ink);
 const shop=child(page,'shopView'),l=theme.layout.nativeNode;
 const occupied=shop.children.filter(n=>/^(card\d+|price\d+|relic\d+|relicPrice\d+|potion\d+|potionPrice\d+|removal|removalPrice)$/.test(n.name));
 const actor=bounds(m.portrait),speech=bounds(m.box),talk=child(merchant,'talk');
 const tap=bounds([talk.position[0]+m.frame[0],talk.position[1]+m.frame[1],...talk.size]);
 for(const part of occupied){
  const frame=[...part.position,...part.size];
  if(/^card\d+$/.test(part.name)){frame[2]*=l.shop.hoverScale;frame[3]*=l.shop.hoverScale;}
  for(const [name,area]of [['figure',actor],['bubble',speech],['tap',tap]]){
   const poses=name==='tap'?[[0,0]]:[[0,0],[-m.shakeAmplitude,0],[m.shakeAmplitude,0],[0,-m.nodLift]];
   for(const [dx,dy]of poses)assert(!overlaps(area.map((v,i)=>v+(i%2?dy:dx)),bounds(frame)),`${name} overlaps ${part.name} during a reaction`);
  }
 }
 for(const action of [l.shop.cancel,l.shop.confirm,l.confirm])for(const area of [actor,speech,tap])assert(!overlaps(area,bounds(action)));
 for(const area of [actor,speech,tap])assert(area[0]>=-640&&area[2]<=640&&area[1]>=-360&&area[3]<=360,'merchant must remain on canvas');
 for(const area of [actor,speech])assert(area[0]-m.shakeAmplitude>=-640+theme.canvas.safe.x&&area[2]+m.shakeAmplitude<=640-theme.canvas.safe.x,'animated merchant must remain in the safe area');
 assert(tap[0]>=-640+theme.canvas.safe.x&&tap[2]<=640-theme.canvas.safe.x,'tap must remain in the touch safe area');
 assert(talk.size.every(value=>value>=44),'merchant reread needs a reachable touch target');
}
test('merchant bubble sits above an independent figure in the real shop clearance',()=>{
 assertClearance(nativeTheme);
});
test('official merchant projection has room beside seven unchanged offers including hover',()=>{
 const theme=officialAssetsTheme(nativeTheme),layout=gameLayout();
 applyOfficialAssets([layout],theme);
 const page=child(layout,'nodePanel');
 assert.deepEqual(child(page,'merchant').position,theme.layout.merchant.frame.slice(0,2));
 assertClearance(theme,page);
});
test('V25 final merchant projects the whole head-relative bubble and preserves live handles',()=>{
 const theme=v25Theme(nativeTheme),layout=gameLayout(),page=child(layout,'nodePanel');
 const merchant=child(page,'merchant'),line=child(merchant,'line'),talk=child(merchant,'talk');
 line.text.content='「眼光不错。」';
 applyV25NodeLayout(layout,theme);
 assert.strictEqual(child(page,'merchant'),merchant);assert.strictEqual(child(merchant,'line'),line);
 assert.strictEqual(child(merchant,'talk'),talk);assert.equal(line.text.content,'「眼光不错。」');
 assert.deepEqual(child(merchant,'bubble').size,theme.layout.merchant.box.slice(2));
 assert.deepEqual(line.size,theme.layout.merchant.line.slice(2));
 assertClearance(theme,page);
});
test('grouped merchant purchase actions preserve mouse and touch trade and dialogue',()=>{
 const r=runLua('tests/lua/merchant_action_group.lua');
 assert.equal(r.status,0,r.stdout+r.stderr);
 assert.match(r.stdout,/MERCHANT_ACTION_GROUP_PASS/);
});
