import test from 'node:test';
import assert from 'node:assert/strict';
import { initial, play, describe } from './mechanics.mjs';
const make=(id,upgraded)=>initial([{id,instance:'candidate',upgraded}],[{hp:100,block:0},{hp:100,block:0}]);
for(const up of [false,true]) {
  test('preserving attack has independent one-hit oracle '+up,()=>{
    for(const wedge of [null,2]) for(const infusion of [0,2]) {
      const s={...make('KQ008',up),wedgeUntil:wedge,infusion}, before=structuredClone(s);
      const r=play(s,'candidate',0);
      assert.equal(r.enemies[0].hp,100-(up?(wedge?11:8):(wedge?8:5))-(infusion?2:0));
      assert.equal(r.enemies[1].hp,100);
      assert.equal(r.wedgeUntil,wedge); assert.equal(r.infusion,infusion?1:0);
      assert.deepEqual(s,before);
    }
    assert.match(describe('KQ008',up),/不消费或刷新/);
  });
  test('hybrid attack blocks without pretending skill immunity from infusion consumption '+up,()=>{
    const s={...make('KQ009',up),wedgeUntil:2,infusion:2};
    const r=play(s,'candidate',0);
    assert.equal(r.enemies[0].hp,up?93:95);
    assert.equal(r.block,up?6:4); assert.equal(r.infusion,1); assert.equal(r.wedgeUntil,2);
    assert.deepEqual(play(s,'candidate',0,{cancel:true}),s);
    assert.throws(()=>play(s,'candidate',9),/target/);
    assert.equal(s.enemies[0].hp,100);
  });
}
test('preserve then release changes payoff order while preserving wedge expiry',()=>{
  const s=initial(['KQ003','KQ008','KQ003'].map((id,i)=>({id,instance:String(i),upgraded:false})),[{hp:100,block:0}]);
  let preserve=play(s,'0',0); preserve=play(preserve,'1',0);
  assert.equal(preserve.wedgeUntil,2);
  preserve=play(preserve,'2',0);
  const release=play(play(play(s,'0',0),'2',0),'1',0);
  assert.equal(preserve.enemies[0].hp,79); assert.equal(preserve.infusion,2);
  assert.equal(release.enemies[0].hp,80); assert.equal(release.infusion,1);
});
