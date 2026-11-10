// Complete-byte local cost epoch. All predecessor data and assertions remain unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./colorless-description-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'636e32ffde230b60e5fa5b51e06adb5738c1503fc36bccdb4cd09bdad9c90045');
const bytes=gunzipSync(archive);assert.equal(hash(bytes),'69e7505135ed5b41a8aaaac0e884b206d1b272821b3c83b73f2f30fa4d90b395');
export const colorlessDescriptionCiProof=JSON.parse(bytes);
for(const binding of Object.values(colorlessDescriptionCiProof.files)){
 assert.equal(hash(binding.beforeSource),binding.beforeSha256);assert.equal(hash(binding.afterSource),binding.afterSha256);
}
export function preColorlessDescriptionCiSource(path,source){
 const binding=Object.hasOwn(colorlessDescriptionCiProof.files,path)?colorlessDescriptionCiProof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
