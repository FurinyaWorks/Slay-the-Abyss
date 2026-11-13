import test from 'node:test';import assert from 'node:assert/strict';import{createBattle,starterIds,useCard,finishTurn}from './battle.mjs';
const make=(id,up,relic=false)=>{const s=createBattle({deckIds:[...starterIds,id],order:[10,0,1,2,3,4,5,6,7,8,9],enemies:[{hp:1000,block:0,intent:10},{hp:1000,block:0,intent:4}],relic});s.hand[0].upgraded=up;return s;};
for(const up of [false,true]){
 test('batch16 delayed setup after expiry before enemy, relic once '+up,()=>{for(const wedge of [null,1,2])for(const relic of [false,true]){const s=make('KQ012',up,relic);s.wedgeUntil=wedge;const r=useCard(s,'starter-10',0);assert.equal(r.wedgeUntil,wedge);assert.equal(r.block,up?5:2);assert.equal(r.relicUsed,false);const next=finishTurn(r);assert.equal(next.wedgeUntil,2);assert.equal(next.delayedWedge,undefined);const reward=relic&&wedge!==2?4:0;assert.equal(next.hp,60-14+(up?5:2)+reward);assert.equal(next.relicUsed,Boolean(reward));assert.equal(next.exhaust.length,1);}});
 test('batch16 per attack reduction stacks only across distinct target control, clears on death '+up,()=>{
  const s=make('KQ038',up);s.enemies[0].attackReduction=4;const r=useCard(s,'starter-10',0);assert.equal(r.phaseReduction,2);const n=finishTurn(r);assert.equal(n.hp,60-Math.max(0,6-(up?8:5)));assert.equal(n.phaseReduction,undefined);
  const dead=make('KQ038',up);dead.hp=1;dead.enemies[0].intent=40;const end=finishTurn(useCard(dead,'starter-10',0));assert.equal(end.phase,'lost');assert.equal(end.phaseReduction,undefined);
 });
}
test('batch16 no delayed state or reduction from cancellation or fresh battle',()=>{for(const id of ['KQ012','KQ038']){const s=make(id,false),old=structuredClone(s);assert.deepEqual(useCard(s,'starter-10',0,{cancel:true}),old);}const s=createBattle();assert.equal(s.delayedWedge,undefined);assert.equal(s.phaseReduction,undefined);});
