import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cards,describe} from './mechanics.mjs';
const data=JSON.parse(readFileSync(new URL('design-candidates.json',import.meta.url)));
test('75 concrete candidate slots are not confused with implemented or approved cards',()=>{
  assert.equal(data.entries.length,75);
  assert.equal(new Set(data.entries.map(x=>x.id)).size,75);
  assert.equal(data.implemented,Object.keys(cards).length);
  for(const x of data.entries){
    assert.ok(x.role&&x.base&&x.upgraded&&x.criticalProbe);
    assert.ok(Number.isInteger(x.cost)&&x.cost>=1&&x.cost<=3);
    assert.equal(x.status,'HOLD'); assert.equal(x.rarity,'pending');
    assert.ok(Object.values(x.gates).every(v=>v===false)); assert.equal(x.source.verified,false);
    if(x.implementation==='isolated_implemented'){
      assert.equal(x.base,describe(x.id,false)); assert.equal(x.upgraded,describe(x.id,true));
      assert.equal(x.effectAuthority,'mechanics.mjs#cards.'+x.id);
    }else assert.equal(cards[x.id],undefined);
  }
});
