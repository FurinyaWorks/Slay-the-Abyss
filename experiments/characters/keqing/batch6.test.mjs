import test from 'node:test';
import assert from 'node:assert/strict';
import { initial,play,describe } from './mechanics.mjs';
import { createBattle,starterIds,useCard } from './battle.mjs';
const specs={
 KQ011:{cost:2,damage:[12,16],hits:1,setup:true},
 KQ013:{cost:1,damage:[3,5],hits:1,all:true,setup:true},
 KQ018:{cost:1,damage:[4,5],hits:2,uninfusedBlock:[3,4]},
 KQ019:{cost:2,damage:[3,4],hits:4},
 KQ025:{cost:2,damage:[10,13],hits:1,infusedExtra:[7,9]},
 KQ026:{cost:1,damage:[5,8],hits:1,detonate:9},
 KQ027:{cost:2,damage:[7,10],hits:1,all:true,wedgeBlock:6},
};
for(const [id,x] of Object.entries(specs)) for(const upgraded of [false,true]) {
 test('batch6 independent base/upgrade and resource damage oracle '+id+' '+upgraded,()=>{
  for(const wedgeUntil of [null,1]) for(const infusion of [0,1,2]) for(const armor of [0,7,100]){
   const s=initial([{id,instance:'x',upgraded}],[{hp:100,block:armor},{hp:100,block:armor}]);s.wedgeUntil=wedgeUntil;s.infusion=infusion;
   const idx=Number(upgraded),bonus=infusion?2:0;
   const total=(x.damage[idx]+bonus)*x.hits+(x.infusedExtra&&infusion?x.infusedExtra[idx]+bonus:0)+(x.detonate&&wedgeUntil!==null?x.detonate+bonus:0);
   const r=play(s,'x',0);
   assert.equal(r.enemies[0].hp,100-Math.max(0,total-armor));
   assert.equal(r.enemies[1].hp,x.all?100-Math.max(0,total-armor):100);
   assert.equal(r.energy,3-x.cost);assert.equal(r.infusion,Math.max(0,infusion-1));
   assert.equal(r.block,(x.uninfusedBlock&&!infusion?x.uninfusedBlock[idx]:0)+(x.wedgeBlock&&wedgeUntil!==null?6:0));
   assert.equal(r.wedgeUntil,x.setup?(wedgeUntil??2):(x.detonate||x.wedgeBlock)?null:wedgeUntil);
   assert.equal(s.hand.length,1);assert.equal(s.enemies[0].hp,100);
   assert.deepEqual(play(s,'x',0,{cancel:true}),s);
  }
 });
}
test('single-target detonation cannot spill to other enemies after first-hit lethal',()=>{
 const s=initial([{id:'KQ026',instance:'x',upgraded:false}],[{hp:1,block:0},{hp:100,block:0}]);s.wedgeUntil=1;s.infusion=1;
 const r=play(s,'x',0);assert.equal(r.enemies[0].hp,0);assert.equal(r.enemies[1].hp,100);assert.equal(r.wedgeUntil,null);assert.equal(r.infusion,0);
 assert.match(describe('KQ026'),/同一目标/);
});
test('AoE source triggers relic once, existing wedge not refreshed',()=>{
 const deck=[...starterIds,'KQ013'];
 const s=createBattle({deckIds:deck,order:[10,7,8,0,3,1,2,4,5,6,9],enemies:[{hp:100,block:0,intent:0},{hp:100,block:0,intent:0}]});
 const r=useCard(s,'starter-10',0);assert.equal(r.block,4);assert.equal(r.log.length,1);
 s.wedgeUntil=1;const kept=useCard(s,'starter-10',0);assert.equal(kept.wedgeUntil,1);assert.equal(kept.block,0);assert.equal(kept.log.length,0);
});
test('insufficient cost and invalid target remain atomic for all new attacks',()=>{
 for(const id of Object.keys(specs)){
  const s=initial([{id,instance:'x',upgraded:false}],[{hp:100,block:0}]);s.energy=0;const before=structuredClone(s);
  assert.throws(()=>play(s,'x',0),/energy/);assert.deepEqual(s,before);
  s.energy=3;if(!specs[id].all) assert.throws(()=>play(s,'x',8),/target/);
 }
});
