import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn,cardText} from './model.mjs';
for(const upgraded of [false,true]){
 test(`blood shield life threshold prepay, independent of shield upgraded=${upgraded}`,()=>{
  for(const hp of [3,4,5]){
   const s=state({hand:['x51'],hp,energy:0});s.block=20;
   const r=play(s,{index:0,upgraded});assert.equal(r.ok,hp>3);
   if(hp<=3)assert.deepEqual(r.state,s);else{assert.equal(r.state.hp,hp-3);assert.equal(r.state.block,20+(upgraded?12:9));assert.deepEqual(r.state.exhaust,['x51']);assert.equal(r.state.energy,0);}
  }
 });
 test(`missing life floors and caps without extra HP payment upgraded=${upgraded}`,()=>{
  for(const hp of [70,61,60,51,50,20,10,1])for(const mask of [0,1]){
   const s=state({hp,hand:['x52'],enemies:[{hp:50,block:2}]});s.mask=mask;
   const r=play(s,{index:0,upgraded});assert.equal(r.ok,true);
   const damage=(upgraded?6:4)+Math.min(upgraded?12:10,Math.floor((70-hp)/10)*2)+(mask?4:0);
   assert.equal(r.state.enemies[0].hp,52-damage);assert.equal(r.state.hp,hp);
  }
 });
}
test('pay blood before attack can cross damage threshold but cannot prevent mask death',()=>{
 let s=state({hp:62,hand:['x51','x52'],enemies:[{hp:50,block:0}]});s=play(s,{index:0}).state;s=play(s,{index:0}).state;assert.equal(s.hp,59);assert.equal(s.enemies[0].hp,44);
 let d=state({hp:5,hand:['x51']});d.mask=1;d=play(d,{index:0}).state;assert.equal(d.block,9);assert.equal(endTurn(d).hp,0);
});
test('blood shield own exhaust triggers only after pay and shield, rejected life does not trigger',()=>{
 const s=state({hp:4,hand:['x51']});s.exhaustGuard=2;const r=play(s,{index:0});assert.equal(r.state.block,11);assert.equal(r.state.hp,1);
 s.hp=3;assert.deepEqual(play(s,{index:0}).state,s);
});
test('four forms cancel and faults preserve HP target and zones, shield overflow rejects life payment',()=>{
 for(const id of ['x51','x52'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]);
  assert.match(cardText(c,upgraded),/生命/);const s=state({hp:20,hand:[id]}),copy=structuredClone(s);
  assert.deepEqual(play(s,{index:0,upgraded,cancel:true}).state,s);
  try{c[key].push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded}).state,s);assert.deepEqual(s,copy);}finally{c[key]=old;}
 }
 const s=state({hp:4,hand:['x51']});s.block=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(s,{index:0}).state,s);
});
test('previous refill real shuffle then own exhaust guard overflow restores all state',()=>{
 for(const upgraded of [false,true]){
  const s=state({hand:['x49']});s.discard=['x01','x02','x03'];s.deckMode='shuffle';s.rng=4;s.exhaustGuard=2;s.block=Number.MAX_SAFE_INTEGER-1;const copy=structuredClone(s);
  assert.deepEqual(play(s,{index:0,upgraded}).state,s);assert.deepEqual(s,copy);
 }
});
