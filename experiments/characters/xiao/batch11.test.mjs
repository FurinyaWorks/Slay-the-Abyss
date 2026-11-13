import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn,cardText} from './model.mjs';
import {newBattle} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`exit power card exit once, no trigger empty or natural expiry upgraded=${upgraded}`,()=>{
  let s=state({hand:['x29','x06','x09']});s.mask=1;
  s=play(s,{index:0,upgraded}).state;assert.equal(s.block,0);assert.deepEqual(s.powers,['x29']);
  s=play(s,{index:0}).state;assert.equal(s.block,(upgraded?6:4)+4);
  s=play(s,{index:0}).state;assert.equal(s.block,(upgraded?6:4)+4);
  const natural=state({hand:['x29']});natural.mask=1;const n=play(natural,{index:0,upgraded}).state;assert.equal(endTurn(n).block,0);
 });
 test(`unmasked attack draw after damage, masked no draw upgraded=${upgraded}`,()=>{
  for(const mask of [0,2]){const s=state({hand:['x30'],draw:['x01'],enemies:[{hp:30,block:2}]});s.mask=mask;
   const r=play(s,{index:0,upgraded});assert.equal(r.state.enemies[0].hp,32-(upgraded?8:5)-(mask?4:0));assert.deepEqual(r.state.hand,mask?[]:['x01']);assert.equal(r.state.energy,2);
  }
 });
}
test('shorten-to-zero triggers active exit power, partial shorten does not',()=>{
 for(const mask of [1,2]){let s=state({hand:['x29','x27']});s.mask=mask;s=play(s,{index:0}).state;s=play(s,{index:0}).state;assert.equal(s.block,mask===1?11:7);}
});
test('exit power stacks, new combat resets; cancellation and overflow preserve state',()=>{
 let s=state({hand:['x29','x29']});s=play(s,{index:0}).state;s=play(s,{index:0,upgraded:true}).state;assert.equal(s.exitGuard,10);
 assert.equal(newBattle().exitGuard,0);
 const b=state({hand:['x06']});b.mask=1;b.block=Number.MAX_SAFE_INTEGER;b.exitGuard=4;
 assert.deepEqual(play(b,{index:0,cancel:true}).state,b);assert.deepEqual(play(b,{index:0}).state,b);
});
test('active exit fault restores mask, power gains and all zones',()=>{
 const c=catalog.cards.find(c=>c.id==='x06'),old=structuredClone(c.base);
 try{c.base.push({op:'fault',value:0});const s=state({hand:['x06']});s.mask=1;s.exitGuard=4;assert.deepEqual(play(s,{index:0}).state,s);}finally{c.base=old;}
});
test('all new base/upgrade fault paths reject atomically',()=>{
 for(const id of ['x29','x30'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]);
  try{c[key].push({op:'fault',value:0});const s=state({hand:[id],draw:['x01']});assert.deepEqual(play(s,{index:0,upgraded}).state,s);}finally{c[key]=old;}
 }
});
