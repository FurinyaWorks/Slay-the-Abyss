import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {compileCard,build} from './compile.mjs';
const cards=JSON.parse(readFileSync(new URL('./source-candidates.json',import.meta.url))).cards;
test('four staged definitions preserve independent base/up values and 71 remain unmapped',()=>{
 const r=build();assert.equal(r.cards.length,4);assert.equal(r.unmapped.length,71);assert.equal(r.productionEnabled,false);
 assert.deepEqual(r.cards.map(c=>[c.cost,c.effects.map(e=>e.value),c.upgrade.cost,c.upgrade.effects.map(e=>e.value)]),[[1,[6],1,[9]],[1,[5],1,[8]],[1,[4,1],1,[6,1]],[1,[3],1,[4]]]);
 assert.equal(r.cards[3].exhaust,true);assert.ok(r.cards.every(c=>c.reviewStatus==='HOLD'&&!c.productionEnabled));
});
test('unsupported resources, retention, malformed effects and target fail closed',()=>{
 assert.throws(()=>compileCard(cards.find(c=>c.id==='ganyu-03')));
 for(const mutate of [c=>c.retain=true,c=>c.condition="only_attacks_in_hand",c=>c.costMode="all_energy",c=>c.ethereal=true,c=>c.exhaust="true",c=>c.base.retain=true,c=>c.upgrade.extra=1,c=>c.base.effects[0].op='charge',c=>c.base.effects[0].amount=NaN,c=>c.base.effects[0].extra=1,c=>c.target='all',c=>c.upgrade.cost=-1,c=>c.review.human_approved=true]){
 const c=structuredClone(cards[0]);mutate(c);assert.throws(()=>compileCard(c));}
});
