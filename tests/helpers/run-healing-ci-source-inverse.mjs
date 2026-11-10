// Complete-byte local cost epoch. All predecessor data and assertions remain unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./run-healing-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'717081785456a704622724241f82afaf4b6f939c3189396433f079b5fb60408c');
const bytes=gunzipSync(archive);assert.equal(hash(bytes),'1937227c8864546d88cae551eb2e578717361ca20efe70c9a363431ab13e68cc');
export const runHealingCiProof=JSON.parse(bytes);
for(const binding of Object.values(runHealingCiProof.files)){
 assert.equal(hash(binding.beforeSource),binding.beforeSha256);assert.equal(hash(binding.afterSource),binding.afterSha256);
}
export function preRunHealingCiSource(path,source){
 const binding=Object.hasOwn(runHealingCiProof.files,path)?runHealingCiProof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
