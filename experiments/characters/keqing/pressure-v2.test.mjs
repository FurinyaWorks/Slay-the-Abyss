import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, playerView, previewVisible } from './battle.mjs';
import { choosePlan as oldPlan } from './pressure.mjs';
import { choosePlan, simulate } from './pressure-v2.mjs';
test('v2 values persistent armor progress that v1 skips at equal HP loss',()=>{
  const view=playerView(createBattle({order:[0,1,2,3,4,5,6,7,8,9],enemies:[{hp:45,block:18,intent:0}],relic:false}));
  assert.deepEqual(oldPlan(view),[]);
  const plan=choosePlan(view);
  assert.equal(plan.length,3);
  let result=view;
  for(const step of plan) result=previewVisible(result,step.instance,step.target);
  assert.equal(result.enemies[0].block,0);
  assert.equal(result.enemies[0].hp,45);
  assert.equal(view.enemies[0].block,18);
});
test('v2 cannot see future cards and preserves input',()=>{
  const state=createBattle({seed:29}), original=structuredClone(state);
  const changed=structuredClone(state); changed.draw.reverse(); changed.rng=98;
  for(const policy of ['aggressive','balanced','defensive']) assert.deepEqual(choosePlan(playerView(state),policy),choosePlan(playerView(changed),policy));
  assert.deepEqual(state,original);
});
test('v2 leaves unarmored same-turn decisions identical and retains truncation',()=>{
  for(const seed of [11,29,47,83]) for(const policy of ['aggressive','balanced','defensive']) {
    const view=playerView(createBattle({seed}));
    assert.deepEqual(choosePlan(view,policy),oldPlan(view,policy));
  }
  const options={seed:11,encounter:'armor',policy:'defensive',maxTurns:1};
  assert.equal(simulate(options).outcome,'truncated');
  assert.deepEqual(simulate(options),simulate(options));
});
