import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn,startTurn,cardText} from './model.mjs';
import {newBattle,advance} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`x12 all-target with armor/dead enemy; base and mask upgraded=${upgraded}`,()=>{
  for(const mask of [0,2]){const s=state({hand:['x12'],enemies:[{hp:30,block:3},{hp:10,block:0},{hp:0,block:5}]});s.mask=mask;
   const r=play(s,{index:0,upgraded});const expected=(upgraded?9:6)+(mask?4:0);
   assert.equal(r.state.enemies[0].hp,33-expected);assert.equal(r.state.enemies[1].hp,Math.max(0,10-expected));assert.deepEqual(r.state.enemies[2],{hp:0,block:5});
  }
 });
 test(`x13 conditional block both states upgraded=${upgraded}`,()=>{
  for(const mask of [0,2]){const s=state({hand:['x13']});s.mask=mask;const r=play(s,{index:0,upgraded});assert.equal(r.state.block,mask?(upgraded?12:8):(upgraded?6:4));assert.equal(r.state.energy,2);}
 });
 test(`x14 power exits deck, ticks after life, expires with mask upgraded=${upgraded}`,()=>{
  const s=state({hp:8,hand:['x14']});s.mask=1;const r=play(s,{index:0,upgraded});assert.deepEqual(r.state.powers,['x14']);assert.deepEqual(r.state.discard,[]);
  const e=endTurn(r.state);assert.equal(e.hp,6);assert.equal(e.block,upgraded?4:3);assert.equal(e.mask,0);
  const next=endTurn(startTurn(e));assert.equal(next.block,0);assert.equal(next.hp,6);
  assert.ok(cardText(catalog.cards.find(c=>c.id==='x14'),upgraded).includes(upgraded?'4点格挡':'3点格挡'));
 });
}
test('powers stack, cannot shield lethal HP payment, reset at next combat',()=>{
 let s=state({hp:2,hand:['x14','x14']});s.mask=1;s=play(s,{index:0}).state;s=play(s,{index:0,upgraded:true}).state;
 assert.equal(s.maskGuard,7);assert.equal(endTurn(s).hp,0);assert.equal(endTurn(s).block,0);
 const n=newBattle();assert.equal(n.maskGuard,0);assert.deepEqual(n.powers,[]);
});
test('mask power block defends actual enemy action but never heals life',()=>{
 let s=newBattle({deck:['x14'],hp:20});s.mask=1;s=play(s,{index:0}).state;
 const n=advance(s);assert.equal(n.hp,13); // 20 -2 mask - (8 intention -3 guard)
});
test('power exception and numeric overflow reject all zones/resources atomically',()=>{
 const card=catalog.cards.find(c=>c.id==='x14'),old=structuredClone(card.base);
 try{card.base.push({op:'fault',value:0});const s=state({hand:['x14']});assert.deepEqual(play(s,{index:0}).state,s);}finally{card.base=old;}
 const s=state({hand:['x14']});s.maskGuard=Number.MAX_SAFE_INTEGER;assert.equal(play(s,{index:0}).ok,false);
});
test('x11 upgrade illegal target and exception after damage/exit preserve input',()=>{
 const s=state({hand:['x11']});s.mask=2;assert.deepEqual(play(s,{index:0,target:2,upgraded:true}).state,s);
 const c=catalog.cards.find(c=>c.id==='x11'),old=structuredClone(c.upgrade);
 try{c.upgrade.push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded:true}).state,s);}finally{c.upgrade=old;}
});
test('end-turn aggregate block overflow rejects atomically',()=>{
 const s=state();s.mask=1;s.block=Number.MAX_SAFE_INTEGER;s.maskGuard=3;
 assert.deepEqual(endTurn(s),s);
});
