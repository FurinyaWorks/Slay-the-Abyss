import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {cards} from './model.mjs';
test('source inventory exactly matches all implemented candidate IDs and does not invent approval',()=>{
 const s=JSON.parse(readFileSync(new URL('./sources.json',import.meta.url),'utf8'));
 assert.deepEqual(s.cardIds,cards.map(c=>c.id));assert.equal(new Set(s.cardIds).size,cards.length);assert.equal(s.humanReview.approved,false);assert.equal(s.status,'HOLD');
 for(const c of cards){assert.equal(c.approval,'HOLD');assert.equal(c.sourceVerified,false);if(Number(c.id.slice(2))>=7)assert.equal(typeof s.adaptationBoundary[c.id],'string');}
});
