// Pure CI receipt compatibility: complete current strings may enter the exact
// pre-component source epoch. This does not authorize live owner projections or
// claim that historical timings measured the current UI implementation.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const compressed=readFileSync(new URL('./component-ui-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(compressed),'e3732b458e60f7fc5a35edad727c45c6802aa7386903f5fb9740cd377b62bd18','component UI CI compressed identity');
const bytes=gunzipSync(compressed);
assert.equal(hash(bytes),'80583bb94b4aa3507a4c0cccf2eed4fef3129d45bbb11b182fccfc62dd42d43f','component UI CI complete identity');
const proof=JSON.parse(bytes);
assert.equal(proof.schemaVersion,1);
assert.equal(proof.normalization,'LF');
for(const binding of Object.values(proof.files)){
 for(const side of ['before','after']){
  const source=binding[side+'Source'];
  assert.equal(source.replaceAll('\r\n','\n'),source,'component UI CI LF source');
  assert.equal(hash(source),binding[side+'Sha256'],'component UI CI whole source identity');
  assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex'),binding[side+'GitBlob'],'component UI CI source Git identity');
 }
 Object.freeze(binding);
}
Object.freeze(proof.files);
export const componentUiCiSourceProof=Object.freeze(proof);
export function preComponentUiCiSource(path,source){
 const binding=Object.hasOwn(proof.files,path)?proof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
