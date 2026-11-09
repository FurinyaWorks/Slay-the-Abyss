// Exact outer CI source epoch. Original observed costs and historical gate proofs stay immutable.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./relic-equip-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),"541ff621ffe4b9413b90a284949dfb496cdfbe06cb05826307b56b0ac044fd47");
const bytes=gunzipSync(archive);assert.equal(hash(bytes),"3460ce3db45ab26c3cb028a9597932ad2b6c5c8fddbcf216d9619d01bd1f9cc9");
const proof=JSON.parse(bytes);
for(const binding of Object.values(proof.files))assert.equal(hash(binding.beforeSource),binding.beforeSha256);
export const relicEquipPlanningKey="tests/relic-equip-responsibilities.test.mjs";
export const relicEquipPlanningFloor=Object.freeze({"durationMs":7908,"environment":"cloud Linux local","coverage":"15/15 complete file passed; 0 failed, cancelled or skipped. Includes 143 full-graph checkpoints and 10 semantic mutants.","kind":"Local complete-run planning floor only; not a hosted measurement, execution permission or timeout change.","nodeReportedDurationMs":7907.592055,"sourceLog":"docs/evidence/m7-relic-equip-20261109/behavior.log.gz","sourceLogSha256":"c30404b16c0fddbb00ae1fd3ece792503b44ff965e3dd2d9cb46b5c1c3459883","sourceLogUncompressedSha256":"2f47cafcef466482c0a6f87c5d0c3eeba992be690cca90c5e6ac7644a26d82c8","sourceReceipt":"docs/evidence/m7-relic-equip-20261109/behavior-receipt.json","sourceReceiptSha256":"3a11b8b354f9f6ec395fa29fb34939b900c216c26dabf08d7e9c09dd17627be9"});
export function preRelicEquipCiSource(path,source){
 const binding=proof.files[path];
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
