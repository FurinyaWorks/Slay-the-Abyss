import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, starterIds, finishTurn } from './battle.mjs';
import { offerReward, acceptReward, runCombat } from './rewards.mjs';
test('reward is offered, optional and appended without replacing a basic card',()=>{
  const original=[...starterIds], offer=['KQ006','KQ007'];
  assert.deepEqual(acceptReward(original,offer),original);
  const added=acceptReward(original,offer,'KQ006');
  assert.equal(added.length,11); assert.deepEqual(added.slice(0,10),original);
  assert.equal(original.length,10);
  assert.throws(()=>acceptReward(original,offer,'KQ008'),/not offered/);
  assert.throws(()=>acceptReward(original,['KQ006','KQ006']),/offer/);
  assert.deepEqual(offerReward(3001),offerReward(3001));
});
test('variable deck guards and repeated real shuffle conserve all eleven identities',()=>{
  const deck=[...starterIds,'KQ006'];
  let s=createBattle({deckIds:deck,enemies:[{hp:100,block:0,intent:0}]});
  for(let i=0;i<100;i++) {
    const all=[...s.hand,...s.draw,...s.discard];
    assert.equal(all.length,11); assert.equal(new Set(all.map(c=>c.instance)).size,11);
    assert.equal(all.filter(c=>c.id==='KQ006').length,1);
    s=finishTurn(s);
  }
  assert.throws(()=>createBattle({deckIds:['KQ006']}),/deck/);
  assert.throws(()=>createBattle({deckIds:[...starterIds,'bad']}),/deck/);
  assert.throws(()=>createBattle({deckIds:deck,order:[0,1,2,3,4,5,6,7,8,9]}),/order/);
  assert.throws(()=>acceptReward(Array(75).fill('KQ001'),['KQ006','KQ007'],'KQ006'),/full/);
});
test('reward combat is deterministic, keeps starting hp and explicit truncation',()=>{
  const args={seed:3001,deck:[...starterIds,'KQ007'],encounter:'heavy',policy:'balanced',hp:40,maxTurns:1};
  const r=runCombat(args);
  assert.equal(r.startHp,40); assert.equal(r.finalInstanceCount,11); assert.equal(r.outcome,'truncated');
  assert.deepEqual(r,runCombat(args));
});
