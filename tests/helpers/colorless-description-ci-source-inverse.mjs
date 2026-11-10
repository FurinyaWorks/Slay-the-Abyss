// Complete-byte local cost epoch. All predecessor data and assertions remain unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./colorless-description-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'3a0b4213170740b0f20b0a959eabbb004b453e0e2c0cb3431d7387321cf38865');
const bytes=gunzipSync(archive);assert.equal(hash(bytes),'f6b9f0c5fae3ee71ee56d54e57eba214b16c8a735b8ed831d0864028f6aa0ad9');
export const colorlessDescriptionCiProof=JSON.parse(bytes);
for(const binding of Object.values(colorlessDescriptionCiProof.files)){
 assert.equal(hash(binding.beforeSource),binding.beforeSha256);assert.equal(hash(binding.afterSource),binding.afterSha256);
}
export function preColorlessDescriptionCiSource(path,source){
 const binding=Object.hasOwn(colorlessDescriptionCiProof.files,path)?colorlessDescriptionCiProof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
