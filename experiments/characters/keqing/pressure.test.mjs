import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, playerView, previewVisible, useCard } from './battle.mjs';
import { choosePlan, simulate, summarize } from './pressure.mjs';
test('visible previews match live action including first-setup relic without future data',()=>{
  const state=createBattle({order:[7,8,0,3,9,1,2,4,5,6]});
  const preview=previewVisible(playerView(state),'starter-7',0);
  const actual=useCard(state,'starter-7',0);
  for(const key of ['energy','block','wedgeUntil','infusion','relicUsed','enemies','hand']) assert.deepEqual(preview[key],actual[key]);
  assert.equal(preview.draw,undefined); assert.equal(preview.rng,undefined);
});
test('policies are deterministic and ignore hidden draw order',()=>{
  const state=createBattle({seed:29});
  const changed=structuredClone(state); changed.draw.reverse(); changed.rng=100;
  for(const policy of ['aggressive','balanced','defensive']) assert.deepEqual(choosePlan(playerView(state),policy),choosePlan(playerView(changed),policy));
});
test('pressure replay is deterministic, truncation is explicit and counts reconcile',()=>{
  const options={seed:11,encounter:'heavy',policy:'balanced'};
  assert.deepEqual(simulate(options),simulate(options));
  assert.equal(simulate({...options,maxTurns:1}).outcome,'truncated');
  const rows=[simulate(options),simulate({...options,maxTurns:1})];
  const report=summarize(rows);
  assert.equal(report.won+report.lost+report.truncated,2);
  assert.ok(rows.every(r=>r.loss>=0&&r.endHp>=0));
});
