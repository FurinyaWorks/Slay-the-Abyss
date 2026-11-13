import test from 'node:test';import assert from 'node:assert/strict';
import {createResearchRun} from './acquisition.mjs';import {command,mildRoute} from './run-console.mjs';
test('human reward adapter: win, open, skip, reopen, claim, proceed and persistent deck',()=>{
 let s=createResearchRun([[{hp:1,block:0,intent:0}],[{hp:30,block:0,intent:1}]],{deck:[{id:'ganyu-01'}]});
 s=command(s,'1 1');assert.equal(s.phase,'reward');s=command(s,'o');const offer=[...s.offer.cards];s=command(s,'s');s=command(s,'o');assert.deepEqual(s.offer.cards,offer);
 s=command(s,'2');assert.equal(s.deck.at(-1).id,offer[1]);const before=structuredClone(s);assert.throws(()=>command(s,'2'));assert.deepEqual(s,before);
 s=command(s,'p');assert.equal(s.phase,'battle');assert.equal(s.deck.length,2);assert.equal(s.offer,null);
 assert.deepEqual([...s.battle.hand,...s.battle.draw].map(c=>c.id).sort(),['ganyu-01',offer[1]].sort());
});
test('strict invalid commands do not mutate original run',()=>{
 const s=createResearchRun(mildRoute);for(const text of ['0','-1','1 0','1 2 junk','q','o','1.2','e junk']){const before=structuredClone(s);assert.throws(()=>command(s,text));assert.deepEqual(s,before);}
});
