import {preOfficialAssetsCiSource} from './official-assets-ci-source-inverse.mjs';
// Pure CI receipt compatibility: complete current strings may enter the exact
// pre-component source epoch. This does not authorize live owner projections or
// claim that historical timings measured the current UI implementation.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {preFoundationFixCiSource} from './foundation-fix-ci-source-inverse.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const compressed=readFileSync(new URL('./component-ui-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(compressed),'498384c890d22428b10a9c19f6720712d3e568cf871179e447c69fd8b92ea520','component UI CI compressed identity');
const bytes=gunzipSync(compressed);
assert.equal(hash(bytes),'156783e0618a14ebfb0f3de2ce5b9f41fec83a3a52964ded2d3fe284acf0960a','component UI CI complete identity');
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
export function preComponentUiCiFoundationSource(path,source){
 const binding=Object.hasOwn(proof.files,path)?proof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
// Pure named views keep each published receipt in its own source epoch. New
// outer receipts append here; frozen literal/foreign assertions keep their view.
const epochs=Object.freeze([
 Object.freeze({name:'component281',project:preComponentUiCiFoundationSource}),
 Object.freeze({name:'foundationFix',project:preFoundationFixCiSource}),
 Object.freeze({name:'officialAssets',project:preOfficialAssetsCiSource}),
]);
export function ciSourceAtEpoch(path,source,target){
 const index=epochs.findIndex(epoch=>epoch.name===target);assert(index>=0,'known CI source epoch');
 for(let i=epochs.length-1;i>index;i--)source=epochs[i].project(path,source);
 return source;
}
export function preComponentUiCiSource(path,source){
 for(let i=epochs.length-1;i>=0;i--)source=epochs[i].project(path,source);
 return source;
}
