// Exact additive Stasis CI epoch; no live read fallback or policy changes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {deepFreezeSourceProof} from './pure-source-projection-cache.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./stasis-ci-source-inverse.json.gz',import.meta.url));
assert.equal(hash(archive),'84e8884c62b1d324135f9875911e5880faca89fd0ac2469b9474c5939ec7df73');
const bytes=gunzipSync(archive);assert.equal(hash(bytes),'8da8f225b4d8835627b01d046f19b095d6ce3c63e44a866f7f4b2b7ab6a0b865');
export const stasisCiProof=deepFreezeSourceProof(JSON.parse(bytes));
for(const binding of Object.values(stasisCiProof.files)){
 assert.equal(hash(binding.beforeSource),binding.beforeSha256);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.beforeSource)}\0`).update(binding.beforeSource).digest('hex'),binding.beforeGitBlob);
}
export const stasisPlanningFloors=stasisCiProof.planningFloors;
export const stasisJs=Object.freeze(['tests/stasis-owner-behavior.test.mjs','tests/stasis-owner-boundary.test.mjs','tests/stasis-owner-source-epoch.test.mjs']);
export function preStasisCiSource(path,source){
 const binding=Object.hasOwn(stasisCiProof.files,path)?stasisCiProof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
