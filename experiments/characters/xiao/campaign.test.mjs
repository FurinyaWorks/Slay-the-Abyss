import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from './model.mjs';
import {newBattle,battlePlay} from './battle.mjs';
import {newCampaign,campaignAction} from './campaign.mjs';
import {choose,observe} from './research.mjs';
function reachReward(seed=1){let c=newCampaign(seed);for(let i=0;i<200&&c.phase==='battle';i++){const a=choose(observe(c.battle),'guard');const r=campaignAction(c,a?{type:'play',...a}:{type:'end'});assert.equal(r.ok,true);c=r.state;}assert.equal(c.phase,'reward');return c;}
test('x08 draws across draw/discard boundary in base and upgrade, cannot redraw itself',()=>{
  for(const upgraded of [false,true]){let s=newBattle({deck:['x08']});s.draw=['x01'];s.discard=['x02','x03'];
    s=battlePlay(s,{index:0,upgraded}).state;assert.equal(s.hand.length,upgraded?3:2);assert.equal(s.hand[0],'x01');assert.ok(!s.hand.includes('x08'));assert.deepEqual(s.discard,['x08']);assert.equal(s.energy,2);}
});
test('draw shuffle error after drawing rolls back complete transactional state',()=>{
  const card=catalog.cards.find(c=>c.id==='x08');const old=structuredClone(card.base);
  try{card.base.push({op:'invalid',value:0});const s=newBattle({deck:['x08']});s.discard=['x01','x02'];const before=structuredClone(s);const r=battlePlay(s,{index:0});assert.equal(r.reason,'effect');assert.deepEqual(r.state,before);assert.deepEqual(s,before);}finally{card.base=old;}
});
test('reward offer appears after real win, skip preserves deck and carries HP',()=>{
  const c=reachReward();assert.equal(c.offer.length,3);assert.equal(new Set(c.offer).size,3);const hp=c.battle.hp;assert.ok(hp<70);
  const r=campaignAction(c,{type:'reward',card:null});assert.equal(r.ok,true);assert.deepEqual(r.state.deck,c.deck);assert.equal(r.state.battle.hp,hp);assert.equal(r.state.stage,1);assert.equal(r.state.battle.relicUsed,false);
  assert.equal(campaignAction(r.state,{type:'reward',card:null}).reason,'phase');
});
test('accept only offered card, one copy, deterministic separate reward stream',()=>{
  const c=reachReward(23);assert.deepEqual(c.offer,reachReward(23).offer);const before=structuredClone(c);
  const rejected=campaignAction(c,{type:'reward',card:'x01'});assert.equal(rejected.ok,false);assert.deepEqual(rejected.state,before);
  const id=c.offer[0],r=campaignAction(c,{type:'reward',card:id});assert.equal(r.state.deck.length,11);assert.equal(r.state.deck.filter(v=>v===id).length,1);assert.deepEqual(c,before);
});
test('defeat offers no rewards or restart healing',()=>{
  const c=newCampaign();c.battle.hp=1;const r=campaignAction(c,{type:'end'});assert.equal(r.state.phase,'defeat');assert.deepEqual(r.state.offer,[]);assert.equal(campaignAction(r.state,{type:'reward',card:null}).ok,false);
});
test('malformed choice history or illegal phase cannot create reward copies',()=>{
  for(const edit of [c=>delete c.choices,c=>c.choices.push({}),c=>c.deck.push('x06'),c=>c.phase='victory']){const c=newCampaign();edit(c);const before=structuredClone(c);const r=campaignAction(c,{type:'end'});assert.equal(r.reason,'state');assert.deepEqual(r.state,before);assert.deepEqual(c,before);}
});
test('reward RNG is independent of combat RNG consumption',()=>{
  const a=newCampaign(79);a.battle.hand=['x01'];a.battle.enemies[0].hp=1;a.battle.enemies[0].block=0;
  const b=structuredClone(a);b.battle.rng=0xffffffff;b.battle.draw.reverse();
  const ra=campaignAction(a,{type:'play',index:0}),rb=campaignAction(b,{type:'play',index:0});
  assert.equal(ra.state.phase,'reward');assert.deepEqual(ra.state.offer,rb.state.offer);assert.equal(ra.state.rewardRng,rb.state.rewardRng);
});
test('three real battles with skips reach terminal victory and reject further reward',()=>{
  let c=newCampaign(1),actions=0;
  while(!['victory','defeat'].includes(c.phase)&&actions++<300){
    const choice=c.phase==='reward'?{type:'reward',card:null}:(()=>{const a=choose(observe(c.battle),'guard');return a?{type:'play',...a}:{type:'end'};})();
    const r=campaignAction(c,choice);assert.equal(r.ok,true);c=r.state;
  }
  assert.equal(c.phase,'victory');assert.equal(c.stage,2);assert.equal(c.choices.length,2);assert.equal(c.battle.hp,3);assert.equal(campaignAction(c,{type:'reward',card:null}).ok,false);
});
