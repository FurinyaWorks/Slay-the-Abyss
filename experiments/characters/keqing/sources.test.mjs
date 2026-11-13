import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cards} from './mechanics.mjs';
const source=JSON.parse(fs.readFileSync(new URL('./sources.json',import.meta.url)));
const design=JSON.parse(fs.readFileSync(new URL('./design-candidates.json',import.meta.url)));
test('75 source records cover exactly contracts, without implying validated naming',()=>{
 assert.deepEqual(source.cards.map(c=>c.card_id).sort(),design.entries.map(c=>c.id).sort());
 for(const c of source.cards){assert.equal(c.status,'HOLD');assert.equal(c.human_review.approved,false);assert.equal(c.source_verified,false);assert.equal(c.source_text,null);assert.equal(c.name,'待命名·'+c.card_id);if(cards[c.card_id])assert.equal(c.effect_ref,'mechanics.mjs#cards.'+c.card_id);}
 assert.equal(source.recheck.infusionNotice.readableLines,0);assert.equal(source.recheck.video.transcript,null);
});
