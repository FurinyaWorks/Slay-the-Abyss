import test from 'node:test';import assert from 'node:assert/strict';
import {journeyStart,offers,fightRoom,takeReward,rewardView,selectReward} from './journey.mjs';
function won(){const s=journeyStart(3001);s.battle.enemy.hp=1;return fightRoom(s,'offense','low');}
test('three distinct common offers deterministic; independent of deck',()=>{assert.deepEqual(offers(3001,1),offers(3001,1));assert.equal(new Set(offers(3001,1)).size,3);});
test('reward rejects before victory, bad index, replay and preserves original',()=>{
 const start=journeyStart(),before=structuredClone(start);assert.throws(()=>takeReward(start,1));assert.deepEqual(start,before);
 const s=won(),copy=structuredClone(s);for(const x of [-1,4,NaN,'1'])assert.throws(()=>takeReward(s,x));
 assert.deepEqual(s,copy);const next=takeReward(s,1);assert.throws(()=>takeReward(next,1));
});
test('acquisition adds exactly one unique instance for next room, carries HP but resets jade',()=>{
 const s=won();s.battle.hp=47;s.battle.jade=19;const id=s.offer[0],before=s.deck.filter(x=>x===id).length;
 const n=takeReward(s,1);assert.equal(n.deck.length,11);assert.equal(n.deck.filter(x=>x===id).length,before+1);
 assert.equal(n.battle.hp,47);assert.equal(n.battle.jade,3);assert.equal(n.battle.relicApplied,true);
 assert.equal(new Set([...n.battle.draw,...n.battle.hand,...n.battle.discard]).size,11);assert.equal(n.battle.hand.length,5);
 assert.equal(n.battle.turn,1);assert.equal(n.battle.energy,3);
});
test('abandon keeps deck, cannot claim forged offer; closed run has no rewards',()=>{
 const s=won();assert.deepEqual(takeReward(s,0).deck,s.deck);s.offer[0]='zl05';assert.throws(()=>takeReward(s,1));
 const dead=journeyStart();dead.battle.hp=0;assert.equal(fightRoom(dead).phase,'death');
 assert.throws(()=>takeReward(fightRoom(dead),0));
});
test('reward policy sees known deck and offers only; no future information',()=>{
 const s=won(),v=rewardView(s);assert.deepEqual(Object.keys(v).sort(),['deck','hp','offer']);
 Object.defineProperty(v,'future',{get(){throw new Error('hidden');}});
 for(const p of ['skip','hybrid','reserve'])assert.ok(selectReward(v,p)>=0);
 const n=takeReward(s,0);n.room=3;n.battle.enemy.hp=1;
 const final=fightRoom(n,'offense','low');assert.equal(final.phase,'complete');assert.deepEqual(final.offer,[]);
});
test('terminal phase consistency rejects fourth room and forged outcomes atomically',()=>{
 const s=won();s.room=3;s.phase='reward';s.offer=offers(s.seed,3);
 const before=structuredClone(s);assert.throws(()=>takeReward(s,1),/terminal reward/);assert.deepEqual(s,before);
 for(const phase of ['complete','death','truncated']){
  const invalid=won();invalid.phase=phase;
  const original=structuredClone(invalid);assert.throws(()=>rewardView(invalid));assert.deepEqual(invalid,original);
 }
 const live=journeyStart();live.phase='complete';live.room=3;assert.throws(()=>rewardView(live));
});
test('versioned restricted common pool keeps historical offers and exposes 9/11/12',()=>{
 let found=new Set();for(let seed=1;seed<=100;seed++){
  assert.deepEqual(offers(seed,1),offers(seed,1,'v1'));
  const o=offers(seed,1,'v2');assert.equal(new Set(o).size,3);o.forEach(x=>found.add(x));
 }
 for(const id of ['zl09','zl11','zl12'])assert.ok(found.has(id));
 assert.equal(found.has('zl05'),false);assert.equal(found.has('zl10'),false);
 assert.throws(()=>journeyStart(1,{poolVersion:'complete75'}));
 for(const [id,policy] of [['zl09','suppress'],['zl11','guarded'],['zl12','access']]){
  let seed=1;while(!offers(seed,1,'v2').includes(id))seed++;
  const s=journeyStart(seed,{poolVersion:'v2'});s.battle.enemy.hp=1;
  const reward=fightRoom(s,'offense','low'),choice=selectReward(rewardView(reward),policy),next=takeReward(reward,choice);
  assert.ok(choice>0);assert.equal(next.deck.at(-1),id);assert.equal(next.deck.length,11);
 }
});
test('v3 adds exposure candidate without rewriting older offers and can acquire it after victory',()=>{
 let seed=1;while(!offers(seed,1,'v3').includes('zl13'))seed++;
 const s=journeyStart(seed,{poolVersion:'v3'});s.battle.enemy.hp=1;
 const reward=fightRoom(s,'offense','low');const n=takeReward(reward,selectReward(rewardView(reward),'expose'));
 assert.equal(n.deck.at(-1),'zl13');assert.equal(n.deck.length,11);assert.equal(n.battle.enemy.vulnerable,0);
 assert.equal(offers(seed,1,'v1').includes('zl13'),false);assert.equal(offers(seed,1,'v2').includes('zl13'),false);
});
test('v4 retained role is obtainable, old pools remain unchanged',()=>{
 let seed=1;while(!offers(seed,1,'v4').includes('zl14'))seed++;
 const s=journeyStart(seed,{poolVersion:'v4'});s.battle.enemy.hp=1;const reward=fightRoom(s,'offense','low');const n=takeReward(reward,selectReward(rewardView(reward),'wait'));
 assert.equal(n.deck.at(-1),'zl14');assert.equal(n.deck.length,11);for(const v of ['v1','v2','v3'])assert.equal(offers(seed,1,v).includes('zl14'),false);
});
test('v5 counter role can be acquired and simultaneous death never creates a reward',()=>{
 let seed=1;while(!offers(seed,1,'v5').includes('zl15'))seed++;
 const s=journeyStart(seed,{poolVersion:'v5'});s.battle.enemy.hp=1;const reward=fightRoom(s,'offense','low');const n=takeReward(reward,selectReward(rewardView(reward),'counter'));
 assert.equal(n.deck.at(-1),'zl15');assert.equal(n.battle.counter,0);
 const dead=journeyStart();dead.battle.hp=0;dead.battle.enemy.hp=0;const ended=fightRoom(dead);assert.equal(ended.phase,'death');assert.throws(()=>takeReward(ended,0));
});

test('v6 conversion is acquired exactly once after victory, not silently added to older pools',()=>{
 let seed=1;while(!offers(seed,1,'v6').includes('zl16'))seed++;
 const s=journeyStart(seed,{poolVersion:'v6'});s.battle.enemy.hp=1;const reward=fightRoom(s,'offense','low');const n=takeReward(reward,selectReward(rewardView(reward),'convert'));
 assert.equal(n.deck.at(-1),'zl16');assert.equal(n.deck.length,11);assert.throws(()=>takeReward(n,1));
 for(const v of ['v1','v2','v3','v4','v5'])assert.equal(offers(seed,1,v).includes('zl16'),false);
});

test('v7 antiarmor candidate follows victory reward and leaves historical pools intact',()=>{
 let seed=1;while(!offers(seed,1,'v7').includes('zl17'))seed++;
 const s=journeyStart(seed,{poolVersion:'v7'});s.battle.enemy.hp=1;const reward=fightRoom(s,'offense','low');const n=takeReward(reward,selectReward(rewardView(reward),'breach'));
 assert.equal(n.deck.at(-1),'zl17');assert.equal(n.deck.length,11);assert.throws(()=>takeReward(n,1));
 for(const v of ['v1','v2','v3','v4','v5','v6'])assert.equal(offers(seed,1,v).includes('zl17'),false);
});

test('v8 reserve payoff lifecycle acquisition fixture preserves older pools',()=>{
 let seed=1;while(!offers(seed,1,'v8').includes('zl18'))seed++;
 const s=journeyStart(seed,{poolVersion:'v8'});s.battle.enemy.hp=1;const reward=fightRoom(s,'offense','low');const n=takeReward(reward,selectReward(rewardView(reward),'reservePayoff'));
 assert.equal(n.deck.at(-1),'zl18');assert.equal(n.deck.length,11);assert.throws(()=>takeReward(n,1));
 for(const v of ['v1','v2','v3','v4','v5','v6','v7'])assert.equal(offers(seed,1,v).includes('zl18'),false);
});

test('v9 one-shot access follows reward lifecycle while older offers remain unchanged',()=>{
 let seed=1;while(!offers(seed,1,'v9').includes('zl19'))seed++;
 const s=journeyStart(seed,{poolVersion:'v9'});s.battle.enemy.hp=1;const reward=fightRoom(s,'offense','low');const n=takeReward(reward,selectReward(rewardView(reward),'reserveAccess'));
 assert.equal(n.deck.at(-1),'zl19');assert.equal(n.deck.length,11);assert.throws(()=>takeReward(n,1));for(const v of ['v1','v2','v3','v4','v5','v6','v7','v8'])assert.equal(offers(seed,1,v).includes('zl19'),false);
});

test('v10 rebuild acquisition is a lifecycle fixture, never added to historical pools',()=>{
 let seed=1;while(!offers(seed,1,'v10').includes('zl20'))seed++;
 const s=journeyStart(seed,{poolVersion:'v10'});s.battle.enemy.hp=1;const reward=fightRoom(s,'offense','low');const n=takeReward(reward,selectReward(rewardView(reward),'rebuild'));
 assert.equal(n.deck.at(-1),'zl20');assert.equal(n.deck.length,11);assert.throws(()=>takeReward(n,1));for(const v of ['v1','v2','v3','v4','v5','v6','v7','v8','v9'])assert.equal(offers(seed,1,v).includes('zl20'),false);
});
test('v11 Power reward carries the card but resets installed effect between rooms',()=>{
 let seed=1;while(!offers(seed,1,'v11').includes('zl21'))seed++;
 const s=journeyStart(seed,{poolVersion:'v11'});s.battle.enemy.hp=1;const reward=fightRoom(s,'offense','low');const n=takeReward(reward,selectReward(rewardView(reward),'pillar'));
 assert.equal(n.deck.at(-1),'zl21');assert.equal(n.battle.pillar,0);assert.deepEqual(n.battle.powers,[]);
 for(const v of ['v1','v2','v3','v4','v5','v6','v7','v8','v9','v10'])assert.equal(offers(seed,1,v).includes('zl21'),false);
});

test('v12 pulse is obtainable but does not silently grant its prerequisite Power',()=>{
 let seed=1;while(!offers(seed,1,'v12').includes('zl22'))seed++;
 const s=journeyStart(seed,{poolVersion:'v12'});s.battle.enemy.hp=1;const reward=fightRoom(s,'offense','low');const n=takeReward(reward,selectReward(rewardView(reward),'pulse'));
 assert.equal(n.deck.at(-1),'zl22');assert.equal(n.deck.includes('zl21'),false);assert.equal(n.battle.pillar,0);
 for(const v of ['v1','v2','v3','v4','v5','v6','v7','v8','v9','v10','v11'])assert.equal(offers(seed,1,v).includes('zl22'),false);
});
test('resonance reward policy uses only visible acquired prerequisites, not future offers',()=>{
 const v={hp:60,deck:['zl01'],offer:['zl22','zl21','zl03']};Object.defineProperty(v,'future',{get(){throw new Error('future');}});
 assert.equal(selectReward(v,'resonance'),2);assert.equal(selectReward({...v,deck:['zl21']},'resonance'),1);assert.equal(selectReward({...v,deck:['zl21','zl22']},'resonance'),0);
 assert.equal(selectReward({hp:60,deck:[],offer:['zl22','zl03','zl04']},'resonance'),0);
});
