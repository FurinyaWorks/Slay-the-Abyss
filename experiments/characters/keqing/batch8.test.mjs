import test from 'node:test';
import assert from 'node:assert/strict';
import {initial,play,describe} from './mechanics.mjs';
import {createBattle,starterIds,playerView,previewVisible,useCard} from './battle.mjs';
const make=(id,upgraded,enemies)=>initial([{id,instance:'x',upgraded}],enemies);
for(const upgraded of [false,true]){
 test('batch8 visible intent independent oracle '+upgraded,()=>{
  for(const intent of [0,1,30]) for(const infusion of [0,1,2]) for(const id of ['KQ041','KQ058']){
   const s=make(id,upgraded,[{hp:100,block:0,intent}]);s.infusion=infusion;const before=structuredClone(s);
   const r=play(s,'x',0),bonus=infusion?2:0;
   const damage=id==='KQ041'?(upgraded?7:4)+bonus:(upgraded?8:5)+bonus+(intent===0?4+bonus:0);
   assert.equal(r.enemies[0].hp,100-damage);assert.equal(r.block,id==='KQ041'&&intent>0?5:0);
   assert.equal(r.infusion,Math.max(0,infusion-1));assert.deepEqual(s,before);assert.deepEqual(play(s,'x',0,{cancel:true}),s);
  }
 });
 test('batch8 armor is not a second infused damage hit '+upgraded,()=>{
  for(const armor of [0,2,5,8,100]) for(const infusion of [0,2]) {
   const s=make('KQ061',upgraded,[{hp:100,block:armor}]);s.infusion=infusion;
   const r=play(s,'x',0),left=Math.max(0,armor-5),damage=(upgraded?9:6)+(infusion?2:0);
   assert.equal(r.enemies[0].hp,100-Math.max(0,damage-left));assert.equal(r.enemies[0].block,Math.max(0,left-damage));
   assert.equal(r.infusion,Math.max(0,infusion-1));assert.match(describe('KQ061',upgraded),/不是伤害/);
  }
 });
 test('batch8 only new deaths and bounded kill block '+upgraded,()=>{
  const s=make('KQ063',upgraded,[{hp:0,block:0},...Array.from({length:5},()=>({hp:8,block:0})),{hp:100,block:0}]);
  const r=play(s,'x');assert.equal(r.block,6);assert.equal(r.enemies[6].hp,upgraded?89:92);assert.equal(r.energy,1);
  const boss=play(make('KQ063',upgraded,[{hp:100,block:0}]),'x');assert.equal(boss.block,0);
 });
}
test('batch8 target death uses input intent, no extra target spill, bad intent rejected atomically',()=>{
 for(const id of ['KQ041','KQ058']){
  const s=make(id,false,[{hp:1,block:0,intent:id==='KQ041'?8:0},{hp:100,block:0,intent:8}]);
  const r=play(s,'x',0);assert.equal(r.enemies[1].hp,100);assert.equal(r.block,id==='KQ041'?5:0);
  for(const intent of [undefined,NaN,-1]){const bad=structuredClone(s);bad.enemies[0].intent=intent;const old=structuredClone(bad);assert.throws(()=>play(bad,'x',0),/intent/);assert.deepEqual(bad,old);}
 }
});
test('batch8 acquired cards share visible/live actions and cannot pay insufficient cost',()=>{
 for(const id of ['KQ041','KQ058','KQ061','KQ063']) for(const intent of [0,9]){
  const s=createBattle({deckIds:[...starterIds,id],order:[10,0,1,2,3,4,5,6,7,8,9],enemies:[{hp:50,block:8,intent}]});
  const r=useCard(s,'starter-10',0),p=previewVisible(playerView(s),'starter-10',0);
  for(const key of ['enemies','block','energy','infusion','hand'])assert.deepEqual(p[key],r[key]);
  const low=structuredClone(s);low.energy=0;const old=structuredClone(low);assert.throws(()=>useCard(low,'starter-10',0));assert.deepEqual(low,old);
 }
});
