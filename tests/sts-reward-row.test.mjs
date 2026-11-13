import test from 'node:test';
import assert from 'node:assert/strict';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {officialAssetsTheme,applyOfficialAssets} from '../scripts/official-assets-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {applyStsRewardRows} from '../scripts/sts-reward-row-layout.mjs';
import {battleLayout} from '../scripts/ui-layout.mjs';
const all=n=>[n,...(n.children??n.controls??[]).flatMap(all)];
test('every reward kind shares measured compact left-icon rows and the existing native states',()=>{
 const tree=gameLayout(),theme=officialAssetsTheme(nativeTheme),nodes=all(tree),token=theme.officialAssets.rewardRows;
 const names=['goldReward','stolenGold','cardReward','claimPotion','relicReward1','relicReward2','emeraldKeyReward'];
 const original=new Map(names.map(name=>[name,nodes.find(n=>n.name===name)]));
 applyStsRewardRows(tree,theme);
 for(const [name,row]of original){
  assert.equal(row.kind,'presetButton');assert.strictEqual(all(tree).find(n=>n.name===name),row);
  assert.deepEqual(row.size,token.rowSize);assert.deepEqual(Object.keys(row.states),['normal','hover','pressed','disabled']);
  for(const state of row.children){
   const face=state.children.find(n=>n.name==='stsRewardFace');assert(face,name+' missing shared row face');
   assert.equal(all(face).filter(n=>n.kind==='image').length,6,'reuse bounded native rounded material');
   const icon=state.children.find(n=>n.name==='rewardIcon'),label=state.children.find(n=>n.name==='label');
   assert.deepEqual(icon.size,[token.iconSize,token.iconSize]);assert(icon.image>0);
   assert.equal(label.text.align,'left');assert.equal(label.text.fontSize,token.fontSize);
   assert.equal(label.text.outline,false);assert.equal(state.children.find(n=>n.name==='plate').visible,false);
   assert(all(state).filter(n=>n.kind==='image'&&n.visible!==false&&n.name!=='rewardIcon').every(n=>[100001,100002].includes(n.image)),'no catalog filigree reward background');
  }
 }
 assert.equal(theme.layout.battleRewards.rowStep,token.rowStep);
 assert.equal(theme.layout.battleRewards.expanded.rowStep,token.rowStep);
 const panel=all(tree).find(n=>n.name==='stsRewardPanel');assert.deepEqual(panel.size,token.panelSize);
 assert.deepEqual(panel.position,token.panelPosition.map((v,axis)=>v-theme.layout.battleRewards.stage[axis]));
 const proceed=all(tree).find(n=>n.name==='continue');
 assert(proceed.children.every(state=>state.children.some(n=>n.name==='v25Flag')),'Proceed reuses the existing flag component');
});

test('composed run and standalone battle expose the same reference reward rows before runtime',()=>{
 const theme=officialAssetsTheme(nativeTheme),trees=[gameLayout(),battleLayout()];applyOfficialAssets(trees,theme);
 for(const tree of trees){
  const token=theme.officialAssets.rewardRows,nodes=all(tree),row=nodes.find(n=>n.name==='goldReward');
  assert.deepEqual(row.size,token.rowSize);assert(nodes.some(n=>n.name==='stsRewardPanel'));
  const list=nodes.find(n=>n.name==='rewardList');
  assert.equal(list.children.find(n=>n.name==='title').position[1]+list.position[1],token.titleY);
  assert.equal(list.children.find(n=>n.name==='subtitle').position[1]+list.position[1],token.subtitleY);
 }
 assert.deepEqual(theme.layout.battleRewards.rowOrigin,theme.officialAssets.rewardRows.rowOrigin);
});
