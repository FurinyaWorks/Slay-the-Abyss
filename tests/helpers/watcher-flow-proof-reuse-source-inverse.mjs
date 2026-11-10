// Exact test-only historical inputs; current source authorization stays raw.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./watcher-flow-proof-reuse-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'1abf22d6c542099ccba3aae71096eda5a7c2271eba12f27331a8437ab019af54');
export const watcherFlowProofReuseProof=JSON.parse(gunzipSync(archive));
for(const binding of Object.values(watcherFlowProofReuseProof.files))assert.equal(hash(binding.beforeSource),binding.beforeSha256);
export function preWatcherFlowProofReuseSource(path,source){
 const binding=Object.hasOwn(watcherFlowProofReuseProof.files,path)?watcherFlowProofReuseProof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
