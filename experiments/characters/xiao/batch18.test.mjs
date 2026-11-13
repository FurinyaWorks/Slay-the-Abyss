import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn,startTurn,cardText} from './model.mjs';
import {newBattle,advance} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`kill draw uses post-armor exact target death upgraded=${upgraded}`,()=>{
  const amount=upgraded?16:12;
  for(const hp of [amount-3,amount-2,amount-1]){
   const s=state({hand:['x43'],draw:['x01','x02'],enemies:[{hp,block:2},{hp:30,block:0}]});
   const r=play(s,{index:0,upgraded});assert.equal(r.ok,true);assert.equal(r.state.hand.length,hp<=amount-2?2:0);assert.deepEqual(r.state.exhaust,['x43']);
  }
 });
 test(`carry leftover only no immediate block and cap upgraded=${upgraded}`,()=>{
  let s=state({hand:['x44']});s.block=20;s=play(s,{index:0,upgraded}).state;assert.equal(s.block,20);
  const n=startTurn(endTurn(s));assert.equal(n.block,upgraded?8:5);
  const empty=state({hand:['x44']});const p=play(empty,{index:0,upgraded}).state;assert.equal(startTurn(endTurn(p)).block,0);
 });
}
test('kill last enemy may draw but combat-ended forbids playing drawn cards; dead target rejected',()=>{
 const s=state({hand:['x43'],draw:['x01','x02'],enemies:[{hp:12,block:0}]});
 const r=play(s,{index:0});assert.equal(r.state.hand.length,2);assert.equal(play(r.state,{index:0}).reason,'combat-ended');
 const dead=state({hand:['x43'],enemies:[{hp:0,block:0},{hp:20,block:0}]});assert.deepEqual(play(dead,{index:0}).state,dead);
});
test('masked final hit kills; kill draw precedes masked power draw and full hand cap',()=>{
 const s=state({hand:['x43',...Array(8).fill('x02')],draw:['x01','x03','x05','x06'],enemies:[{hp:16,block:0},{hp:30,block:0}]});s.mask=1;s.maskedAttackDraw=1;
 const r=play(s,{index:0});assert.equal(r.state.hand.length,10);assert.deepEqual(r.state.hand.slice(-2),['x01','x03']);assert.equal(r.state.maskedDrawUsed,true);assert.equal(r.state.draw.length,2);
});
test('carry occurs after real enemy damage; cap stacks and new combat clears',()=>{
 let s=newBattle();s.hand=['x44','x44'];s.energy=4;s.block=20;s=play(s,{index:0}).state;s=play(s,{index:0}).state;
 assert.equal(s.carryBlock,10);const n=advance(s);assert.equal(n.block,10);assert.equal(n.hp,s.hp);assert.equal(newBattle().carryBlock,0);
 const destroyed=newBattle();destroyed.carryBlock=8;destroyed.block=3;assert.equal(advance(destroyed).block,0);
});
test('mask can still kill before carry and sacrificing shield removes future carry',()=>{
 const s=state({hp:2,hand:['x38'],draw:['x01']});s.mask=1;s.block=20;s.carryBlock=8;
 const r=play(s,{index:0});assert.equal(r.state.block,0);assert.equal(endTurn(r.state).hp,0);
});
test('all forms cancellation/fault atomic after kill draw reshuffle or power state update',()=>{
 for(const id of ['x43','x44'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]);
  const s=state({hand:[id],enemies:[{hp:1,block:0},{hp:20,block:0}]});s.discard=['x01','x02'];s.deckMode='shuffle';s.rng=7;const before=structuredClone(s);
  assert.ok(cardText(c,upgraded).includes(id==='x43'?'击杀':'保留'));
  assert.deepEqual(play(s,{index:0,upgraded,cancel:true}).state,s);
  try{c[key].push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded}).state,s);assert.deepEqual(s,before);}finally{c[key]=old;}
 }
 const s=state({hand:['x44']});s.carryBlock=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(s,{index:0}).state,s);
});
