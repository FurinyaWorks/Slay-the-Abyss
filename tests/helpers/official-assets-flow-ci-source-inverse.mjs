// Exact official-assets planning epoch; arbitrary and partial source passes through unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./official-assets-flow-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'2efc7dc0e787d86f49c27863cd936be82fbd90f1902331345528936335b516c8');
const bytes=gunzipSync(archive);assert.equal(hash(bytes),'bb3729afe49ff140f9824549ab031bc936f96267f57d752f3d9cc6eff3653fbc');
const proof=JSON.parse(bytes);
for(const binding of Object.values(proof.files)){assert.equal(hash(binding.beforeSource),binding.beforeSha256);Object.freeze(binding);}
Object.freeze(proof.files);
export const officialAssetsFlowCiSourceProof=Object.freeze(proof);
export const officialAssetsFlowPlanningFloors=Object.freeze(proof.planningFloors);
export function preOfficialAssetsFlowCiSource(path,source){
 const binding=Object.hasOwn(proof.files,path)?proof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
