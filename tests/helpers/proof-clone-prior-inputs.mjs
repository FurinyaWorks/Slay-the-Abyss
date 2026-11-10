// Exact historical measurement inputs only; fresh source authorization is unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const packed=readFileSync(new URL('./proof-clone-prior-inputs.json.gz',import.meta.url));
assert.equal(hash(packed),'972bd7bbaeeac7e13dd1a2807b07bcce2239ece7e0af9171e5651ca0ffe9d352');
export const proofClonePriorInputs=JSON.parse(gunzipSync(packed));
assert.equal(proofClonePriorInputs.beforeCommit,'a46634168bced808b40a084403f916fa50ebb0f6');
for(const binding of Object.values(proofClonePriorInputs.files)){
 assert.equal(hash(binding.beforeSource),binding.beforeSha256);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.beforeSource)}\0`).update(binding.beforeSource).digest('hex'),binding.beforeGitBlob);
 Object.freeze(binding);
}
Object.freeze(proofClonePriorInputs.files);Object.freeze(proofClonePriorInputs);
export function preProofCloneInput(path,source){
 const binding=Object.hasOwn(proofClonePriorInputs.files,path)?proofClonePriorInputs.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
