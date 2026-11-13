import test from 'node:test';import assert from 'node:assert/strict';import{createBattle,starterIds,useCard,finishTurn,playerView}from './battle.mjs';
const make=(id,up)=>{const s=createBattle({deckIds:[...starterIds,id],order:[10,3,0,1,2,4,5,6,7,8,9],enemies:[{hp:1000,block:0,intent:0}],relic:false});s.hand[0].upgraded=up;return s;};
for(const up of [false,true]){
 test('batch13 first card means skills count, canceled cards do not '+up,()=>{
  const s=make('KQ047',up),first=useCard(s,'starter-10',0);assert.equal(first.hand.length,5);assert.equal(first.enemies[0].hp,up?992:995);assert.equal(first.playedThisTurn,1);
  const afterSkill=useCard(s,'starter-3',0),late=useCard(afterSkill,'starter-10',0);assert.equal(late.hand.length,3);assert.equal(late.playedThisTurn,2);
  assert.deepEqual(useCard(s,'starter-10',0,{cancel:true}),s);assert.equal(playerView(late).playedThisTurn,2);assert.equal(finishTurn(late).playedThisTurn,undefined);
 });
 test('batch13 latest discarded goes bottom not top or current card '+up,()=>{
  let s=make('KQ051',up);s=useCard(s,'starter-3',0);const top=s.draw[0].instance;const r=useCard(s,'starter-10',0);assert.equal(r.hand.at(-1).instance,top);assert.equal(r.draw.at(-1).instance,'starter-3');assert.equal(r.discard.at(-1).instance,'starter-10');assert.equal(r.block,(up?5:2)+5);
 });
 test('batch13 future draw penalty once only '+up,()=>{
  const s=make('KQ059',up),r=useCard(s,'starter-10',0);assert.equal(r.enemies[0].hp,up?978:984);assert.equal(r.drawDebt,1);
  const n=finishTurn(r);assert.equal(n.hand.length,4);assert.equal(n.drawDebt,undefined);assert.equal(finishTurn(n).hand.length,5);
 });
}
test('batch13 invalid counters atomically rejected and fresh battle resets',()=>{for(const key of ['playedThisTurn','drawDebt']){const s=make('KQ047',false);s[key]=NaN;const before=structuredClone(s);assert.throws(()=>useCard(s,'starter-10',0));assert.deepEqual(s,before);assert.equal(createBattle()[key],undefined);}});
