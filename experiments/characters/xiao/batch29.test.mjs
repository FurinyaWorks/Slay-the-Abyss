import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn} from './model.mjs';
import {newBattle,advance,intent} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`entry tutor first qualifying draw card only, no copying or shuffle upgraded=${upgraded}`,()=>{
  const s=state({hand:['x65'],draw:['x01','x56','x54','x04','x10']});s.discard=['x04'];s.deckMode='shuffle';s.rng=7;
  const r=play(s,{index:0,upgraded});assert.equal(r.ok,true);assert.deepEqual(r.state.hand,['x54']);assert.deepEqual(r.state.draw,['x01','x56','x04','x10']);assert.deepEqual(r.state.discard,['x04']);assert.equal(r.state.rng,7);assert.equal(r.state.block,upgraded?6:3);assert.deepEqual(r.state.exhaust,['x65']);
 });
 test(`mask suppression scales duration without consuming it upgraded=${upgraded}`,()=>{
  for(const mask of [0,1,2,3]){
   const s=state({hand:['x66'],enemies:[{hp:50,block:0,intent:[12]}]});s.mask=mask;
   const r=play(s,{index:0,upgraded});assert.equal(r.ok,true);assert.equal(r.state.enemies[0].hp,50-(upgraded?7:5)-(mask?4:0));assert.equal(intent(r.state,r.state.enemies[0]),12-mask*(upgraded?3:2));assert.equal(r.state.mask,mask);
  }
 });
}
test('entry tutor does not find pure extension/exit or discard; full starting hand has one freed slot',()=>{
 const empty=state({hand:['x65'],draw:['x56','x06']});empty.discard=['x04'];const r=play(empty,{index:0});assert.deepEqual(r.state.hand,[]);assert.deepEqual(r.state.draw,['x56','x06']);assert.deepEqual(r.state.discard,['x04']);
 const full=state({hand:['x65',...Array(9).fill('x01')],draw:['x04','x10']});const z=play(full,{index:0});assert.equal(z.state.hand.length,10);assert.equal(z.state.hand.at(-1),'x04');assert.deepEqual(z.state.draw,['x10']);
});
test('tutor then actual entry remains costly and triggers relic only when playing entry',()=>{
 let s=state({hand:['x65'],draw:['x02','x04','x01'],startingRelic:true});s=play(s,{index:0}).state;assert.equal(s.relicUsed,false);assert.equal(s.hp,70);
 s=play(s,{index:0}).state;assert.equal(s.relicUsed,true);assert.equal(s.hp,68);assert.equal(s.energy,1);assert.equal(s.mask,2);
});
test('suppression does not save mask life, expires after actual attack; kill needs no dead intent',()=>{
 const s=newBattle();s.hand=['x66'];s.mask=2;
 const r=play(s,{index:0});const n=advance(r.state);assert.equal(n.hp,64);assert.equal(n.enemies[0].suppression,0);
 const d=state({hp:2,hand:['x66'],enemies:[{hp:30,block:0,intent:[0]}]});d.mask=1;assert.equal(endTurn(play(d,{index:0}).state).hp,0);
 const kill=state({hand:['x66'],enemies:[{hp:1,block:0}]});kill.mask=1;assert.equal(play(kill,{index:0}).ok,true);
});
test('new forms faults/cancel/energy and masked bad intent reject all prior effects',()=>{
 for(const id of ['x65','x66'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]);
  const s=state({hand:[id],draw:['x04','x01'],enemies:[{hp:30,block:0,intent:[8]}]});s.mask=1;const copy=structuredClone(s);
  assert.deepEqual(play(s,{index:0,upgraded,cancel:true}).state,s);
  try{c[key].push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded}).state,s);assert.deepEqual(s,copy);}finally{c[key]=old;}
  s.energy=0;assert.deepEqual(play(s,{index:0,upgraded}).state,s);
 }
 const bad=state({hand:['x66'],enemies:[{hp:30,block:0,intent:[]}]});bad.mask=1;assert.deepEqual(play(bad,{index:0}).state,bad);
});
test('previous calm supply exact MAX and killing shorten attack exit overflow',()=>{
 for(const upgraded of [false,true]){
  const s=state({hand:['x64']});s.block=Number.MAX_SAFE_INTEGER-(upgraded?9:6);assert.equal(play(s,{index:0,upgraded}).state.block,Number.MAX_SAFE_INTEGER);s.block++;assert.deepEqual(play(s,{index:0,upgraded}).state,s);
  const k=state({hand:['x63'],enemies:[{hp:1,block:0}]});k.mask=1;k.exitGuard=1;k.block=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(k,{index:0,upgraded}).state,k);
 }
});
