// Complete-byte local cost epoch. All predecessor data and assertions remain unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./colorless-description-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'8b70da0c540e693eb12f3c3c28dbc9f9e507cb305a339d3d8b9d77f1f611684b');
const bytes=gunzipSync(archive);assert.equal(hash(bytes),'9a786d92c872b6d94aaae0ba2776877d6e108da870e685b8a830998ce39e0324');
export const colorlessDescriptionCiProof=JSON.parse(bytes);
for(const binding of Object.values(colorlessDescriptionCiProof.files)){
 assert.equal(hash(binding.beforeSource),binding.beforeSha256);assert.equal(hash(binding.afterSource),binding.afterSha256);
}
export function preColorlessDescriptionCiSource(path,source){
 const binding=Object.hasOwn(colorlessDescriptionCiProof.files,path)?colorlessDescriptionCiProof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
