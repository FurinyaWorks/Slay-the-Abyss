// Exact test-only boundary: preserve all original owner proofs and prior costs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./flow-live-reader-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'87c2e6d2190a3dd99a8cfb975d44858ae120a33fba0e3562f4b2f6f3d4f4f8d2');
export const flowLiveReaderProof=JSON.parse(gunzipSync(archive));
for(const binding of Object.values(flowLiveReaderProof.files))assert.equal(hash(binding.beforeSource),binding.beforeSha256);
export function preFlowLiveReaderSource(path,source){
 const binding=Object.hasOwn(flowLiveReaderProof.files,path)?flowLiveReaderProof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
