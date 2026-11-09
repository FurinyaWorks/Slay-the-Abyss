// Exact additive Wheel CI epoch; no live read fallback or policy changes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {deepFreezeSourceProof} from './pure-source-projection-cache.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./wheel-ci-source-inverse.json.gz',import.meta.url));
assert.equal(hash(archive),'ae1a53e724d0aaddba2d1fda4661f39298cb30ec26c462a7ebba28516b3409c7');
const bytes=gunzipSync(archive);assert.equal(hash(bytes),'7614848eef305e0f92dcd9aa56e34c7b7c6f4a2255ee36998c4153e968aeef51');
export const wheelCiProof=deepFreezeSourceProof(JSON.parse(bytes));
for(const binding of Object.values(wheelCiProof.files)){
 assert.equal(hash(binding.beforeSource),binding.beforeSha256);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.beforeSource)}\0`).update(binding.beforeSource).digest('hex'),binding.beforeGitBlob);
}
export const wheelPlanningFloors=wheelCiProof.planningFloors;
export const wheelJs=Object.freeze(["tests/wheel-event-responsibilities.test.mjs", "tests/wheel-event-complexity.test.mjs", "tests/wheel-event-source-epoch.test.mjs"]);
export function preWheelCiSource(path,source){
 const binding=Object.hasOwn(wheelCiProof.files,path)?wheelCiProof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
