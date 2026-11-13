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
