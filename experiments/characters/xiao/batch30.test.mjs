import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn,startTurn} from './model.mjs';
import {newBattle,advance} from './battle.mjs';
import {observe} from './research.mjs';
for(const upgraded of [false,true]){
 test(`natural expiry after surviving life cost reserves next energy upgraded=${upgraded}`,()=>{
  let s=state({hand:['x67'],hp:3});s.mask=1;s=play(s,{index:0,upgraded}).state;
  assert.equal(s.reservedEnergy,0);const e=endTurn(s);assert.equal(e.hp,1);assert.equal(e.reservedEnergy,upgraded?2:1);
  const n=startTurn(e);assert.equal(n.energy,upgraded?5:4);assert.equal(n.reservedEnergy,0);assert.equal(newBattle().expiryEnergy,0);
 });
 test(`all shield for energy only when positive, finite own exhaust upgraded=${upgraded}`,()=>{
  for(const block of [0,1,20]){
   const s=state({hand:['x68'],energy:0});s.block=block;
   const r=play(s,{index:0,upgraded});assert.equal(r.ok,true);assert.equal(r.state.block,0);assert.equal(r.state.energy,block?(upgraded?2:1):0);assert.deepEqual(r.state.exhaust,['x68']);
  }
 });
}
test('no expiry bonus on manual exit, nonfinal tick or life death; stack does not save dying',()=>{
 for(const action of ['exit','early','death']){
  let s=state({hand:['x67','x67','x06'],energy:3,hp:action==='death'?2:70});s.mask=action==='early'?2:1;
  s=play(s,{index:0}).state;s=play(s,{index:0,upgraded:true}).state;assert.equal(s.expiryEnergy,3);
  if(action==='exit')s=play(s,{index:0}).state;
  const e=endTurn(s);assert.equal(e.reservedEnergy,0);if(action==='death')assert.equal(e.hp,0);
 }
});
test('expiry bonus realized only if actual enemy action survived; shield sacrifice can kill',()=>{
 const s=newBattle({hp:3});s.mask=1;s.expiryEnergy=2;const r=advance(s);assert.equal(r.hp,0);assert.equal(r.phase,'enemy');assert.equal(r.reservedEnergy,2);
 let b=newBattle({hp:4});b.hand=['x68'];b.block=20;b=play(b,{index:0}).state;assert.equal(advance(b).hp,0);
});
test('exhaust guard triggers after shield payment, zero shield cannot use future trigger as payment',()=>{
 const s=state({hand:['x68']});s.exhaustGuard=2;
 const r=play(s,{index:0,upgraded:true});assert.equal(r.state.energy,3);assert.equal(r.state.block,2);
 s.block=1;const q=play(s,{index:0,upgraded:true});assert.equal(q.state.energy,5);assert.equal(q.state.block,2);
});
test('forms fault/cancel atomic, reserve overflow during end restores battle turn, energy exact bound',()=>{
 for(const id of ['x67','x68'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]),s=state({hand:[id]});s.block=8;
  assert.deepEqual(play(s,{index:0,upgraded,cancel:true}).state,s);
  try{c[key].push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded}).state,s);}finally{c[key]=old;}
 }
 const s=newBattle();s.mask=1;s.expiryEnergy=1;s.reservedEnergy=Number.MAX_SAFE_INTEGER;assert.deepEqual(advance(s),s);
 const a=state({hand:['x67']});a.expiryEnergy=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(a,{index:0}).state,a);
 for(const upgraded of [false,true]){
  const b=state({hand:['x68'],energy:Number.MAX_SAFE_INTEGER-(upgraded?2:1)});b.block=4;assert.equal(play(b,{index:0,upgraded}).state.energy,Number.MAX_SAFE_INTEGER);b.energy++;assert.deepEqual(play(b,{index:0,upgraded}).state,b);
 }
});
test('previous tutor information isolation, transfer rollback and mask suppression exact MAX',()=>{
 const s=state({hand:['x65'],draw:['x04','x10','x01'],enemies:[{hp:30,block:0,intent:[8]}]});const other=structuredClone(s);other.draw.reverse();assert.deepEqual(observe(s),observe(other));
 s.block=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(s,{index:0}).state,s);
 for(const upgraded of [false,true]){
  const b=state({hand:['x66'],enemies:[{hp:30,block:0,intent:[8],suppression:Number.MAX_SAFE_INTEGER-3*(upgraded?3:2)}]});b.mask=3;
  assert.equal(play(b,{index:0,upgraded}).state.enemies[0].suppression,Number.MAX_SAFE_INTEGER);b.enemies[0].suppression++;assert.deepEqual(play(b,{index:0,upgraded}).state,b);
 }
});
