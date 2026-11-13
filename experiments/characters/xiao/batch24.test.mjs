import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn,startTurn} from './model.mjs';
import {newBattle,advance,intent} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`retreat suppresses all living enemies then expires upgraded=${upgraded}`,()=>{
  const s=newBattle({encounter:'swarm'});s.hand=['x55'];s.mask=2;s.exitGuard=3;
  const r=play(s,{index:0,upgraded});assert.equal(r.ok,true);assert.equal(r.state.mask,0);assert.equal(r.state.block,3);
  assert.deepEqual(r.state.enemies.map(e=>intent(r.state,e)),upgraded?[0,1]:[1,3]);
  const n=advance(r.state);assert.equal(n.hp,upgraded?70:69);assert.ok(n.enemies.every(e=>e.suppression===0));assert.deepEqual(r.state.exhaust,['x55']);
 });
 test(`extend active only capped, no entry hooks, draw distinct upgraded=${upgraded}`,()=>{
  for(const mask of [0,1,2,3]){
   const s=state({hand:['x56'],draw:['x01','x02','x03'],startingRelic:true});s.mask=mask;s.entryGuard=6;
   const r=play(s,{index:0,upgraded});assert.equal(r.state.mask,mask?Math.min(3,mask+1):0);assert.equal(r.state.block,0);assert.equal(r.state.relicUsed,false);assert.equal(r.state.hand.length,upgraded?2:1);
  }
 });
}
test('extension can cause a later lethal tick, while no extension expires safely',()=>{
 const s=state({hp:4,hand:['x56']});s.mask=1;
 const plain=startTurn(endTurn(s));assert.equal(endTurn(plain).hp,2);
 const extended=play(s,{index:0}).state;assert.equal(endTurn(startTurn(endTurn(extended))).hp,0);
});
test('unmasked retreat still reduces intent, dead invalid intent ignored, living invalid rolls back exit',()=>{
 const s=state({hand:['x55'],enemies:[{hp:0,block:0},{hp:20,block:0,intent:[7]}]});
 const r=play(s,{index:0});assert.equal(r.ok,true);assert.equal(r.state.enemies[1].suppression,4);
 const bad=state({hand:['x55'],enemies:[{hp:20,block:0,intent:[7]},{hp:20,block:0,intent:[]} ]});bad.mask=2;bad.exitGuard=4;
 assert.deepEqual(play(bad,{index:0}).state,bad);
});
test('new effects cancel and faults restore exit guard, suppression, duration, RNG and draw',()=>{
 for(const id of ['x55','x56'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]);
  const s=state({hand:[id],enemies:[{hp:30,block:0,intent:[8]}]});s.mask=1;s.exitGuard=4;s.discard=['x01','x02'];s.deckMode='shuffle';s.rng=2;const before=structuredClone(s);
  assert.deepEqual(play(s,{index:0,upgraded,cancel:true}).state,s);
  try{c[key].push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded}).state,s);assert.deepEqual(s,before);}finally{c[key]=old;}
 }
 const s=state({hand:['x55'],enemies:[{hp:30,block:0,intent:[8],suppression:Number.MAX_SAFE_INTEGER}]});assert.deepEqual(play(s,{index:0}).state,s);
});
test('previous entry guard exact integer maximum and one more restores real relic shuffle',()=>{
 for(const upgraded of [false,true]){
  const s=state({hand:['x54'],startingRelic:true});s.entryGuard=4;s.block=Number.MAX_SAFE_INTEGER-4;s.deckMode='shuffle';s.rng=3;s.discard=['x01','x02'];
  assert.equal(play(s,{index:0,upgraded}).state.block,Number.MAX_SAFE_INTEGER);s.block++;assert.deepEqual(play(s,{index:0,upgraded}).state,s);
 }
});
