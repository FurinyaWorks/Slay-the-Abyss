// Exact predecessor view for the component-output safety repair. Old timing
// receipts keep their original inputs; current input-protection tests run raw code.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const hash=source=>createHash('sha256').update(source).digest('hex');
const blob=source=>createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex');
export function createComponentAliasCiProjector(input){
 const proof=JSON.parse(JSON.stringify(input));
 assert.equal(proof.schemaVersion,1);assert.equal(proof.normalization,'LF');
 assert.equal(proof.beforeCommit,'06bc84ee4b2b3c7b51486df678ac4551ced1b084');
 assert.deepEqual(Object.keys(proof.files).sort(),['scripts/build-ui.mjs','tests/ci-complete-calibration.test.mjs','tests/helpers/component-ui-ci-source-inverse.mjs']);
 for(const binding of Object.values(proof.files)){
  for(const side of ['before','after']){
   const source=binding[side+'Source'];assert.equal(typeof source,'string');
   assert.equal(source.replaceAll('\r\n','\n'),source,'component alias LF source');
   assert.equal(hash(source),binding[side+'Sha256'],'component alias complete source SHA');
   assert.equal(blob(source),binding[side+'GitBlob'],'component alias complete Git identity');
  }
  assert.notEqual(binding.beforeSha256,binding.afterSha256,'component alias actual source change');Object.freeze(binding);
 }
 Object.freeze(proof.files);Object.freeze(proof);
 return Object.freeze({proof,project(path,source){
  const binding=Object.hasOwn(proof.files,path)?proof.files[path]:null;
  if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
  return binding.beforeSource;
 }});
}
const compressed=readFileSync(new URL('./component-alias-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(compressed),'3d11025b87ec35e234f99eb3df53dd862a69b75778c88a714db9b694a9c2f93d','component alias compressed CI identity');
const bytes=gunzipSync(compressed);
assert.equal(hash(bytes),'7103419ce84a667e78db75629b143dcc40146530f00b74f30aba0de06019a402','component alias complete CI identity');
const epoch=createComponentAliasCiProjector(JSON.parse(bytes));
export const componentAliasCiSourceProof=epoch.proof;
export const preComponentAliasCiSource=epoch.project;
