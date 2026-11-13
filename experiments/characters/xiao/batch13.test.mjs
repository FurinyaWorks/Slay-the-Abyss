import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn,startTurn,cardText} from './model.mjs';
import {newBattle} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`calm draw next turn only, suppressed by mask upgraded=${upgraded}`,()=>{
  for(const mask of [0,1,2]){
   const s=state({hand:['x33'],draw:Array(10).fill('x01')});s.mask=mask;
   const r=play(s,{index:0,upgraded});assert.deepEqual(r.state.hand,[]);assert.equal(r.state.energy,1);assert.deepEqual(r.state.powers,['x33']);
   const n=startTurn(endTurn(r.state));assert.equal(n.hand.length,mask<2?(upgraded?7:6):5);assert.equal(n.energy,3);
  }
 });
 test(`exit energy needs entry and prepaid cost upgraded=${upgraded}`,()=>{
  for(const mask of [0,2]){
   const s=state({hand:['x34']});s.mask=mask;const r=play(s,{index:0,upgraded});
   assert.equal(r.state.mask,0);assert.equal(r.state.energy,mask?(upgraded?4:3):2);assert.deepEqual(r.state.exhaust,['x34']);assert.equal(r.state.hp,70);
  }
  const s=state({energy:0,hand:['x34']});s.mask=1;assert.deepEqual(play(s,{index:0,upgraded}).state,s);
 });
}
test('calm draw stacking capped at hand10, new battle resets lifecycle',()=>{
 let s=state({hand:['x33','x33','x33'],energy:6,draw:Array(20).fill('x01')});
 s=play(s,{index:0,upgraded:true}).state;s=play(s,{index:0,upgraded:true}).state;s=play(s,{index:0,upgraded:true}).state;
 const n=startTurn(endTurn(s));assert.equal(n.hand.length,10);assert.equal(n.draw.length,10);
 assert.equal(newBattle().calmDraw,0);assert.equal(newBattle().exitGuard,0);
});
test('conditional exit triggers exit guard once, no retro relic or repeat profit',()=>{
 let s=state({hand:['x34','x34'],startingRelic:true,draw:['x01']});s.mask=2;s.exitGuard=4;
 s=play(s,{index:0}).state;assert.equal(s.block,4);assert.equal(s.relicUsed,false);assert.deepEqual(s.hand,['x34']);
 s=play(s,{index:0}).state;assert.equal(s.block,4);assert.equal(s.energy,2);assert.deepEqual(s.exhaust,['x34','x34']);
});
test('exit recovery can find unplayed conditional exit but never consumed copy',()=>{
 let s=state({hand:['x16']});s.discard=['x34'];s=play(s,{index:0}).state;assert.deepEqual(s.hand,['x34']);
 s.mask=1;s=play(s,{index:0}).state;assert.deepEqual(s.exhaust,['x16','x34']);
});
test('all base/upgrade fault paths restore powers, mask, energy and zones',()=>{
 for(const id of ['x33','x34'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]);
  try{c[key].push({op:'fault',value:0});const s=state({hand:[id]});s.mask=2;s.exitGuard=4;assert.deepEqual(play(s,{index:0,upgraded}).state,s);}finally{c[key]=old;}
 }
});
