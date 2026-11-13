import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn,cardText} from './model.mjs';
import {newBattle,battlePlay} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`x09 exits before draw and prevents lethal tick; upgrade=${upgraded}`,()=>{
  let s=state({hp:2,hand:['x09'],draw:['x01','x02','x03']});s.mask=3;
  const r=play(s,{index:0,upgraded});assert.equal(r.ok,true);assert.equal(r.state.mask,0);assert.equal(r.state.energy,2);assert.equal(r.state.hand.length,upgraded?3:2);
  assert.equal(endTurn(r.state).hp,2);assert.deepEqual(r.state.discard,['x09']);
  assert.ok(cardText(catalog.cards.find(c=>c.id==='x09'),upgraded).includes(upgraded?'抽3张':'抽2张'));
 });
 test(`x10 short entry pays life, triggers relic once, upgrade=${upgraded}`,()=>{
  const s=state({hp:3,hand:['x10'],draw:['x01'],startingRelic:true});const r=play(s,{index:0,upgraded});
  assert.equal(r.ok,true);assert.equal(r.state.hp,1);assert.equal(r.state.mask,1);assert.equal(r.state.block,upgraded?11:8);assert.equal(r.state.energy,2);assert.deepEqual(r.state.hand,['x01']);assert.equal(r.state.relicUsed,true);
  assert.equal(endTurn(r.state).hp,0); // block cannot hide life economy risk
  const low=state({hp:2,hand:['x10']});assert.deepEqual(play(low,{index:0,upgraded}).state,low);
 });
 test(`x11 attacks before exit, respects armor and base/upgrade; ${upgraded}`,()=>{
  const s=state({hp:2,hand:['x11'],enemies:[{hp:40,block:3}]});s.mask=2;
  const r=play(s,{index:0,upgraded});assert.equal(r.state.enemies[0].hp,upgraded?25:29);assert.equal(r.state.mask,0);assert.equal(endTurn(r.state).hp,2);
  assert.equal(play(state({hand:['x11']}),{index:0,upgraded}).state.enemies[0].hp,upgraded?16:20);
 });
}
test('x10 refreshing longer mask does not shorten it or retrigger relic',()=>{
 const s=state({hand:['x10'],draw:['x01'],startingRelic:true});s.mask=3;s.relicUsed=true;
 const r=play(s,{index:0});assert.equal(r.state.mask,3);assert.deepEqual(r.state.hand,[]);assert.equal(r.state.hp,68);
});
test('new exit draw reshuffles without recycling resolving card; cancellation is atomic',()=>{
 const s=newBattle({deck:['x09']});s.discard=['x01','x02','x03'];s.mask=2;
 assert.deepEqual(battlePlay(s,{index:0,cancel:true}).state,s);
 const r=battlePlay(s,{index:0});assert.equal(r.ok,true);assert.equal(r.state.hand.length,2);assert.ok(!r.state.hand.includes('x09'));assert.equal(r.state.mask,0);
});
test('unknown effect after x09 exit and shuffle rolls back mask, RNG and all zones',()=>{
 const card=catalog.cards.find(c=>c.id==='x09'),old=structuredClone(card.base);
 try{card.base.push({op:'fault',value:0});const s=newBattle({deck:['x09']});s.discard=['x01','x02'];s.mask=3;
 const r=battlePlay(s,{index:0});assert.equal(r.reason,'effect');assert.deepEqual(r.state,s);}finally{card.base=old;}
});
test('batch2 visible policy can select emergency exit and short defensive entry',async()=>{
 const {observe,choose}=await import('./research.mjs');
 let s=newBattle({deck:['x09'],hp:2});s.mask=2;assert.equal(choose(observe(s),'guard').index,0);
 s=newBattle({deck:['x10','x01']});const a=choose(observe(s),'guard');assert.equal(s.hand[a.index],'x10');
});
