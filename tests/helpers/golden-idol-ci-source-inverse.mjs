// Exact recovery adapter; old archives, costs and receipt identities stay frozen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./golden-idol-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'04f512415676b3110285c40f6c19324010c1f5ecf7ffe68e063bf6aedd17b24a');
const bytes=gunzipSync(archive);assert.equal(hash(bytes),'0b83c1feeff930568dde9f1f6a82d7086c98904f61ce95ed53c391d33a1885e0');
export const goldenIdolCiProof=JSON.parse(bytes);
for(const binding of Object.values(goldenIdolCiProof.files))assert.equal(hash(binding.beforeSource),binding.beforeSha256);
export function preGoldenIdolCiSource(path,source){
 const binding=Object.hasOwn(goldenIdolCiProof.files,path)?goldenIdolCiProof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}

export const goldenIdolPlanningFloors=Object.freeze({"tests/golden-idol-source-epoch.test.mjs":{"durationMs":32448,"environment":"cloud Linux local","tests":11,"coverage":"11/11 complete file passed; 0 failed, cancelled or skipped.","kind":"Local complete-run planning floor only; not a hosted measurement, execution permission or timeout change.","nodeReportedDurationMs":32447.110123,"sourceLog":"docs/evidence/m7-golden-idol-20261109/source.log.gz","sourceLogSha256":"4de8f9f4e8209fd02212e9bbde5b61fbf91fafac32416ed3a7730d7d02e4c1b6","sourceLogUncompressedSha256":"58b9b87f35c0e03a4cfc2bfca0ddeed9ce45a2680d9005d884a4da9e40a8cc08","testSha256":"e80849a632fb5945d31609d15a0a47a376d75fa52717b73410ca08088f7be6a7","sourceReceipt":"docs/evidence/m7-golden-idol-20261109/source-receipt.json","sourceReceiptSha256":"0c8e9d3293facae7a64943d25c021e2ff189ee95fb93116a66f6101ef984a2eb"}});
