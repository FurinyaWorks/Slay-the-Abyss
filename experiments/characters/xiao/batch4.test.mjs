import test from 'node:test';
import assert from 'node:assert/strict';
import {state,play,catalog,cardText} from './model.mjs';
for(const upgraded of [false,true]){
 test(`x15 breaks before damage, lower naked damage, upgraded=${upgraded}`,()=>{
  for(const block of [0,20])for(const mask of [0,2]){
   const s=state({hand:['x15'],enemies:[{hp:40,block}]});s.mask=mask;
   const r=play(s,{index:0,upgraded});assert.equal(r.state.enemies[0].block,0);assert.equal(r.state.enemies[0].hp,40-(upgraded?9:6)-(mask?4:0));assert.equal(r.state.energy,2);
  }
 });
 test(`x16 retrieves already seen exit only, upgrades defense not search upgraded=${upgraded}`,()=>{
  const s=state({hand:['x16'],draw:['x06']});s.discard=['x01','x11','x09'];
  const r=play(s,{index:0,upgraded});assert.deepEqual(r.state.hand,['x11']);assert.deepEqual(r.state.draw,['x06']);assert.deepEqual(r.state.discard,['x01','x09']);assert.deepEqual(r.state.exhaust,['x16']);assert.equal(r.state.block,upgraded?6:3);
  assert.ok(cardText(catalog.cards.find(c=>c.id==='x16'),upgraded).includes(upgraded?'6点格挡':'3点格挡'));
 });
}
test('x16 no exit has defense only, resolves out of full hand before retrieving',()=>{
 let s=state({hand:['x16']});s.discard=['x01'];let r=play(s,{index:0});assert.deepEqual(r.state.hand,[]);assert.equal(r.state.block,3);
 s=state({hand:['x16',...Array(9).fill('x01')]});s.discard=['x06','x09'];r=play(s,{index:0});assert.equal(r.state.hand.length,10);assert.equal(r.state.hand[9],'x06');assert.deepEqual(r.state.discard,['x09']);
});
test('retrieval exception and invalid break target preserve all state',()=>{
 const s=state({hand:['x16']});s.discard=['x09'];const c=catalog.cards.find(c=>c.id==='x16'),old=structuredClone(c.base);
 try{c.base.push({op:'fault',value:0});assert.deepEqual(play(s,{index:0}).state,s);}finally{c.base=old;}
 const a=state({hand:['x15']});assert.deepEqual(play(a,{index:0,target:7}).state,a);
});
test('retrieval policy uses public discard eligibility but not hidden draws',async()=>{
 const {observe,choose}=await import('./research.mjs');const {newBattle}=await import('./battle.mjs');
 const s=newBattle({deck:['x16','x01'],hp:2});s.mask=1;s.discard=['x09'];const v=observe(s);
 assert.equal(v.exitInDiscard,true);assert.equal(s.hand[choose(v,'guard').index],'x16');
 const changed=structuredClone(s);changed.draw=['x11'];changed.rng=789;assert.deepEqual(observe(changed),v);
});
