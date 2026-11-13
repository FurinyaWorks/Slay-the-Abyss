import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn,startTurn,cardText} from './model.mjs';
import {newBattle} from './battle.mjs';
import {observe,choose} from './research.mjs';
for(const upgraded of [false,true]){
 test(`sequence count before self, capped bonus and mask upgraded=${upgraded}`,()=>{
  for(const count of [0,1,3,4])for(const mask of [0,1]){
   const s=state({hand:['x41'],enemies:[{hp:60,block:2}]});s.attacksPlayed=count;s.mask=mask;
   const r=play(s,{index:0,upgraded});assert.equal(r.ok,true);
   assert.equal(r.state.enemies[0].hp,62-(upgraded?5:3)-Math.min(3,count)*(upgraded?4:3)-(mask?4:0));assert.equal(r.state.attacksPlayed,count+1);
  }
 });
 test(`defense before attacks versus after upgraded=${upgraded}`,()=>{
  for(const count of [0,1,2]){
   const s=state({hand:['x42']});s.attacksPlayed=count;
   const r=play(s,{index:0,upgraded});assert.equal(r.state.block,(upgraded?6:4)+(count===0?(upgraded?6:5):0));assert.equal(r.state.attacksPlayed,count);
  }
 });
}
test('real multihit counts card once; exit attack counts, skill does not; next turn and battle reset',()=>{
 let s=state({energy:5,hand:['x35','x11','x42','x41'],enemies:[{hp:100,block:0}]});s.mask=2;
 s=play(s,{index:0}).state;assert.equal(s.attacksPlayed,1);
 s=play(s,{index:0}).state;assert.equal(s.attacksPlayed,2);assert.equal(s.mask,0);
 s=play(s,{index:0}).state;assert.equal(s.attacksPlayed,2);assert.equal(s.block,4);
 const before=s.enemies[0].hp;s=play(s,{index:0}).state;assert.equal(before-s.enemies[0].hp,9);
 assert.equal(startTurn(endTurn(s)).attacksPlayed,0);assert.equal(newBattle().attacksPlayed,0);
});
test('zero damage successful attack counts, cancel and failed target never count',()=>{
 let s=state({hand:['x37','x41'],enemies:[{hp:50,block:0}]});s=play(s,{index:0}).state;assert.equal(s.enemies[0].hp,50);assert.equal(s.attacksPlayed,1);
 assert.deepEqual(play(s,{index:0,cancel:true}).state,s);assert.deepEqual(play(s,{index:0,target:9}).state,s);
});
test('counter bounds and four new forms post-effect failure roll back counter, HP and zones',()=>{
 for(const id of ['x41','x42'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]);
  assert.match(cardText(c,upgraded),/本回合/);
  const s=state({hand:[id]});s.attacksPlayed=1;const before=structuredClone(s);
  try{c[key].push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded}).state,s);assert.deepEqual(s,before);}finally{c[key]=old;}
 }
 for(const count of [NaN,-1,undefined]){
  const s=state({hand:['x41']});s.attacksPlayed=count;assert.deepEqual(play(s,{index:0}).state,s);
 }
 const s=state({hand:['x41']});s.attacksPlayed=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(s,{index:0}).state,s);
});
test('public turn attack count visible to proxy with no hidden piles',()=>{
 const s=state({hand:['x41'],enemies:[{hp:50,block:0,intent:[8]}]});s.attacksPlayed=2;
 const view=observe(s);assert.equal(view.attacksPlayed,2);assert.equal('draw' in view,false);assert.ok(choose(view,'guard'));
});
