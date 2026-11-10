// Exact Colorless outer epoch; all predecessor identities and targets remain frozen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceEpoch as publicEpoch} from './combined-epoch/pre-colorless-description-source-epoch.mjs';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const archive=readFileSync(new URL('./colorless-description-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'154cffc4161cb0fe16db7cdee59562d1a7e18bcf710b834e61a482a291dcd53f','Colorless compressed proof identity');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'0fa3e9b8ce3d14d7c71fc693083adf9a50afabab7bb8e608afc47b0a8e7ab28a','Colorless complete proof identity');
const outer=createSourceEpochProjector(JSON.parse(bytes)).proof;

export function extendColorlessDescriptionEpoch(original){
 // Authenticate once, then consume only that same plain-data snapshot. Never
 // reread caller getters or fields hidden by toJSON after checking their output.
 const serialized=JSON.stringify(original.proof);
 assert.equal(hash(serialized),outer.predecessorProofSha256,'Colorless authenticated predecessor');
 const prior=JSON.parse(serialized);
 const proof={...prior,
  colorlessDescription:{candidateCommit:outer.currentCommit,collectedBaseCommit:outer.targets.prior.commit,currentCommitRole:outer.currentCommitRole,
   currentTreeCommitted:outer.currentTreeCommitted,sourceOnlyTree:outer.sourceOnlyTree,predecessorProofSha256:outer.predecessorProofSha256},
  current:{...prior.current,...outer.current},owners:[...new Set([...prior.owners,...outer.owners])],
  targets:{...prior.targets,colorlessDescriptionPrior:{commit:outer.targets.prior.commit,files:prior.current}}};
 const current=createSourceEpochProjector(proof,{allowConfigLayout:true});
 const live=path=>readFileSync(path,'utf8'),readers=new WeakMap();
 function preCombinedSource(path,source,{target,readSource=live}={}){
  readSource=readers.get(readSource)?.raw??readSource;
  const projected=current.preCombinedSource(path,source,{target,readSource});
  if(projected!==source||target==='colorlessDescriptionPrior'||prior.current[path]?.sha256===current.proof.current[path]?.sha256)return projected;
  return original.preCombinedSource(path,source,{target,
   readSource:typeof readSource==='function'?current.combinedReader(readSource,'colorlessDescriptionPrior'):readSource});
 }
 function combinedReader(readSource=live,target){
  assert(Object.hasOwn(current.proof.targets,target),'unknown source target');
  assert.equal(typeof readSource,'function','linked reader must be a function');
  const previous=readers.get(readSource);if(previous?.target===target)return readSource;
  const raw=previous?.raw??readSource;
  const reader=path=>preCombinedSource(path,raw(path),{target,readSource:raw});
  readers.set(reader,{raw,target});return reader;
 }
 return Object.freeze({proof:current.proof,preCombinedSource,combinedReader,readerTarget:reader=>readers.get(reader)?.target});
}
export const colorlessDescriptionEpoch=extendColorlessDescriptionEpoch(publicEpoch);
