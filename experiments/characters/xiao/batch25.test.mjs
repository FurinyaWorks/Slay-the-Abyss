import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn,startTurn} from './model.mjs';
import {newBattle,advance} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`mask duration sacrifice all-enemy before exiting upgraded=${upgraded}`,()=>{
  for(const mask of [0,1,2,3]){
   const s=state({hand:['x57'],enemies:[{hp:0,block:0},{hp:50,block:3},{hp:40,block:0}]});s.mask=mask;s.exitGuard=4;
   const r=play(s,{index:0,target:99,upgraded});assert.equal(r.ok,true);
   const damage=mask*(upgraded?10:8)+(mask?4:0);assert.equal(r.state.enemies[1].hp,50-Math.max(0,damage-3));assert.equal(r.state.enemies[2].hp,40-damage);
   assert.equal(r.state.mask,0);assert.equal(r.state.block,mask?4:0);assert.equal(r.state.energy,1);
  }
 });
 test(`reserve defense no immediate value and one next turn claim upgraded=${upgraded}`,()=>{
  let s=state({hand:['x58']});s=play(s,{index:0,upgraded}).state;assert.equal(s.block,0);
  s=startTurn(endTurn(s));assert.equal(s.block,upgraded?14:10);assert.equal(s.reservedBlock,0);
  s=startTurn(endTurn(s));assert.equal(s.block,0);assert.equal(newBattle().reservedBlock,0);
 });
}
test('burst exits before life tick but spends longer window; masked draw counts once',()=>{
 const s=state({hp:2,hand:['x57'],draw:['x02'],enemies:[{hp:80,block:0}]});s.mask=3;s.maskedAttackDraw=1;
 const r=play(s,{index:0});assert.equal(r.state.enemies[0].hp,52);assert.equal(r.state.maskedDrawUsed,true);assert.deepEqual(r.state.hand,['x02']);assert.equal(endTurn(r.state).hp,2);
});
test('reservation after real current enemy attack, stacks with carry and another reserve',()=>{
 let s=newBattle();s.hand=['x58','x58'];s.energy=3;s.block=20;s.carryBlock=5;
 s=play(s,{index:0}).state;s=play(s,{index:0,upgraded:true}).state;assert.equal(s.reservedBlock,24);
 const n=advance(s);assert.equal(n.hp,70);assert.equal(n.block,29);assert.equal(n.reservedBlock,0);
 const dead=newBattle({hp:1});dead.hand=['x58'];const d=advance(play(dead,{index:0}).state);assert.equal(d.hp,0);assert.equal(d.block,0);assert.equal(d.reservedBlock,10);
});
test('all forms insufficient energy/cancel/fault preserve duration, draws, guard and reserves',()=>{
 for(const id of ['x57','x58'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]);
  const s=state({hand:[id]});s.mask=2;s.exitGuard=4;s.maskedAttackDraw=1;s.discard=['x01','x02'];s.deckMode='shuffle';s.rng=3;const before=structuredClone(s);
  assert.deepEqual(play(s,{index:0,upgraded,cancel:true}).state,s);
  try{c[key].push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded}).state,s);assert.deepEqual(s,before);}finally{c[key]=old;}
  s.energy=0;assert.deepEqual(play(s,{index:0,upgraded}).state,s);
 }
});
test('reserve addition and next-turn carry combination overflow atomically rejects',()=>{
 const s=state({hand:['x58']});s.reservedBlock=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(s,{index:0}).state,s);
 const b=newBattle();b.reservedBlock=Number.MAX_SAFE_INTEGER;b.block=20;b.carryBlock=1;assert.deepEqual(advance(b),b);
 b.carryBlock=0;assert.equal(advance(b).block,Number.MAX_SAFE_INTEGER);
});
test('previous group suppression exact safe bound and next point restores earlier exit',()=>{
 for(const upgraded of [false,true]){
  const s=state({hand:['x55'],enemies:[{hp:30,block:0,intent:[8],suppression:Number.MAX_SAFE_INTEGER-(upgraded?6:4)}]});s.mask=2;s.exitGuard=3;
  assert.equal(play(s,{index:0,upgraded}).state.enemies[0].suppression,Number.MAX_SAFE_INTEGER);s.enemies[0].suppression++;assert.deepEqual(play(s,{index:0,upgraded}).state,s);
 }
});
