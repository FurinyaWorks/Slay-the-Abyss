import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn,startTurn} from './model.mjs';
import {newBattle} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`entry draw relic first then ability, not on refresh upgraded=${upgraded}`,()=>{
  let s=state({hand:['x69','x04','x10'],energy:5,draw:['x01','x02','x03','x05','x08'],startingRelic:true});
  s=play(s,{index:0,upgraded}).state;assert.equal(s.hand.length,2);s=play(s,{index:0}).state;
  assert.deepEqual(s.hand,upgraded?['x10','x01','x02','x03']:['x10','x01','x02']);const remain=s.draw.length;
  s=play(s,{index:0}).state;assert.equal(s.draw.length,remain);assert.equal(s.relicUsed,true);
 });
 test(`exit recovers first actual entry in discard, upgrade adds draw upgraded=${upgraded}`,()=>{
  const s=state({hand:['x70'],draw:['x01']});s.mask=2;s.exitGuard=4;s.discard=['x56','x06','x10','x04'];
  const r=play(s,{index:0,upgraded});assert.equal(r.state.mask,0);assert.equal(r.state.block,4);assert.deepEqual(r.state.hand,upgraded?['x10','x01']:['x10']);assert.deepEqual(r.state.discard,['x56','x06','x04']);assert.deepEqual(r.state.exhaust,['x70']);
 });
}
test('reenter draws again but pays life and fee again, no entry when ability installed masked',()=>{
 let s=state({hand:['x69','x04','x70'],energy:6,draw:['x01','x02','x03','x05']});s=play(s,{index:0}).state;s=play(s,{index:0}).state;
 s=play(s,{index:0}).state;const index=s.hand.indexOf('x04');assert.ok(index>=0);s=play(s,{index}).state;assert.equal(s.hp,66);assert.equal(s.energy,1);assert.equal(s.entryDraw,1);assert.equal(s.hand.length,2);
 const a=state({hand:['x69'],draw:['x01']});a.mask=1;assert.equal(play(a,{index:0}).state.hand.length,0);assert.equal(newBattle().entryDraw,0);
});
test('entry draw stacking shared cap, no deferred overflow draw and no exhausted entry recovery',()=>{
 const s=state({hand:['x04',...Array(9).fill('x01')],draw:['x02','x03','x05'],startingRelic:true});s.entryDraw=3;
 const r=play(s,{index:0});assert.equal(r.state.hand.length,10);assert.deepEqual(r.state.draw,['x03','x05']);
 const a=state({hand:['x70']});a.exhaust=['x04'];a.discard=['x56','x06'];assert.deepEqual(play(a,{index:0}).state.hand,[]);
});
test('new forms cancel/fault atomic after recovery and actual upgrade reshuffle, ability overflow',()=>{
 for(const id of ['x69','x70'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]),s=state({hand:[id]});s.mask=1;s.discard=['x04','x01'];s.deckMode='shuffle';s.rng=6;s.exitGuard=4;const copy=structuredClone(s);
  assert.deepEqual(play(s,{index:0,upgraded,cancel:true}).state,s);
  try{c[key].push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded}).state,s);assert.deepEqual(s,copy);}finally{c[key]=old;}
  s.energy=0;assert.deepEqual(play(s,{index:0,upgraded}).state,s);
 }
 const s=state({hand:['x69']});s.entryDraw=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(s,{index:0}).state,s);
});
test('entry fault after relic plus ability real shuffle restores both sources',()=>{
 const c=catalog.cards.find(c=>c.id==='x04'),old=structuredClone(c.base),s=state({hand:['x04'],startingRelic:true});s.entryDraw=2;s.discard=['x01','x02','x03'];s.deckMode='shuffle';s.rng=8;const copy=structuredClone(s);
 try{c.base.push({op:'fault',value:0});assert.deepEqual(play(s,{index:0}).state,s);assert.deepEqual(s,copy);}finally{c.base=old;}
});
test('previous expiry grants no repeated later energy and campaign overflow reverts',async()=>{
 const {newCampaign,campaignAction}=await import('./campaign.mjs');let s=state({hp:5});s.mask=1;s.expiryEnergy=2;s=startTurn(endTurn(s));assert.equal(s.energy,5);s=startTurn(endTurn(s));assert.equal(s.energy,3);
 const c=newCampaign(1);c.battle.mask=1;c.battle.expiryEnergy=1;c.battle.reservedEnergy=Number.MAX_SAFE_INTEGER;assert.deepEqual(campaignAction(c,{type:'end'}).state,c);
});
