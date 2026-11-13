import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,cardText} from './model.mjs';
for(const upgraded of [false,true]){
 test(`refill after self leaves hand, existing cards count upgraded=${upgraded}`,()=>{
  for(const n of [0,2,4,5,9]){
   const s=state({hand:['x49',...Array(n).fill('x01')],draw:Array(10).fill('x02')});s.exhaustGuard=2;
   const r=play(s,{index:0,upgraded});assert.equal(r.ok,true);assert.equal(r.state.hand.length,Math.max(n,upgraded?5:4));assert.deepEqual(r.state.exhaust,['x49']);assert.equal(r.state.block,2);
  }
 });
 test(`empty hand payoff measured before masked draw, no false empty with another card upgraded=${upgraded}`,()=>{
  for(const other of [false,true])for(const mask of [0,1]){
   const s=state({hand:other?['x50','x02']:['x50'],draw:['x03'],enemies:[{hp:50,block:3}]});s.mask=mask;s.maskedAttackDraw=1;
   const r=play(s,{index:0,upgraded});const hit=(upgraded?7:5)+(other?0:upgraded?11:9)+(mask?4:0);
   assert.equal(r.state.enemies[0].hp,53-hit);assert.equal(r.state.hand.includes('x03'),Boolean(mask));assert.equal(r.state.attacksPlayed,1);
  }
 });
}
test('refill real shuffle excludes resolving card, can fail to fill without creating copies',()=>{
 const s=state({hand:['x49']});s.discard=['x01','x02'];s.deckMode='shuffle';s.rng=3;
 const r=play(s,{index:0});assert.equal(r.state.hand.length,2);assert.deepEqual([...r.state.hand].sort(),['x01','x02']);assert.deepEqual(r.state.exhaust,['x49']);assert.equal(r.state.draw.length,0);
 const empty=state({hand:['x49']});assert.deepEqual(play(empty,{index:0}).state.hand,[]);
});
test('refilling before finishing prevents empty-hand bonus; spending other card first earns it',()=>{
 let a=state({hand:['x49','x50'],draw:['x02','x03','x05'],enemies:[{hp:50,block:0}]});a=play(a,{index:0}).state;a=play(a,{index:0}).state;assert.equal(a.enemies[0].hp,45);
 let b=state({hand:['x02','x50'],enemies:[{hp:50,block:0}]});b=play(b,{index:0}).state;b=play(b,{index:0}).state;assert.equal(b.enemies[0].hp,36);
});
test('four forms strict text, cancellation and faults after reshuffle or damage are atomic',()=>{
 for(const id of ['x49','x50'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]);
  assert.match(cardText(c,upgraded),/手/);const s=state({hand:[id]});s.discard=['x01','x02'];s.deckMode='shuffle';s.rng=3;const copy=structuredClone(s);
  assert.deepEqual(play(s,{index:0,upgraded,cancel:true}).state,s);
  try{c[key].push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded}).state,s);assert.deepEqual(s,copy);}finally{c[key]=old;}
 }
});
test('previous exhaust shield exact MAX and next point fail with real shuffled fuel',()=>{
 for(const upgraded of [false,true]){
  const s=state({hand:['x48']});s.discard=['x01','x02','x03'];s.deckMode='shuffle';s.rng=9;s.exhaustGuard=2;s.block=Number.MAX_SAFE_INTEGER-2;
  assert.equal(play(s,{index:0,upgraded}).state.block,Number.MAX_SAFE_INTEGER);s.block++;assert.deepEqual(play(s,{index:0,upgraded}).state,s);
 }
});
