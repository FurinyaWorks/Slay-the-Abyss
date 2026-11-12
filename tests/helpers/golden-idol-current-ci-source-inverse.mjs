// Exact outer recovery to develop 6a614fc; the legacy 1eb Golden Idol archive stays frozen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archiveSha='c422925a6eed65e71973693175391884442636d28a583cd1633f4937a5102216',sourceSha='6a0b889ac439717037caf01f25e61821345400a38caba8b46c69fb1429d79add';
const archive=readFileSync(new URL('./golden-idol-current-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),archiveSha,'current Golden Idol CI compressed identity');
const bytes=gunzipSync(archive);assert.equal(hash(bytes),sourceSha,'current Golden Idol CI source identity');
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
export const goldenIdolCurrentCiProof=freeze(JSON.parse(bytes));
for(const binding of Object.values(goldenIdolCurrentCiProof.files))assert.equal(hash(binding.beforeSource),binding.beforeSha256);
export const goldenIdolCurrentJs=Object.freeze(Object.keys(goldenIdolCurrentCiProof.added));
export function preGoldenIdolCurrentCiSource(path,source){
 const binding=Object.hasOwn(goldenIdolCurrentCiProof.files,path)?goldenIdolCurrentCiProof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
export function preGoldenIdolCurrentCiInventory(paths){
 assert.deepEqual([...paths].sort(),[...goldenIdolCurrentCiProof.inventory.js,...goldenIdolCurrentJs].sort(),'complete current Golden Idol inventory');
 for(const [path,sha]of Object.entries(goldenIdolCurrentCiProof.added))assert.equal(hash(readFileSync(path,'utf8').replaceAll('\r\n','\n')),sha,'added Golden Idol inventory source: '+path);
 return [...goldenIdolCurrentCiProof.inventory.js];
}

export const goldenIdolCurrentPlanningFloors=Object.freeze({"tests/golden-idol-source-epoch.test.mjs":{"durationMs":32448,"environment":"cloud Linux local","tests":11,"coverage":"11/11 complete current file passed; 0 failed, cancelled or skipped.","kind":"Local complete-run planning floor only; retains the higher historical Golden Idol floor conservatively. Not a hosted measurement, speedup claim, execution permission or timeout change.","nodeReportedDurationMs":21629.418911,"wallDurationMs":null,"historicalFloorMs":32448,"sourceLog":"docs/evidence/m7-golden-idol-current-20261111/source-final.log.gz","sourceLogSha256":"34cf2e9769f1fdbe0ec314876870c937e4866056a19ee9c4e03456d340ac1b59","sourceLogUncompressedSha256":"2f1c4d4a9da68aafd66cef6e985731acc5b8d1c45e7e04c53e6247dc9b956a91","testSha256":"8709c8de6cd8fdc5ee8aad61e6c68f25d2ba077c7a545c13f1908f30549006d4","sourceReceipt":"docs/evidence/m7-golden-idol-current-20261111/source-receipt.json","sourceReceiptSha256":"943d5446780f34dea1e23514eb381bd77430d463b0221db496f390623be31993"}});
