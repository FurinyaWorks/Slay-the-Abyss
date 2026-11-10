// Exact official-assets planning epoch; arbitrary and partial source passes through unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./official-assets-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'bc5079ac224d1090c0f7761ca5808003160a5b2d1a0eb79e32c52bcd6f92da1b');
const bytes=gunzipSync(archive);assert.equal(hash(bytes),'520746e53dcac8193b3e7efdb44c2872d9ee4010512d0d39e4adbf4ee854ad58');
const proof=JSON.parse(bytes);
for(const binding of Object.values(proof.files)){assert.equal(hash(binding.beforeSource),binding.beforeSha256);Object.freeze(binding);}
Object.freeze(proof.files);
export const officialAssetsCiSourceProof=Object.freeze(proof);
export const officialAssetsPlanningFloors=Object.freeze(proof.planningFloors);
export function preOfficialAssetsCiSource(path,source){
 const binding=Object.hasOwn(proof.files,path)?proof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
