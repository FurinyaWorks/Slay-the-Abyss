import test from 'node:test';
import assert from 'node:assert/strict';
import { initial, play, describe } from './mechanics.mjs';
const expected={KQ052:{cost:1,base:6,up:9,hits:1,all:true},KQ053:{cost:2,base:16,up:20,hits:1,all:false},KQ054:{cost:1,base:2,up:3,hits:3,all:false}};
for(const [id,x] of Object.entries(expected)) for(const upgraded of [false,true]) {
  test('batch4 independent damage, armor, infusion oracle '+id+' '+upgraded,()=>{
    for(const infusion of [0,2]) for(const armor of [0,7,100]) {
      const s=initial([{id,instance:'a',upgraded}],[{hp:100,block:armor},{hp:100,block:armor}]);
      s.infusion=infusion; s.wedgeUntil=2;
      const r=play(s,'a',0),total=((upgraded?x.up:x.base)+(infusion?2:0))*x.hits;
      assert.equal(r.enemies[0].hp,100-Math.max(0,total-armor));
      assert.equal(r.enemies[1].hp,x.all?100-Math.max(0,total-armor):100);
      assert.equal(r.energy,3-x.cost); assert.equal(r.infusion,infusion?1:0);
      assert.equal(r.wedgeUntil,2);
      assert.deepEqual(play(s,'a',0,{cancel:true}),s);
      s.energy=0; assert.throws(()=>play(s,'a',0),/energy/);
      assert.equal(s.hand.length,1); assert.equal(s.enemies[0].hp,100);
      assert.match(describe(id,upgraded),new RegExp(String(upgraded?x.up:x.base)+'伤害'));
    }
  });
}
test('three-hit option loses without infusion and changes upgraded payoff, not a free strict replacement',()=>{
  const damage=(id,upgraded,infusion)=>{
    const s=initial([{id,instance:'a',upgraded}],[{hp:100,block:0}]);s.infusion=infusion;
    return 100-play(s,'a',0).enemies[0].hp;
  };
  assert.equal(damage('KQ054',false,0),6);assert.equal(damage('KQ004',false,0),8);
  assert.equal(damage('KQ054',false,2),12);assert.equal(damage('KQ004',false,2),12);
  assert.equal(damage('KQ054',true,2),15);assert.equal(damage('KQ004',true,2),14);
});
