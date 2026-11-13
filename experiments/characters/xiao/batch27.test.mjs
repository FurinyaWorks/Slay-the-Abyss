import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play} from './model.mjs';
for(const upgraded of [false,true]){
 test(`pierce retains enemy block, mask applies and overkill clamps upgraded=${upgraded}`,()=>{
  for(const armor of [0,5,100])for(const mask of [0,1]){
   const s=state({hand:['x61'],enemies:[{hp:50,block:armor}]});s.mask=mask;
   const r=play(s,{index:0,upgraded});assert.equal(r.state.enemies[0].hp,50-(upgraded?11:8)-(mask?4:0));assert.equal(r.state.enemies[0].block,armor);assert.equal(r.state.attacksPlayed,1);
  }
  const tiny=state({hand:['x61'],enemies:[{hp:1,block:100}]});assert.equal(play(tiny,{index:0,upgraded}).state.enemies[0].hp,0);
 });
 test(`actual enemy shield transfer finite and draw regardless of zero upgraded=${upgraded}`,()=>{
  for(const block of [0,4,8,12,30]){
   const s=state({hand:['x62'],draw:['x01'],enemies:[{hp:30,block}]});s.block=3;
   const r=play(s,{index:0,upgraded});const taken=Math.min(upgraded?12:8,block);
   assert.equal(r.state.block,3+taken);assert.equal(r.state.enemies[0].block,block-taken);assert.equal(r.state.enemies[0].hp,30);assert.deepEqual(r.state.hand,['x01']);assert.equal(r.state.attacksPlayed,0);
  }
 });
}
test('pierce still triggers attack powers whereas shield steal is skill',()=>{
 const p=state({hand:['x61'],enemies:[{hp:50,block:100}]});p.calmAttackGuard=3;assert.equal(play(p,{index:0}).state.block,3);
 const s=state({hand:['x62'],enemies:[{hp:30,block:0}]});s.calmAttackGuard=3;assert.equal(play(s,{index:0}).state.block,0);
});
test('both require living explicit target even skill; cannot steal from corpse or miss target',()=>{
 for(const id of ['x61','x62']){
  const s=state({hand:[id],enemies:[{hp:0,block:100},{hp:30,block:8}]});
  assert.deepEqual(play(s,{index:0}).state,s);assert.deepEqual(play(s,{index:0,target:99}).state,s);assert.equal(play(s,{index:0,target:1}).ok,true);
 }
});
test('four forms faults after target mutation and draw shuffle restore all, safe bound transfer',()=>{
 for(const id of ['x61','x62'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]),s=state({hand:[id],enemies:[{hp:30,block:20}]});
  s.discard=['x01','x02'];s.deckMode='shuffle';s.rng=4;const before=structuredClone(s);assert.deepEqual(play(s,{index:0,upgraded,cancel:true}).state,s);
  try{c[key].push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded}).state,s);assert.deepEqual(s,before);}finally{c[key]=old;}
 }
 for(const upgraded of [false,true]){
  const s=state({hand:['x62'],enemies:[{hp:30,block:30}]});s.block=Number.MAX_SAFE_INTEGER-(upgraded?12:8);
  assert.equal(play(s,{index:0,upgraded}).state.block,Number.MAX_SAFE_INTEGER);s.block++;assert.deepEqual(play(s,{index:0,upgraded}).state,s);
 }
});
test('previous harvest full hand and real-shuffle post-draw calm guard overflow',()=>{
 for(const upgraded of [false,true]){
  const full=state({hand:['x59',...Array(9).fill('x01')],draw:['x02','x03'],enemies:[{hp:1,block:0},{hp:1,block:0}]});
  const r=play(full,{index:0,upgraded});assert.equal(r.state.hand.length,10);assert.equal(r.state.draw.length,1);
  const s=state({hand:['x59'],enemies:[{hp:1,block:0},{hp:30,block:0}]});s.discard=['x01','x02'];s.deckMode='shuffle';s.rng=4;s.calmAttackGuard=2;s.block=Number.MAX_SAFE_INTEGER-2;
  assert.equal(play(s,{index:0,upgraded}).state.block,Number.MAX_SAFE_INTEGER);s.block++;assert.deepEqual(play(s,{index:0,upgraded}).state,s);
 }
});
