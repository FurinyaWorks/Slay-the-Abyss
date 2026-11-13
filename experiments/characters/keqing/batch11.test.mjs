import test from 'node:test';import assert from 'node:assert/strict';import {initial,play,endTurn,nextTurn,describe}from './mechanics.mjs';
const make=(ids,up=false)=>initial(ids.map((id,i)=>({id,instance:String(i),upgraded:up})),[{hp:100,block:0},{hp:100,block:0}]);
for(const up of [false,true]){
 test('batch11 bounded wedge extension no generation '+up,()=>{for(const w of [null,1,2,3]){const s=make(['KQ015'],up);s.wedgeUntil=w;const r=play(s,'0',0);assert.equal(r.wedgeUntil,w===null?null:Math.min(w+1,3));assert.equal(r.block,up?12:9);assert.equal(r.exhaust.length,1);assert.deepEqual(play(s,'0',0,{cancel:true}),s);}});
 test('batch11 mark helps only next card first hit and remembers alternate target '+up,()=>{
  let s=make(['KQ057','KQ004','KQ001'],up);s=play(s,'0',0);assert.equal(s.enemies[0].hp,up?90:93);assert.equal(s.enemies[0].nextHitBonus,2);
  s=play(s,'2',1);assert.equal(s.enemies[0].nextHitBonus,2);const hp=s.enemies[0].hp;s=play(s,'1',0);assert.equal(s.enemies[0].hp,hp-(up?10:8)-2);assert.equal(s.enemies[0].nextHitBonus,undefined);
 });
 test('batch11 previous attack means earlier card even if armor absorbed '+up,()=>{
  let s=make(['KQ065','KQ001'],up);const solo=play(s,'0',0);assert.equal(solo.enemies[0].hp,up?91:94);
  s.enemies[0].block=100;s=play(s,'1',0);assert.equal(s.enemies[0].attackedThisTurn,true);s.enemies[0].block=0;const r=play(s,'0',0);assert.equal(r.enemies[0].hp,up?88:91);
 });
}
test('batch11 mark and history expire at end turn but extended wedge lasts',()=>{let s=make(['KQ057']);s.wedgeUntil=3;s=play(s,'0',0);s=nextTurn(endTurn(s));assert.equal(s.enemies[0].nextHitBonus,undefined);assert.equal(s.enemies[0].attackedThisTurn,undefined);assert.equal(s.wedgeUntil,3);});
