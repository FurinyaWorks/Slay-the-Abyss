import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {validateCandidate} from './validate.mjs';
const read=n=>JSON.parse(readFileSync(new URL(n,import.meta.url)));
test('complete candidate schema accepted without granting production approval',()=>{assert.deepEqual(validateCandidate(read('cards.json'),read('relic.json'),read('sources.json')),[]);});
test('reject representative bad effect/source/approval/upgrade/relic variants',()=>{
 const mutations=[(d,r,s)=>d.cards[0].base.effects[0].amount=-1,(d,r,s)=>d.cards[0].upgrade.cost=NaN,(d,r,s)=>d.cards[0].base.effects[0].op='typo',(d,r,s)=>s.records.pop(),(d,r,s)=>s.version='stale',(d,r,s)=>d.cards[0].review.human_approved='false',(d,r,s)=>d.cards[0].name='假的正式名',(d,r,s)=>r.effect.energy_per_charge=0,(d,r,s)=>d.starting_deck.push('missing'),(d,r,s)=>d.production_enabled=true];
 for(const mutate of mutations){const d=read('cards.json'),r=read('relic.json'),s=read('sources.json');mutate(d,r,s);assert.ok(validateCandidate(d,r,s).length);}
});
test('batch source locators resolve to existing local evidence-index documents without fabricated anchors',()=>{for(const r of read('sources.json').records){if(r.source_locator.startsWith('batch-')){assert.match(r.source_locator,/^batch-\d+\.md$/);assert.ok(readFileSync(new URL(r.source_locator,import.meta.url),'utf8').length>0);}}});
