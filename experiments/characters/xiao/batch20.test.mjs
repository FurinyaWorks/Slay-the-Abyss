import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn,startTurn} from './model.mjs';
import {newBattle,advance} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`exhaust power no retroactive shield, own consumption and stack upgraded=${upgraded}`,()=>{
  let s=state({hand:['x47','x47','x06'],energy:4});s.exhaust=['x17'];
  s=play(s,{index:0,upgraded}).state;assert.equal(s.block,0);
  s=play(s,{index:0,upgraded}).state;assert.equal(s.exhaustGuard,upgraded?6:4);
  s=play(s,{index:0}).state;assert.equal(s.block,4+(upgraded?6:4));assert.deepEqual(s.exhaust,['x17','x06']);
  assert.equal(newBattle().exhaustGuard,0);
 });
 test(`blind fuel removed before base/upgrade draws upgraded=${upgraded}`,()=>{
  const s=state({hand:['x48'],draw:['x06','x01','x02','x03','x05']});s.exhaustGuard=2;
  const r=play(s,{index:0,upgraded});assert.equal(r.ok,true);
  assert.deepEqual(r.state.exhaust,['x06']);assert.deepEqual(r.state.hand,upgraded?['x01','x02','x03']:['x01','x02']);assert.equal(r.state.block,2);assert.deepEqual(r.state.discard,['x48']);
 });
}
test('bulk skill fuel each triggers guard; power leaves deck without being exhausted',()=>{
 let s=state({hand:['x47','x19','x02','x06','x01'],energy:4});s=play(s,{index:0}).state;s=play(s,{index:0}).state;
 assert.equal(s.block,12);assert.deepEqual(s.exhaust,['x02','x06']);assert.deepEqual(s.powers,['x47']);
});
test('empty fuel cannot draw, full hand still burns; real shuffle never includes resolving card',()=>{
 const empty=state({hand:['x48']});const no=play(empty,{index:0});assert.equal(no.state.energy,2);assert.deepEqual(no.state.hand,[]);
 const full=state({hand:['x48',...Array(9).fill('x01')],draw:['x06','x02','x03','x05']});const r=play(full,{index:0,upgraded:true});assert.equal(r.state.hand.length,10);assert.deepEqual(r.state.exhaust,['x06']);assert.equal(r.state.draw.length,2);
 const sh=state({hand:['x48']});sh.discard=['x01','x02','x03'];sh.deckMode='shuffle';sh.rng=9;
 const z=play(sh,{index:0});assert.equal(z.state.exhaust.length,1);assert.equal(z.state.hand.length,2);assert.deepEqual(z.state.discard,['x48']);assert.equal(z.state.exhaust.includes('x48'),false);
});
test('blind burning sole exit cannot save lethal mask; no reuse of exhausted fuel',()=>{
 const s=state({hand:['x48','x16'],hp:2,draw:['x06']});s.mask=1;s.exhaustGuard=2;
 let r=play(s,{index:0}).state;r=play(r,{index:0}).state;assert.deepEqual(r.hand,[]);assert.equal(r.exhaust.includes('x06'),true);assert.equal(endTurn(r).hp,0);
});
test('new effect faults and exhaust trigger overflow roll back RNG, all zones and resources',()=>{
 for(const id of ['x47','x48'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]);
  const s=state({hand:[id]});s.discard=['x01','x02','x03'];s.deckMode='shuffle';s.rng=9;s.exhaustGuard=2;const before=structuredClone(s);
  try{c[key].push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded}).state,s);assert.deepEqual(s,before);}finally{c[key]=old;}
 }
 for(const id of ['x06','x19','x48']){
  const s=state({hand:[id,'x02'],draw:['x01']});s.block=Number.MAX_SAFE_INTEGER;s.exhaustGuard=1;
  assert.deepEqual(play(s,{index:0}).state,s);
 }
 const p=state({hand:['x47']});p.exhaustGuard=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(p,{index:0}).state,p);
});
test('previous delayed energy precise representable maximum and next point cross-layer rejection',()=>{
 const s=state();s.phase='enemy';s.reservedEnergy=Number.MAX_SAFE_INTEGER-3;assert.equal(startTurn(s).energy,Number.MAX_SAFE_INTEGER);s.reservedEnergy++;assert.deepEqual(startTurn(s),s);
 const b=newBattle();b.reservedEnergy=Number.MAX_SAFE_INTEGER-3;assert.equal(advance(b).energy,Number.MAX_SAFE_INTEGER);b.reservedEnergy++;assert.deepEqual(advance(b),b);
});
