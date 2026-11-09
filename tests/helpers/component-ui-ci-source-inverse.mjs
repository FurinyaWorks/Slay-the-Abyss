// Pure CI receipt compatibility: complete current strings may enter the exact
// pre-component source epoch. This does not authorize live owner projections or
// claim that historical timings measured the current UI implementation.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const compressed=readFileSync(new URL('./component-ui-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(compressed),'6734f02d1db6089a4500de58b757a611e180a1b6a091d094f08fc482d68513a0','component UI CI compressed identity');
const bytes=gunzipSync(compressed);
assert.equal(hash(bytes),'78120f2f8d164d454470cd659b2e2445c707427ff49f6fe573862682e6476280','component UI CI complete identity');
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
