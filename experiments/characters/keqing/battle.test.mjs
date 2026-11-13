import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, useCard, finishTurn, playerView, describeRelic } from './battle.mjs';
const order = [7,0,3,4,5,8,9,1,2,6];
test('real starter draws reach carried wedge and both payoffs on turn 2', () => {
  let state = createBattle({order});
  assert.deepEqual(state.hand.map(c=>c.id),['KQ003','KQ001','KQ002','KQ002','KQ002']);
  state=useCard(state,'starter-7',0);
  state=finishTurn(state);
  assert.equal(state.turn,2);
  assert.equal(state.wedgeUntil,2);
  assert.equal(state.hp,56); // 8 intent - first setup relic 4
  assert.deepEqual(state.hand.map(c=>c.id),['KQ003','KQ004','KQ001','KQ001','KQ002']);
  assert.equal(useCard(state,'starter-8',0).infusion,2);
  assert.equal(useCard(state,'starter-9',0).wedgeUntil,null);
});
test('initial relic grants block once, only after successful setup, not cancel/recast', () => {
  let state=createBattle({order:[7,8,9,0,3,1,2,4,5,6]});
  const cancelled=useCard(state,'starter-7',0,{cancel:true});
  assert.equal(cancelled.block,0); assert.equal(cancelled.relicUsed,false);
  assert.throws(()=>useCard(state,'starter-7',90),/target/);
  state=useCard(state,'starter-7',0);
  assert.equal(state.block,4);
  state=useCard(state,'starter-8',0);
  assert.equal(state.block,4);
  assert.equal(state.log.filter(e=>e.event==='first_wedge_setup_per_combat').length,1);
  assert.match(describeRelic(),/首次设置雷楔后，获得4格挡/);
});
test('same hand defense has real opportunity cost under visible enemy intent', () => {
  const start=createBattle({order,enemies:[{hp:50,block:0,intent:14}]});
  const aggressive=finishTurn(useCard(useCard(start,'starter-7',0),'starter-0',0));
  const defensive=finishTurn(useCard(useCard(useCard(start,'starter-7',0),'starter-3',0),'starter-4',0));
  assert.equal(aggressive.hp,50);
  assert.equal(defensive.hp,60);
  assert.equal(aggressive.enemies[0].hp,39);
  assert.equal(defensive.enemies[0].hp,45);
});
test('relic removal is explicit, no regeneration on next turn; loss stops actions', () => {
  let state=createBattle({order,relic:false,enemies:[{hp:99,block:0,intent:100}]});
  state=useCard(state,'starter-7',0);
  assert.equal(state.block,0);
  state=finishTurn(state);
  assert.equal(state.hp,0); assert.equal(state.phase,'lost');
  assert.throws(()=>finishTurn(state),/phase/);
  assert.throws(()=>useCard(state,'starter-0',0),/phase/);
});
test('victory blocks enemy phase and future play', () => {
  let state=createBattle({order,enemies:[{hp:1,block:0,intent:100}]});
  state=useCard(state,'starter-7',0);
  assert.equal(state.phase,'won'); assert.equal(state.hp,60);
  assert.throws(()=>finishTurn(state),/phase/);
});
test('shuffle conserves instances across repeated draws and does not mutate input', () => {
  let state=createBattle({seed:123,enemies:[{hp:99,block:0,intent:0}]});
  const original=structuredClone(state);
  for(let i=0;i<100;i++) {
    state=finishTurn(state);
    const cards=[...state.hand,...state.draw,...state.discard];
    assert.equal(cards.length,10); assert.equal(new Set(cards.map(c=>c.instance)).size,10);
    assert.equal(state.hand.length,5); assert.equal(state.energy,3);
  }
  assert.equal(original.turn,1);
  assert.deepEqual(createBattle({seed:123,enemies:[{hp:99,block:0,intent:0}]}),original);
});
test('policy view hides future draw and RNG; strict options reject corrupt setup', () => {
  const state=createBattle(); const view=playerView(state);
  assert.equal(view.draw,undefined); assert.equal(view.rng,undefined);
  view.hand[0].upgraded=true; assert.equal(state.hand[0].upgraded,false);
  assert.throws(()=>createBattle({relic:'false'}),/relic/);
  assert.throws(()=>createBattle({order:Array(10).fill(0)}),/order/);
});
test('enumerate 252 opening hands: 70 carryover choice opportunities, not victory rate', () => {
  let count=0, opportunity=0;
  const choose=(next, picked)=>{
    if(picked.length===5){
      count++;
      const e=picked.filter(i=>i===7||i===8).length;
      if(e===1 && !picked.includes(9)) opportunity++;
      return;
    }
    for(let n=next;n<10;n++) choose(n+1,[...picked,n]);
  };
  choose(0,[]);
  assert.equal(count,252); assert.equal(opportunity,70);
});
