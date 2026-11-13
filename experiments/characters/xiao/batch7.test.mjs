import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,cardText} from './model.mjs';
for(const upgraded of [false,true]){
 test(`exhaust payoff zero, one, cap and overflow counts upgraded=${upgraded}`,()=>{
  for(const count of [0,1,6,8,20])for(const mask of [0,1]){
   const s=state({hand:['x21'],enemies:[{hp:100,block:4}]});s.exhaust=Array(count).fill('x17');s.mask=mask;
   const r=play(s,{index:0,upgraded});const amount=Math.min(upgraded?24:18,count*3)+(mask?4:0);
   assert.equal(r.state.enemies[0].hp,100-Math.max(0,amount-4));assert.equal(r.state.enemies[0].block,Math.max(0,4-amount));
   const b=state({hand:['x22']});b.exhaust=Array(count).fill('x17');assert.equal(play(b,{index:0,upgraded}).state.block,Math.min(upgraded?14:10,count*2));
  }
 });
 test(`cap text comes from upgraded structured effects ${upgraded}`,()=>{
  assert.ok(cardText(catalog.cards.find(c=>c.id==='x21'),upgraded).includes(upgraded?'24点':'18点'));
  assert.ok(cardText(catalog.cards.find(c=>c.id==='x22'),upgraded).includes(upgraded?'14点':'10点'));
 });
}
test('real burn then payoff counts actual exhausted cards, not discard or powers',()=>{
 let s=state({hand:['x19','x02','x06','x21']});s=play(s,{index:0}).state;
 assert.equal(s.exhaust.length,2);assert.equal(s.hand[0],'x21');s=play(s,{index:0}).state;
 assert.equal(s.enemies[0].hp,24);assert.equal(s.block,8);assert.equal(s.energy,1);assert.deepEqual(s.discard,['x19','x21']);
});
test('payoff illegal target or effect fault restores all state',()=>{
 const s=state({hand:['x21']});s.exhaust=['x17'];assert.deepEqual(play(s,{index:0,target:5}).state,s);
 const c=catalog.cards.find(c=>c.id==='x22'),old=structuredClone(c.upgrade);
 try{c.upgrade.push({op:'fault',value:0});const b=state({hand:['x22']});b.exhaust=['x17'];assert.deepEqual(play(b,{index:0,upgraded:true}).state,b);}finally{c.upgrade=old;}
});
