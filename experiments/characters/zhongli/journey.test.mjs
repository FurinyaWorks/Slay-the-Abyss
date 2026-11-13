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
test('v13 dismantle prerequisite policy and lifecycle never grant an unearned Power',()=>{
 assert.equal(selectReward({hp:60,deck:[],offer:['zl23','zl03','zl21']},'dismantle'),3);assert.equal(selectReward({hp:60,deck:['zl21'],offer:['zl23','zl03','zl21']},'dismantle'),1);
 let seed=1;while(!offers(seed,1,'v13').includes('zl21'))seed++;const s=journeyStart(seed,{poolVersion:'v13'});s.battle.enemy.hp=1;const reward=fightRoom(s,'offense','low');const n=takeReward(reward,selectReward(rewardView(reward),'dismantle'));assert.equal(n.deck.at(-1),'zl21');assert.equal(n.battle.pillar,0);
 for(const v of ['v1','v2','v3','v4','v5','v6','v7','v8','v9','v10','v11','v12'])assert.equal(offers(seed,1,v).includes('zl23'),false);
});

test('reserve search v14 is offered and enters deck through an actual winning reward, with old pools unchanged',()=>{
 let seed=1;while(seed<10000&&!offers(seed,1,'v14').includes('zl24'))seed++;assert.ok(seed<10000);
 let s=journeyStart(seed,{poolVersion:'v14'});s.battle.enemy.hp=1;s=fightRoom(s,'offense','low'); // lifecycle fixture, not normal-difficulty evidence
 const choice=selectReward(rewardView(s),'reserveSearch');assert.equal(s.offer[choice-1],'zl24');s=takeReward(s,choice);assert.ok(s.deck.includes('zl24'));assert.equal(s.room,2);
 for(let i=1;i<=500;i++){assert.ok(!offers(i,1,'v13').includes('zl24'));assert.equal(new Set(offers(i,1,'v14')).size,3);}
});

test('pillar guard v15 uses only owned setup and real reward choice, prior pools exclude it',()=>{
 let seed=1;while(seed<=10000&&!(offers(seed,1,'v15').includes('zl21')&&offers(seed,2,'v15').includes('zl25')))seed++;assert.ok(seed<=10000);
 let s=journeyStart(seed,{poolVersion:'v15'});
 for(let room=1;room<=2;room++){s.battle.enemy.hp=1;s=fightRoom(s,'offense','low');const choice=selectReward(rewardView(s),'pillarGuard');assert.equal(s.offer[choice-1],room===1?'zl21':'zl25');s=takeReward(s,choice);}
 assert.ok(s.deck.includes('zl21'));assert.ok(s.deck.includes('zl25'));
 for(let seed=1;seed<=100;seed++)assert.ok(!offers(seed,1,'v14').includes('zl25'));
});

test('held reserve is obtained through v16 reward and not injected into earlier pools',()=>{
 let seed=1;while(seed<10000&&!offers(seed,1,'v16').includes('zl26'))seed++;assert.ok(seed<10000);
 let s=journeyStart(seed,{poolVersion:'v16'});s.battle.enemy.hp=1;s=fightRoom(s,'offense','low');
 const choice=selectReward(rewardView(s),'heldReserve');assert.equal(s.offer[choice-1],'zl26');s=takeReward(s,choice);assert.ok(s.deck.includes('zl26'));
 for(let i=1;i<=100;i++)assert.ok(!offers(i,1,'v15').includes('zl26'));
});

test('collapse requires actual two-stage acquisition under v17 and prior v16 cannot offer it',()=>{
 let seed=1;while(seed<=10000&&!(offers(seed,1,'v17').includes('zl21')&&offers(seed,2,'v17').includes('zl27')))seed++;assert.ok(seed<=10000);
 let s=journeyStart(seed,{poolVersion:'v17'});
 for(let room=1;room<=2;room++){s.battle.enemy.hp=1;s=fightRoom(s,'offense','low');const choice=selectReward(rewardView(s),'collapse');assert.equal(s.offer[choice-1],room===1?'zl21':'zl27');s=takeReward(s,choice);}
 assert.ok(s.deck.includes('zl27'));for(let i=1;i<=100;i++)assert.ok(!offers(i,1,'v16').includes('zl27'));
});

test('suppression reserve v18 can be acquired without injecting it and older pools omit it',()=>{
 let seed=1;while(seed<10000&&!offers(seed,1,'v18').includes('zl28'))seed++;assert.ok(seed<10000);
 let s=journeyStart(seed,{poolVersion:'v18'});s.battle.enemy.hp=1;s=fightRoom(s,'offense','low');const choice=selectReward(rewardView(s),'suppressReserve');
 assert.equal(s.offer[choice-1],'zl28');s=takeReward(s,choice);assert.ok(s.deck.includes('zl28'));for(let i=1;i<=100;i++)assert.ok(!offers(i,1,'v17').includes('zl28'));
});

test('guarded exposure v19 reward has actual acquisition and previous pool unchanged',()=>{
 let seed=1;while(seed<10000&&!offers(seed,1,'v19').includes('zl29'))seed++;assert.ok(seed<10000);
 let s=journeyStart(seed,{poolVersion:'v19'});s.battle.enemy.hp=1;s=fightRoom(s,'offense','low');const choice=selectReward(rewardView(s),'guardedExpose');assert.equal(s.offer[choice-1],'zl29');s=takeReward(s,choice);assert.ok(s.deck.includes('zl29'));
 for(let i=1;i<=100;i++)assert.ok(!offers(i,1,'v18').includes('zl29'));
});

test('reserve burst enters v20 reward chain without appearing in v19',()=>{
 let seed=1;while(seed<10000&&!offers(seed,1,'v20').includes('zl30'))seed++;assert.ok(seed<10000);
 let s=journeyStart(seed,{poolVersion:'v20'});s.battle.enemy.hp=1;s=fightRoom(s,'offense','low');const choice=selectReward(rewardView(s),'reserveBurst');assert.equal(s.offer[choice-1],'zl30');s=takeReward(s,choice);assert.ok(s.deck.includes('zl30'));
 for(let i=1;i<=100;i++)assert.ok(!offers(i,1,'v19').includes('zl30'));
});

test('repair v21 enters through rewards and clears at next battle rather than inheriting installed strength',()=>{
 let seed=1;while(seed<10000&&!offers(seed,1,'v21').includes('zl31'))seed++;assert.ok(seed<10000);
 let s=journeyStart(seed,{poolVersion:'v21'});s.battle.enemy.hp=1;s=fightRoom(s,'offense','low');const choice=selectReward(rewardView(s),'repair');assert.equal(s.offer[choice-1],'zl31');s=takeReward(s,choice);assert.ok(s.deck.includes('zl31'));assert.equal(s.battle.repair,0);
 for(let i=1;i<=100;i++)assert.ok(!offers(i,1,'v20').includes('zl31'));
});

test('sacrifice counter v22 has reward acquisition and older pool exclusion',()=>{
 let seed=1;while(seed<10000&&!offers(seed,1,'v22').includes('zl32'))seed++;assert.ok(seed<10000);
 let s=journeyStart(seed,{poolVersion:'v22'});s.battle.enemy.hp=1;s=fightRoom(s,'offense','low');const choice=selectReward(rewardView(s),'sacrificeCounter');assert.equal(s.offer[choice-1],'zl32');s=takeReward(s,choice);assert.ok(s.deck.includes('zl32'));
 for(let i=1;i<=100;i++)assert.ok(!offers(i,1,'v21').includes('zl32'));
});

test('pillar growth v23 requires real two-stage reward acquisition',()=>{
 let seed=1;while(seed<=10000&&!(offers(seed,1,'v23').includes('zl21')&&offers(seed,2,'v23').includes('zl33')))seed++;assert.ok(seed<=10000);
 let s=journeyStart(seed,{poolVersion:'v23'});for(let room=1;room<=2;room++){s.battle.enemy.hp=1;s=fightRoom(s,'offense','low');const c=selectReward(rewardView(s),'growPillar');assert.equal(s.offer[c-1],room===1?'zl21':'zl33');s=takeReward(s,c);}
 assert.ok(s.deck.includes('zl33'));for(let i=1;i<=100;i++)assert.ok(!offers(i,1,'v22').includes('zl33'));
});
