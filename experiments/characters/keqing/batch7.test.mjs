import test from 'node:test';
import assert from 'node:assert/strict';
import { initial,play,endTurn,describe } from './mechanics.mjs';
import { createBattle,starterIds,useCard,finishTurn,playerView,previewVisible } from './battle.mjs';
const make=(ids,upgraded=false)=>initial(ids.map((id,i)=>({id,instance:String(i),upgraded})),[{hp:1000,block:0},{hp:1000,block:0}]);
for(const upgraded of [false,true]){
 test('batch7 no-additive infusion refresh and exhausted identity '+upgraded,()=>{
  for(const count of [0,1,2]) {
   const s=make(['KQ022'],upgraded);s.infusion=count;const original=structuredClone(s);
   const r=play(s,'0',undefined);
   assert.equal(r.infusion,1);assert.equal(r.block,upgraded?9:6);assert.equal(r.energy,1);
   assert.equal(r.exhaust.length,1);assert.equal(r.discard.length,0);
   assert.deepEqual(s,original);assert.deepEqual(play(s,'0',undefined,{cancel:true}),s);
  }
  assert.match(describe('KQ022',upgraded),/覆盖已有次数/);
  assert.match(describe('KQ022',upgraded),/消耗：/);
 });
 test('batch7 base/upgrade attack numerical oracle '+upgraded,()=>{
  for(const infusion of [0,2]) for(const wedgeUntil of [null,1]) for(const armor of [0,7]){
   for(const id of ['KQ028','KQ055','KQ056']) {
    const s=make([id],upgraded);s.infusion=infusion;s.wedgeUntil=wedgeUntil;s.enemies.forEach(e=>e.block=armor);
    const b=infusion?2:0;
    const total=id==='KQ028'?((upgraded?3:2)+b)*2+(wedgeUntil!==null?(upgraded?13:10)+b:0):id==='KQ055'?(upgraded?12:9)+b:(upgraded?13:10)+b+(armor===0?(upgraded?7:6)+b:0);
    const r=play(s,'0',0);
    assert.equal(r.enemies[0].hp,1000-Math.max(0,total-armor));
    assert.equal(r.enemies[1].hp,id==='KQ028'?1000-Math.max(0,total-armor):1000);
    assert.equal(r.infusion,Math.max(0,infusion-1));
    assert.equal(r.exhaust.length,id==='KQ055'?1:0);
    assert.equal(r.wedgeUntil,id==='KQ028'?null:wedgeUntil);
    assert.deepEqual(play(s,'0',0,{cancel:true}),s);
   }
  }
 });
}
test('exhausted reward never returns through repeated real shuffles, preview stays identical',()=>{
 let s=createBattle({deckIds:[...starterIds,'KQ055'],order:[10,0,1,2,3,4,5,6,7,8,9],enemies:[{hp:1000,block:0,intent:0}]});
 const preview=previewVisible(playerView(s),'starter-10',0),r=useCard(s,'starter-10',0);
 for(const key of ['enemies','energy','infusion','hand']) assert.deepEqual(preview[key],r[key]);
 assert.equal(r.exhaust.length,1);
 s=r;
 for(let n=0;n<50;n++) {
  s=finishTurn(s);
  assert.equal(s.exhaust.length,1);assert.equal([...s.hand,...s.draw,...s.discard].filter(c=>c.id==='KQ055').length,0);
  assert.equal(s.hand.length+s.draw.length+s.discard.length+s.exhaust.length,11);
 }
});
test('corrupt exhaust identity rejected atomically at battle entry',()=>{
 const s=createBattle(),before=structuredClone(s);
 s.exhaust.push(s.hand[0]);assert.throws(()=>useCard(s,s.hand[0].instance,0),/instances/);assert.equal(s.exhaust.length,1);

});
