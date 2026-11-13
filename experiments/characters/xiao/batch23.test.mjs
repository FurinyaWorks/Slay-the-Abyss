import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn} from './model.mjs';
import {newBattle} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`entry guard only true transition, stacks and not retroactive upgraded=${upgraded}`,()=>{
  let s=state({hand:['x53','x53','x04','x10','x06','x54'],energy:8,draw:[]});
  s=play(s,{index:0,upgraded}).state;s=play(s,{index:0,upgraded}).state;assert.equal(s.block,0);
  s=play(s,{index:0}).state;assert.equal(s.block,upgraded?12:8);
  s=play(s,{index:0}).state;assert.equal(s.block,(upgraded?12:8)+8);assert.equal(s.mask,2);
  s=play(s,{index:0}).state;s=play(s,{index:0}).state;assert.equal(s.block,2*(upgraded?12:8)+12);
  assert.equal(newBattle().entryGuard,0);
 });
 test(`attack entry pays life, gains mask before damage and relic before ending upgraded=${upgraded}`,()=>{
  const s=state({hand:['x54'],draw:['x02'],startingRelic:true,enemies:[{hp:50,block:2}]});s.entryGuard=4;
  const r=play(s,{index:0,upgraded});assert.equal(r.ok,true);assert.equal(r.state.hp,68);assert.equal(r.state.mask,1);
  assert.equal(r.state.enemies[0].hp,52-(upgraded?14:11));assert.equal(r.state.block,4);assert.deepEqual(r.state.hand,['x02']);assert.equal(r.state.relicUsed,true);
 });
}
test('entry attack starting unmasked does not consume masked attack power quota; masked refresh does',()=>{
 let s=state({hand:['x54'],draw:['x01','x02'],startingRelic:true});s.maskedAttackDraw=1;
 let r=play(s,{index:0});assert.equal(r.state.hand.length,1);assert.equal(r.state.maskedDrawUsed,false);
 s.mask=3;r=play(s,{index:0});assert.equal(r.state.mask,3);assert.equal(r.state.hp,68);assert.equal(r.state.hand.length,1);assert.equal(r.state.maskedDrawUsed,true);assert.equal(r.state.relicUsed,false);
});
test('life threshold and target reject before entry; last HP mask can kill despite entry shield',()=>{
 for(const hp of [2,3]){
  const s=state({hp,hand:['x54']});s.entryGuard=6;
  const r=play(s,{index:0});assert.equal(r.ok,hp===3);
  if(hp===3)assert.equal(endTurn(r.state).hp,0);else assert.deepEqual(r.state,s);
 }
 const s=state({hand:['x54'],startingRelic:true,draw:['x01']});assert.deepEqual(play(s,{index:0,target:9}).state,s);
});
test('ability played while already masked gives no immediate guard or entry event',()=>{
 const s=state({hand:['x53']});s.mask=2;const r=play(s,{index:0});assert.equal(r.state.block,0);assert.equal(r.state.entryGuard,4);
});
test('new forms post-entry shuffle faults restore life, relic, entry shield and ability',()=>{
 for(const id of ['x53','x54'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]),s=state({hand:[id],startingRelic:true});
  s.entryGuard=4;s.deckMode='shuffle';s.rng=2;s.discard=['x01','x02'];const before=structuredClone(s);
  assert.deepEqual(play(s,{index:0,upgraded,cancel:true}).state,s);
  try{c[key].push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded}).state,s);assert.deepEqual(s,before);}finally{c[key]=old;}
 }
 const s=state({hand:['x53']});s.entryGuard=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(s,{index:0}).state,s);
 const a=state({hand:['x54']});a.entryGuard=1;a.block=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(a,{index:0}).state,a);
});
test('previous life shield plus exhaust guard exact combined integer maximum',()=>{
 for(const upgraded of [false,true]){
  const s=state({hp:4,hand:['x51']});s.exhaustGuard=2;s.block=Number.MAX_SAFE_INTEGER-(upgraded?12:9)-2;
  assert.equal(play(s,{index:0,upgraded}).state.block,Number.MAX_SAFE_INTEGER);s.block++;assert.deepEqual(play(s,{index:0,upgraded}).state,s);
 }
});
test('proxy cannot select life-cost attack with insufficient HP',async()=>{
 const {observe,choose}=await import('./research.mjs');
 const s=state({hp:2,hand:['x54'],enemies:[{hp:50,block:0,intent:[8]}]});assert.equal(choose(observe(s),'burst'),null);
 s.hp=3;assert.equal(choose(observe(s),'burst').index,0);
});
