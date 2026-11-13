import test from 'node:test';import assert from 'node:assert/strict';import {checkTraceability,readInputs} from './integrity.mjs';
test('all 75 source rows and per-card effects match the frozen candidate inventory',()=>{assert.deepEqual(checkTraceability(...readInputs()),[]);});
test('source trace rejects drift, duplicate inventory, false approval and broken local locators',()=>{
 const mutations=[
  ([c,s])=>s.records[6].decision_role='old role',
  ([c,s])=>s.records[7].decision_role='old role',
  ([c,s])=>s.records[0].name='approved display',
  ([c,s])=>s.records[0].proposed_name='different candidate',
  ([c,s])=>s.records[0].effect_ref='cards.json#ganyu-02',
  ([c,s])=>s.records[0].source_locator='missing-file.md',
  ([c,s])=>s.records[0].source_locator+='-missing-heading',
  ([c,s])=>s.records[0].source_verified=true,
  ([c,s])=>s.records[0].human_review.approved=true,
  ([c,s,m])=>m.rows[0].primary_verified=true,
  ([c,s,m])=>m.rows[0].effects=['unrecorded-effect'],
  ([c,s,m])=>m.rows[0].id=m.rows[1].id,
  ([c,s])=>s.records.pop(),
 ];
 for(const mutate of mutations){const data=structuredClone(readInputs());mutate(data);assert.ok(checkTraceability(...data).length>0);}
});
test('matrix effect set order is not falsely interpreted as execution order',()=>{const data=readInputs();data[2].rows[3].effects.reverse();assert.deepEqual(checkTraceability(...data),[]);});
