import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from './model.mjs';
import ledger from './evidence/source-ledger.json' with {type:'json'};
test('source ledger covers exact card IDs and BOTH base and upgraded effects',()=>{
 assert.deepEqual(ledger.cards.map(c=>c.id),catalog.cards.map(c=>c.id));
 for(const c of catalog.cards){const r=ledger.cards.find(x=>x.id===c.id);assert.deepEqual(r.baseOps,c.base.map(e=>e.op));assert.deepEqual(r.upgradeOps,c.upgrade.map(e=>e.op));assert.deepEqual(r.ops,[...new Set([...r.baseOps,...r.upgradeOps])]);assert.equal(r.specificMechanicVerified,false);assert.equal(r.humanApproved,false);}
 assert.ok(ledger.cards.find(x=>x.id==='x70').ops.includes('draw'));
});
