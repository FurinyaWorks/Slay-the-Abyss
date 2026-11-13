import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn,cardText} from './model.mjs';
for(const upgraded of [false,true]){
 test(`shorten mask zero through three upgraded=${upgraded}`,()=>{
  for(const mask of [0,1,2,3]){const s=state({hand:['x27'],hp:2});s.mask=mask;
   const r=play(s,{index:0,upgraded});assert.equal(r.state.mask,Math.max(0,mask-1));assert.equal(r.state.block,upgraded?10:7);assert.equal(r.state.energy,2);assert.equal(endTurn(r.state).hp,mask<=1?2:0);}
 });
 test(`last-window damage exact durations and armor upgraded=${upgraded}`,()=>{
  for(const mask of [0,1,2,3]){const s=state({hand:['x28'],enemies:[{hp:60,block:5}]});s.mask=mask;
   const r=play(s,{index:0,upgraded});const raw=(upgraded?14:10)+(mask===1?(upgraded?12:10):0)+(mask?4:0);
   assert.equal(r.state.enemies[0].hp,65-raw);assert.equal(r.state.mask,mask);assert.equal(r.state.energy,1);
   assert.ok(cardText(catalog.cards.find(c=>c.id==='x28'),upgraded).includes(upgraded?'额外12点':'额外10点'));
  }
 });
}
test('shortening before final strike differs from reversing and does not retrigger relic',()=>{
 let a=state({hand:['x27','x28','x29','x30','x31','x32','x33','x34','x35','x36'],startingRelic:true,enemies:[{hp:60,block:0}]});a.mask=2;
 a=play(a,{index:0}).state;a=play(a,{index:0}).state;assert.equal(a.enemies[0].hp,36);assert.equal(a.relicUsed,false);
 let b=state({hand:['x28','x27'],enemies:[{hp:60,block:0}]});b.mask=2;
 b=play(b,{index:0}).state;b=play(b,{index:0}).state;assert.equal(b.enemies[0].hp,46);
});
test('shortening last window removes payoff; final strike alone may still die',()=>{
 let s=state({hp:2,hand:['x27','x28','x29','x30','x31','x32','x33','x34','x35','x36'],enemies:[{hp:60,block:0}]});s.mask=1;
 s=play(s,{index:0}).state;s=play(s,{index:0}).state;assert.equal(s.enemies[0].hp,50);assert.equal(endTurn(s).hp,2);
 let dangerous=state({hp:2,hand:['x28'],enemies:[{hp:60,block:0}]});dangerous.mask=1;
 dangerous=play(dangerous,{index:0}).state;assert.equal(endTurn(dangerous).hp,0);
});
test('post-shortening fault and final-strike invalid target reject atomically',()=>{
 const s=state({hand:['x27']});s.mask=3;const c=catalog.cards.find(c=>c.id==='x27'),old=structuredClone(c.upgrade);
 try{c.upgrade.push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded:true}).state,s);}finally{c.upgrade=old;}
 const a=state({hand:['x28']});a.mask=1;assert.deepEqual(play(a,{index:0,target:8}).state,a);
});
test('timing and rotation cards can be acquired after real win and drawn/played next battle',async()=>{
 const {newCampaign,campaignAction}=await import('./campaign.mjs');const {observe,choose}=await import('./research.mjs');
 for(const id of ['x27','x28','x29','x30','x31','x32','x33','x34','x35','x36','x37','x38','x39','x40','x41','x42','x43','x44']){
  let c;
  for(let seed=1;seed<=128;seed++){
   let candidate=newCampaign(seed);
   for(let i=0;i<200&&candidate.phase==='battle';i++){const a=choose(observe(candidate.battle),'guard');candidate=campaignAction(candidate,a?{type:'play',...a}:{type:'end'}).state;}
   if(candidate.phase==='reward'&&candidate.offer.includes(id)){c=candidate;break;}
  }
  assert.ok(c,'bounded deterministic offer search');c=campaignAction(c,{type:'reward',card:id}).state;
  let played=false;
  for(let i=0;i<200&&c.phase==='battle';i++){
   const index=c.battle.hand.indexOf(id),card=catalog.cards.find(x=>x.id===id);
   const a=index>=0&&c.battle.energy>=card.cost?{index,target:c.battle.enemies.findIndex(e=>e.hp>0)}:choose(observe(c.battle),'guard');
   const selected=a?c.battle.hand[a.index]:null,r=campaignAction(c,a?{type:'play',...a}:{type:'end'});assert.equal(r.ok,true);c=r.state;
   if(selected===id){played=true;break;}
  }assert.equal(played,true);
 }
});
