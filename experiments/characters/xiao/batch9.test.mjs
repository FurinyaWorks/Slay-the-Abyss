import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,cardText} from './model.mjs';
import {newBattle,battlePlay,advance,intent} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`current attack condition, not future, upgraded=${upgraded}`,()=>{
  for(const attack of [0,8])for(const mask of [0,2]){
   const s=state({hand:['x25'],enemies:[{hp:40,block:3,intent:[attack,999]}]});s.mask=mask;
   const r=play(s,{index:0,upgraded});assert.equal(r.ok,true);assert.equal(r.state.enemies[0].hp,43-(upgraded?11:8)-(attack?4:0)-(mask?4:0));
   s.enemies[0].intent[1]=0;assert.equal(play(s,{index:0,upgraded}).state.enemies[0].hp,r.state.enemies[0].hp);
  }
 });
 test(`quiet draw checks all live enemies upgraded=${upgraded}`,()=>{
  for(const attack of [0,5]){
   const s=state({hand:['x26'],draw:['x01','x02','x03'],enemies:[{hp:30,block:0,intent:[0]},{hp:20,block:0,intent:[attack]},{hp:0,block:0,intent:[99]}]});
   const r=play(s,{index:0,upgraded});assert.equal(r.state.hand.length,attack?0:upgraded?3:2);assert.deepEqual(r.state.exhaust,['x26']);
  }
 });
}
test('missing or malformed intention rejects new conditional effects atomically',()=>{
 for(const id of ['x25','x26'])for(const bad of [undefined,[],[NaN],[-1]]){
  const s=state({hand:[id],enemies:[{hp:30,block:0,intent:bad}]});assert.equal(play(s,{index:0}).ok,false);assert.deepEqual(play(s,{index:0}).state,s);
 }
});
test('real alternating encounter supports both windows without changing old route',()=>{
 let s=newBattle({encounter:'respite',deck:['x26','x25','x01','x02','x03','x04'],seed:2});
 // Reach a real x26 hand by deterministic draw, without injecting it.
 let tries=0;while(!s.hand.includes('x26')&&tries++<6)s=advance(s);
 assert.ok(s.hand.includes('x26'));assert.equal(intent(s,s.enemies[0]),0);
 const n=battlePlay(s,{index:s.hand.indexOf('x26')});assert.equal(n.ok,true);assert.ok(n.state.exhaust.includes('x26'));
 s=advance(n.state);assert.equal(intent(s,s.enemies[0]),16);
});
test('bounded real reward search acquires x25 and plays it next battle',async()=>{
 const {newCampaign,campaignAction}=await import('./campaign.mjs');const {observe,choose}=await import('./research.mjs');
 let c;
 for(let seed=1;seed<=128;seed++){
  let candidate=newCampaign(seed);
  for(let i=0;i<200&&candidate.phase==='battle';i++){const a=choose(observe(candidate.battle),'guard');candidate=campaignAction(candidate,a?{type:'play',...a}:{type:'end'}).state;}
  if(candidate.phase==='reward'&&candidate.offer.includes('x25')){c=candidate;break;}
 }
 assert.ok(c);
 for(let i=0;i<200&&c.phase==='battle';i++){const a=choose(observe(c.battle),'guard');const r=campaignAction(c,a?{type:'play',...a}:{type:'end'});assert.equal(r.ok,true);c=r.state;}
 assert.equal(c.phase,'reward');assert.ok(c.offer.includes('x25'));c=campaignAction(c,{type:'reward',card:'x25'}).state;
 let played=false;
 for(let i=0;i<200&&c.phase==='battle';i++){const a=choose(observe(c.battle),'guard'),id=a?c.battle.hand[a.index]:null;const r=campaignAction(c,a?{type:'play',...a}:{type:'end'});assert.equal(r.ok,true);c=r.state;if(id==='x25'){played=true;break;}}
 assert.equal(played,true);assert.equal(c.deck.length,11);assert.equal(c.choices[0].selected,'x25');
});
test('intent card texts expose base upgrade and conditional scope',()=>{
 for(const upgraded of [false,true]){
  assert.ok(cardText(catalog.cards.find(c=>c.id==='x25'),upgraded).includes(upgraded?'11点':'8点'));
  assert.ok(cardText(catalog.cards.find(c=>c.id==='x26'),upgraded).includes(upgraded?'3张':'2张'));
 }
});
test('quiet condition validates all live intentions even after an attacking enemy',()=>{
 const s=state({hand:['x26'],enemies:[{hp:20,block:0,intent:[8]},{hp:20,block:0}]});
 assert.equal(play(s,{index:0}).ok,false);assert.deepEqual(play(s,{index:0}).state,s);
});
test('sparse intentions at current or future slots reject core and adapter atomically',()=>{
 for(const pattern of [Array(1),[0,,8],[,0]])for(const id of ['x25','x26']){
  const s=state({hand:[id],enemies:[{hp:30,block:0,intent:pattern}]});
  assert.equal(play(s,{index:0}).ok,false);assert.deepEqual(play(s,{index:0}).state,s);
  const b=newBattle({deck:[id]});b.enemies[0].intent=pattern;
  assert.equal(battlePlay(b,{index:0}).ok,false);assert.deepEqual(battlePlay(b,{index:0}).state,b);assert.deepEqual(advance(b),b);
 }
});
