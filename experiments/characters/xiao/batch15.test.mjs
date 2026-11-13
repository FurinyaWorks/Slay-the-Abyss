import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,cardText,endTurn} from './model.mjs';
for(const upgraded of [false,true]){
 test(`shield damage exact cap and mask independent upgraded=${upgraded}`,()=>{
  for(const block of [0,4,14,20,100])for(const mask of [0,1]){
   const s=state({hand:['x37'],enemies:[{hp:50,block:3}]});s.block=block;s.mask=mask;
   const r=play(s,{index:0,upgraded});assert.equal(r.ok,true);
   assert.equal(r.state.enemies[0].hp,50-Math.max(0,Math.min(upgraded?20:14,block)+(mask?4:0)-3));assert.equal(r.state.block,block);
  }
 });
 test(`spend all shield including remainder, bounded draw upgraded=${upgraded}`,()=>{
  for(const block of [0,4,5,9,10,15,99]){
   const s=state({hand:['x38'],draw:Array(8).fill('x01')});s.block=block;
   const r=play(s,{index:0,upgraded});assert.equal(r.ok,true);assert.equal(r.state.block,0);
   assert.equal(r.state.hand.length,Math.min(upgraded?3:2,Math.floor(block/5)));assert.deepEqual(r.state.exhaust,['x38']);assert.equal(r.state.energy,3);
  }
 });
}
test('shield sacrifice order changes attack damage, never protects mask HP payment',()=>{
 let a=state({hp:2,hand:['x38','x37'],draw:['x02','x02']});a.block=10;a.mask=1;
 a=play(a,{index:0}).state;a=play(a,{index:0}).state;assert.equal(a.enemies[0].hp,26);assert.equal(endTurn(a).hp,0);
 let b=state({hand:['x37','x38'],draw:['x02','x02']});b.block=10;
 b=play(b,{index:0}).state;b=play(b,{index:0}).state;assert.equal(b.enemies[0].hp,20);assert.equal(b.block,0);
});
test('actual defense to sacrifice reshuffle excludes resolving card, full hand loses overflow draw',()=>{
 let s=state({hand:['x02','x38']});s.deckMode='shuffle';s.rng=7;
 s=play(s,{index:0}).state;s=play(s,{index:0}).state;assert.deepEqual(s.hand,['x02']);assert.deepEqual(s.exhaust,['x38']);
 const full=state({hand:['x38',...Array(9).fill('x01')],draw:['x02','x03','x05']});full.block=15;
 const r=play(full,{index:0,upgraded:true});assert.equal(r.state.hand.length,10);assert.equal(r.state.draw.length,2);assert.equal(r.state.block,0);
});
test('both variants text, cancelled and post-effect faults preserve input including rng',()=>{
 for(const id of ['x37','x38'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]);
  assert.match(cardText(c,upgraded),new RegExp(String(upgraded?(id==='x37'?20:3):(id==='x37'?14:2))));
  const s=state({hand:[id]});s.block=15;s.discard=['x01','x02'];s.deckMode='shuffle';s.rng=12;const before=structuredClone(s);
  assert.deepEqual(play(s,{index:0,upgraded,cancel:true}).state,s);
  try{c[key].push({op:'fault',value:0});const r=play(s,{index:0,upgraded});assert.equal(r.ok,false);assert.deepEqual(r.state,s);assert.deepEqual(s,before);}finally{c[key]=old;}
 }
});
test('damage requires live target while sacrifice is untargeted and safe integer maximum capped',()=>{
 const a=state({hand:['x37']});a.block=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(a,{index:0,target:4}).state,a);assert.equal(play(a,{index:0,upgraded:true}).state.enemies[0].hp,10);
 const b=state({hand:['x38'],draw:['x01','x02','x03']});b.block=Number.MAX_SAFE_INTEGER;assert.equal(play(b,{index:0,target:99,upgraded:true}).state.hand.length,3);
});
