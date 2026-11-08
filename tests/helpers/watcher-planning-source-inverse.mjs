// Exact planning-only addition. Historical measurements and original floors remain frozen.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
export const watcherPlanningKey="tests/watcher-actor-boundary.test.mjs";
export const watcherPlanningFloor=Object.freeze({"durationMs": 30000, "environment": "local Linux", "coverage": "9 original boundary cases took 21763.220989 ms (8 passed, 1 graph assertion failed); graph assertion corrected and rerun separately. One added frozen-Halt protocol case took 1218.265678 ms including runner. Both unchanged behavior fixture pairs passed.", "kind": "Conservative planning-only floor; not a hosted observation or full-pass claim."});
export function preWatcherPlanningSource(path,source){
 if(path!=='scripts/ci-test-timings.json'||typeof source!=='string')return source;
 const normalized=source.replaceAll('\r\n','\n');
 const currentHash=hash(normalized);
 if(!['babd54a4b184c44070b64729fc0285625e69c567e390213f09aa474a7a8f5ab8','4f737b7c4391304e0a16f68b7b81c35747b5c57578702ba5899f91042109fd64'].includes(currentHash))return source;
 const value=JSON.parse(normalized);
 assert.deepEqual(value.jsPlanning.localLowerBounds[watcherPlanningKey],watcherPlanningFloor);
 delete value.jsPlanning.localLowerBounds[watcherPlanningKey];
 const previous=JSON.stringify(value,null,2)+'\n';
 assert.equal(hash(previous),currentHash==='4f737b7c4391304e0a16f68b7b81c35747b5c57578702ba5899f91042109fd64'?'331342d5f9a9f56a39b4cfb7b18d03629704648d9972e04900b3e9ff18727c46':'a5841ddaa53d8bc810f9c16ae342ed2de8cb5479bbcb073562d2c6c921ed1b24');
 return previous;
}
