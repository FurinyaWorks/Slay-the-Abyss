import test from 'node:test';
import assert from 'node:assert/strict';
import { initial, play, describe, endTurn, nextTurn } from './mechanics.mjs';
const setup=(ids,upgraded=false)=>initial(ids.map((id,i)=>({id,instance:String(i),upgraded})),[{hp:100,block:0}]);
for(const upgraded of [false,true]) {
  test('batch2 base fallback, explicit resource spend and rollback '+upgraded,()=>{
    for(const id of ['KQ006','KQ007']) {
      const s=setup([id],upgraded);
      const fallback=play(s,'0',undefined);
      assert.equal(fallback.block,upgraded?8:5);
      s.wedgeUntil=2; s.infusion=2;
      const before=structuredClone(s), r=play(s,'0',undefined);
      assert.equal(r.block,(upgraded?8:5)+(id==='KQ006'?5:4));
      assert.equal(r.wedgeUntil,id==='KQ006'?null:2);
      assert.equal(r.infusion,id==='KQ007'?1:2);
      assert.equal(r.energy,2);
      assert.deepEqual(s,before);
      assert.deepEqual(play(s,'0',undefined,{cancel:true}),s);
      s.energy=0; const noEnergy=structuredClone(s);
      assert.throws(()=>play(s,'0',undefined),/energy/);
      assert.deepEqual(s,noEnergy);
      assert.match(describe(id,upgraded),/消费/);
    }
  });
}
test('real setup prefix: wedge defense trades away later recast rather than duplicating it',()=>{
  let s=setup(['KQ003','KQ006','KQ003']);
  s=play(s,'0',0);
  const r=play(play(s,'1',undefined),'2',0);
  assert.equal(r.block,10); assert.equal(r.enemies[0].hp,90);
  assert.equal(r.infusion,0); assert.equal(r.wedgeUntil,2);
  const offense=play(s,'2',0);
  assert.equal(offense.enemies[0].hp,87); assert.equal(offense.infusion,2);
});
test('real recast prefix: defense spends one charge, not all charges or skill-wide automatic charge',()=>{
  let s=setup(['KQ003','KQ003','KQ007']);
  s=play(play(s,'0',0),'1',0);
  const r=play(s,'2',undefined);
  assert.equal(r.block,9); assert.equal(r.infusion,1);
  assert.equal(endTurn(r).infusion,0);
});
test('expiry removes fallback resource and repeating cannot duplicate spent wedge',()=>{
  let s=setup(['KQ006','KQ006']); s.wedgeUntil=2;
  s=play(play(s,'0',undefined),'1',undefined);
  assert.equal(s.block,15); assert.equal(s.wedgeUntil,null);
  const expired=endTurn({...setup([]),turn:2,wedgeUntil:2,infusion:2});
  const next=nextTurn(expired);
  next.hand=[{id:'KQ007',instance:'new',upgraded:false}];
  assert.equal(play(next,'new',undefined).block,5);
});

import { createBattle, useCard, finishTurn } from './battle.mjs';
test('two-turn draw fixture pays enemy damage and draws candidate naturally from its substituted deck slot',()=>{
  let s=createBattle({order:[7,0,3,4,5,6,8,9,1,2],relic:false,enemies:[{hp:100,block:0,intent:12}]});
  // Research substitution of one defense slot before its draw; not a natural reward system.
  s.draw.find(c=>c.instance==='starter-6').id='KQ006';
  s=useCard(s,'starter-7',0);
  s=finishTurn(s);
  assert.equal(s.hp,48); assert.equal(s.turn,2); assert.equal(s.wedgeUntil,2);
  const defended=finishTurn(useCard(s,'starter-6',undefined));
  const basic=structuredClone(s); basic.hand.find(c=>c.instance==='starter-6').id='KQ002';
  const baseline=finishTurn(useCard(basic,'starter-6',undefined));
  assert.equal(defended.hp,46); assert.equal(baseline.hp,41);
  assert.equal(defended.wedgeUntil,null);
  assert.equal(defended.hand.length+defended.draw.length+defended.discard.length,10);
});
