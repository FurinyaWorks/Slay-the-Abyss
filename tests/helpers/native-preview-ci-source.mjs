// Exact outer continuation for PR648; immutable predecessor records stay unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
const bytes=readFileSync(new URL('./native-preview-ci-source.json.gz',import.meta.url));
assert.equal(hash(bytes),'3929e00baeed8de4f56845930c224c67c27e0a5cc98d18ea5097bfd9f8e4b39b','complete native preview continuation');
export const nativePreviewCiProof=JSON.parse(gunzipSync(bytes));
assert.equal(nativePreviewCiProof.schemaVersion,1);
assert.equal(nativePreviewCiProof.normalization,'LF');
assert.equal(nativePreviewCiProof.base,'e805a87dc4df1a048ba5995931d98a4e4899b5e9');
for(const [path,row]of Object.entries(nativePreviewCiProof.files))for(const side of ['before','after']){
 const binding=row[side];
 assert.equal(hash(binding.source),binding.sha256,path+'/'+side);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob);
}
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
freeze(nativePreviewCiProof);
export function preNativePreviewCiSource(path,source){
 const row=Object.hasOwn(nativePreviewCiProof.files,path)?nativePreviewCiProof.files[path]:null;
 if(!row||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==row.after.sha256)return source;
 return row.before.source;
}
