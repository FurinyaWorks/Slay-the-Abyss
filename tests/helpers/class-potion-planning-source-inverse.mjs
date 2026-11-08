// Pure exact planning-only inverse; original calibration archives remain frozen.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
export const classPotionPlanningKey="tests/class-potion-orb-boundary.test.mjs";
export const classPotionPlanningFloor=Object.freeze({"durationMs": 180000, "environment": "local Linux", "coverage": "17 potion boundary cases including 13 independent old/current VM graph comparisons; first complete local run 162004.675552 ms, 16 passed and one negative-control expected-message mismatch subsequently corrected.", "kind": "Conservative planning-only floor; not a hosted measurement or a full-pass claim."});
export function preClassPotionPlanningSource(path,source){
 if(path!=='scripts/ci-test-timings.json'||typeof source!=='string')return source;
 const normalized=source.replaceAll('\r\n','\n');
 const currentHash=hash(normalized);
 if(!['331342d5f9a9f56a39b4cfb7b18d03629704648d9972e04900b3e9ff18727c46','4f737b7c4391304e0a16f68b7b81c35747b5c57578702ba5899f91042109fd64'].includes(currentHash))return source;
 const value=JSON.parse(normalized);
 assert.deepEqual(value.jsPlanning.localLowerBounds[classPotionPlanningKey],classPotionPlanningFloor);
 delete value.jsPlanning.localLowerBounds[classPotionPlanningKey];
 const previous=JSON.stringify(value,null,2)+'\n';
 assert.equal(hash(previous),currentHash==='4f737b7c4391304e0a16f68b7b81c35747b5c57578702ba5899f91042109fd64'?'babd54a4b184c44070b64729fc0285625e69c567e390213f09aa474a7a8f5ab8':'a5841ddaa53d8bc810f9c16ae342ed2de8cb5479bbcb073562d2c6c921ed1b24','complete unchanged pre-potion planning bytes');
 return previous;
}
