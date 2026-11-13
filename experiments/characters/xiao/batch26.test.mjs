import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play} from './model.mjs';
import {newBattle} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`harvest counts newly killed after armor, caps draws upgraded=${upgraded}`,()=>{
  for(const kills of [0,1,2,3]){
   const amount=upgraded?14:10;
   const s=state({hand:['x59'],draw:['x01','x02','x03'],enemies:[{hp:0,block:0},...Array.from({length:kills},()=>({hp:amount-2,block:2})),{hp:amount-1,block:2}]});
   const r=play(s,{index:0,target:99,upgraded});assert.equal(r.ok,true);assert.equal(r.state.hand.length,Math.min(2,kills));assert.deepEqual(r.state.exhaust,['x59']);assert.equal(r.state.enemies.at(-1).hp,1);
  }
 });
 test(`calm attack power no immediate gain, per-card not hit, stack upgraded=${upgraded}`,()=>{
  let s=state({hand:['x60','x60','x35'],energy:4,enemies:[{hp:70,block:0}]});
  s=play(s,{index:0,upgraded}).state;s=play(s,{index:0,upgraded}).state;assert.equal(s.block,0);
  s=play(s,{index:0}).state;assert.equal(s.block,upgraded?6:4);assert.equal(newBattle().calmAttackGuard,0);
 });
}
test('entry attack counts pre-state calm, exit attack pre-state masked does not; zero damage counts',()=>{
 const enter=state({hand:['x54']});enter.calmAttackGuard=2;assert.equal(play(enter,{index:0}).state.block,2);
 const exit=state({hand:['x11']});exit.mask=1;exit.calmAttackGuard=2;assert.equal(play(exit,{index:0}).state.block,0);
 const zero=state({hand:['x37']});zero.calmAttackGuard=2;assert.equal(play(zero,{index:0}).state.block,2);assert.equal(play(zero,{index:0}).state.enemies[0].hp,30);
});
test('harvest draws before masked bonus, actual shuffle excludes resolving card; final kill cannot continue',()=>{
 const s=state({hand:['x59'],enemies:[{hp:14,block:0},{hp:14,block:0},{hp:40,block:0}]});s.mask=1;s.maskedAttackDraw=1;s.discard=['x01','x02','x03'];s.deckMode='shuffle';s.rng=5;
 const r=play(s,{index:0});assert.equal(r.state.hand.length,3);assert.deepEqual([...r.state.hand].sort(),['x01','x02','x03']);assert.equal(r.state.mask,1);assert.deepEqual(r.state.exhaust,['x59']);
 const final=state({hand:['x59'],draw:['x01'],enemies:[{hp:1,block:0}]});const z=play(final,{index:0});assert.equal(play(z.state,{index:0}).reason,'combat-ended');
});
test('post-effect faults and calm guard numeric overflow restore complete input',()=>{
 for(const id of ['x59','x60'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]);
  const s=state({hand:[id],enemies:[{hp:1,block:0},{hp:40,block:0}]});s.discard=['x01','x02'];s.deckMode='shuffle';s.rng=5;const copy=structuredClone(s);
  assert.deepEqual(play(s,{index:0,upgraded,cancel:true}).state,s);
  try{c[key].push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded}).state,s);assert.deepEqual(s,copy);}finally{c[key]=old;}
 }
 const s=state({hand:['x60']});s.calmAttackGuard=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(s,{index:0}).state,s);
 const attack=state({hand:['x35']});attack.calmAttackGuard=2;attack.block=Number.MAX_SAFE_INTEGER-1;assert.deepEqual(play(attack,{index:0}).state,attack);
});
test('previous reserve block campaign overflow restores full end action',async()=>{
 const {newCampaign,campaignAction}=await import('./campaign.mjs');const c=newCampaign(1);
 c.battle.reservedBlock=Number.MAX_SAFE_INTEGER;c.battle.block=20;c.battle.carryBlock=1;const copy=structuredClone(c);
 assert.deepEqual(campaignAction(c,{type:'end'}).state,c);assert.deepEqual(c,copy);
});
