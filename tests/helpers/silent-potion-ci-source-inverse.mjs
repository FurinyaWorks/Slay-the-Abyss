// Exact recovery adapter; old archives, costs and receipt identities stay frozen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./silent-potion-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'d58c6216039b1c26b26f08a1f5976ce2c09a98709da8590d35de097b3d023a03');
const bytes=gunzipSync(archive);assert.equal(hash(bytes),'c5ab74c396a12fa298deb8317986201be643a2b7d13dce0f808b1ddb66afe81d');
export const silentPotionCiProof=JSON.parse(bytes);
for(const binding of Object.values(silentPotionCiProof.files))assert.equal(hash(binding.beforeSource),binding.beforeSha256);
// Exact current reader repair -> original measured helper bytes. No receipts or costs are rewritten.
const repairArchive=readFileSync(new URL('./silent-potion-reader-repair-source.json.gz',import.meta.url));
assert.equal(hash(repairArchive),'237b51d06c1c9d6eb726343b69b66b812dee5f89f090b6c08c1756e41a9ddf71');
const repairBytes=gunzipSync(repairArchive);assert.equal(hash(repairBytes),'5e8f09d06da0a9a1e88de3b713c814717a89dae5f10aba1bb38f589f27288673');
export const silentPotionReaderRepairProof=JSON.parse(repairBytes);
for(const binding of Object.values(silentPotionReaderRepairProof.files)){
 assert.equal(hash(binding.beforeSource),binding.beforeSha256);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.beforeSource)}\0`).update(binding.beforeSource).digest('hex'),binding.beforeGitBlob);
}
export function preSilentPotionReaderRepairSource(path,source){
 const binding=Object.hasOwn(silentPotionReaderRepairProof.files,path)?silentPotionReaderRepairProof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
export function preSilentPotionCiSource(path,source){
 source=preSilentPotionReaderRepairSource(path,source);
 const binding=Object.hasOwn(silentPotionCiProof.files,path)?silentPotionCiProof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}

export const silentPotionPlanningFloors=Object.freeze({"tests/silent-potion-owner.test.mjs":{"durationMs":28376,"environment":"cloud Linux local","tests":7,"coverage":"7/7 complete file passed; 0 failed, cancelled or skipped.","kind":"Local complete-run planning floor only; not a hosted measurement, execution permission or timeout change.","nodeReportedDurationMs":28375.196147,"sourceLog":"docs/evidence/m7-silent-potion-owner-20261109/behavior.log.gz","sourceLogSha256":"aa6131b1edec171c815fd8cdfde8d17109d879558a0ecb32fe578d85a5058cf6","sourceLogUncompressedSha256":"eabe48af140350e274b133a5fe99291bab2e52269251bb3ad3818756ef43229d","testSha256":"52df400eda378f96da65851c242d89a973d6897f2db615ddf6d6a95a3b383660","sourceReceipt":"docs/evidence/m7-silent-potion-owner-20261109/behavior-receipt.json","sourceReceiptSha256":"b6227a61d616a9d96bd55d76e198e3565e91bf7b19353662f6a11a7ff3164605"},"tests/silent-potion-source-epoch.test.mjs":{"durationMs":25228,"environment":"cloud Linux local","tests":13,"coverage":"13/13 complete file passed; 0 failed, cancelled or skipped.","kind":"Local complete-run planning floor only; not a hosted measurement, execution permission or timeout change.","nodeReportedDurationMs":25227.153439,"sourceLog":"docs/evidence/m7-silent-potion-owner-20261109/source.log.gz","sourceLogSha256":"b7d095d3825e80d067f970239789bd93b51be6a49bce4772e452d787768077ac","sourceLogUncompressedSha256":"ce63a7045e41d04e92798702ef9461cf76aca0f2a73321f15dd9f33cc4a8f7a2","testSha256":"7e9c474f08fa64109ba2f9c8966ce1bc36e234a98caf6d01e322921421bfc378","sourceReceipt":"docs/evidence/m7-silent-potion-owner-20261109/source-receipt.json","sourceReceiptSha256":"1a20fb90289d2c1736af82d602bb6f0b7189143f5d5f36f9850d4645436e7878"}});
