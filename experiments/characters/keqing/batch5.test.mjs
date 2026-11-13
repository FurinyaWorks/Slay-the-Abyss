import test from 'node:test';
import assert from 'node:assert/strict';
import { initial, play, describe } from './mechanics.mjs';
import { createBattle, starterIds, useCard, playerView, previewVisible } from './battle.mjs';
const make=(id,upgraded,enemies=[{hp:100,block:0}])=>initial([{id,instance:'x',upgraded}],enemies);
for(const upgraded of [false,true]) {
  test('batch5 independent conditional defense matrix '+upgraded,()=>{
    for(const live of [1,2,3,5]) {
      const enemies=Array.from({length:live},()=>({hp:100,block:0})).concat([{hp:0,block:50}]);
      for(const [id,block] of [['KQ034',upgraded?17:13],['KQ035',(upgraded?7:4)+Math.min(live,3)],['KQ067',(upgraded?7:4)+(live===1?3:0)]]) {
        const s=make(id,upgraded,enemies);s.infusion=2;s.wedgeUntil=1;
        const r=play(s,'x',undefined);
        assert.equal(r.block,block);assert.equal(r.energy,id==='KQ034'?1:2);
        assert.equal(r.infusion,2);assert.equal(r.wedgeUntil,1);
        assert.deepEqual(r.enemies,s.enemies);assert.deepEqual(play(s,'x',undefined,{cancel:true}),s);
      }
    }
    for(const wedgeUntil of [null,1]) for(const infusion of [0,1,2]) {
      const s={...make('KQ036',upgraded),wedgeUntil,infusion};
      const r=play(s,'x',undefined);
      assert.equal(r.block,(upgraded?8:5)+(wedgeUntil===null&&infusion===0?3:0));
      assert.equal(r.infusion,infusion);assert.equal(r.wedgeUntil,wedgeUntil);
    }
  });
  test('defensive setup creates only absent wedge and never refreshes '+upgraded,()=>{
    for(const wedgeUntil of [null,1,2]) {
      const s={...make('KQ010',upgraded),wedgeUntil,infusion:2}, before=structuredClone(s);
      const r=play(s,'x',undefined);
      assert.equal(r.block,upgraded?7:4);assert.equal(r.wedgeUntil,wedgeUntil??2);
      assert.equal(r.infusion,2);assert.deepEqual(s,before);
      s.energy=0;assert.throws(()=>play(s,'x',undefined),/energy/);assert.equal(s.wedgeUntil,wedgeUntil);
    }
    assert.match(describe('KQ010',upgraded),/不刷新/);
    assert.match(describe('KQ010',upgraded),/下一己方回合结束/);
  });
}
test('new source shares first-setup relic event and preview, cancellation and recast do not repeat',()=>{
  const deck=[...starterIds,'KQ010'];
  let s=createBattle({deckIds:deck,order:[10,7,8,0,3,1,2,4,5,6,9]});
  assert.deepEqual(useCard(s,'starter-10',undefined,{cancel:true}),s);
  const preview=previewVisible(playerView(s),'starter-10',undefined);
  s=useCard(s,'starter-10',undefined);
  assert.equal(s.block,8);assert.equal(s.relicUsed,true);assert.equal(s.log.length,1);
  for(const key of ['energy','block','wedgeUntil','infusion','relicUsed','enemies','hand']) assert.deepEqual(preview[key],s[key]);
  s=useCard(s,'starter-7',0); // release
  s=useCard(s,'starter-8',0); // another actual setup, relic already spent
  assert.equal(s.block,8);assert.equal(s.log.length,1);
});
test('existing wedge without relic flag cannot be relabeled as a new setup',()=>{
  let s=createBattle({deckIds:[...starterIds,'KQ010'],order:[10,7,8,0,3,1,2,4,5,6,9]});
  s.wedgeUntil=1;
  const r=useCard(s,'starter-10',undefined);
  assert.equal(r.wedgeUntil,1);assert.equal(r.block,4);assert.equal(r.relicUsed,false);assert.equal(r.log.length,0);
});
