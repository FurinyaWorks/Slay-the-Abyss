// Exact post281 CI/test fixes. This pure source view never authorizes or
// normalizes production Lua; the a0 raw production epoch remains unchanged.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const hash=source=>createHash('sha256').update(source).digest('hex');
const blob=source=>createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex');
export function createFoundationFixCiProjector(input){
 const proof=JSON.parse(JSON.stringify(input));
 assert.equal(proof.schemaVersion,1);assert.equal(proof.normalization,'LF');
 assert.equal(proof.beforeCommit,'2814719e884fa2a201e05a22b35d9bbc8519ca62');
 assert.equal(proof.afterProductionCommit,'a0c2dc558b2a37f26678dc104bb98df194b0f2d8');
 for(const [path,binding]of Object.entries(proof.files)){
  assert(/^(?:scripts|tests)\//.test(path)&&/\.(?:mjs|lua|json|yml)$/.test(path)
   &&!path.includes('\\')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'),'exact post281 CI/test source');
  for(const side of ['before','after']){
   const source=binding[side+'Source'];assert.equal(typeof source,'string');
   assert.equal(source.replaceAll('\r\n','\n'),source,'post281 CI LF source');
   assert.equal(hash(source),binding[side+'Sha256'],'post281 complete source SHA');
   assert.equal(blob(source),binding[side+'GitBlob'],'post281 complete source Git identity');
  }
  assert.notEqual(binding.beforeSha256,binding.afterSha256,'post281 actual source change');Object.freeze(binding);
 }
 Object.freeze(proof.files);Object.freeze(proof);
 return Object.freeze({proof,project(path,source){
  const binding=Object.hasOwn(proof.files,path)?proof.files[path]:null;
  if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
  return binding.beforeSource;
 }});
}

const compressed=readFileSync(new URL('./foundation-fix-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(compressed),'bb40135a5ef6a5286f75cdf3035a451702f79cdcc36dca90d071d85f09ce30a3','post281 compressed CI identity');
const bytes=gunzipSync(compressed);
assert.equal(hash(bytes),'c513a27bb5caebf613e907456eb4573bfda830673efc91996089c4ea8e2e5371','post281 complete CI identity');
const epoch=createFoundationFixCiProjector(JSON.parse(bytes));
export const foundationFixCiSourceProof=epoch.proof;
export const preFoundationFixCiSource=epoch.project;
