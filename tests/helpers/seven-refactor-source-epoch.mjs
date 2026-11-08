// A new exact outer epoch. Historical archives and their source identities stay frozen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./seven-refactor-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'98ce5a13a217c5b20bbbddf93811d5fc2dda4117bb465c33c5ad4c979608c4bd','seven-refactor compressed identity');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'1bd9b7439d30185da918d078c1204e06398083d32b2e220d6fd2f9d7c0a7c872','seven-refactor complete identity');
export const sevenRefactorEpoch=createSourceEpochProjector(JSON.parse(bytes));
export function extendSevenRefactorEpoch(original){
 const outer=sevenRefactorEpoch.proof,prior=original.proof;
 for(const [path,binding]of Object.entries(outer.targets.prior.files))
  for(const key of ['source','sha256','gitBlob'])assert.equal(binding?.[key],prior.current[path]?.[key],'seven-refactor authenticated predecessor: '+path+': '+key);
 const proof={...prior,currentCommitRole:outer.currentCommitRole,currentTreeCommitted:false,sourceSliceCommit:outer.sourceSliceCommit,collectedBaseCommit:outer.collectedBaseCommit,currentCommit:outer.currentCommit,current:{...prior.current,...outer.current},
  owners:[...new Set([...prior.owners,...outer.owners])],
  targets:{...prior.targets,sevenPrior:{commit:outer.targets.prior.commit,files:prior.current}}};
 const current=createSourceEpochProjector(proof,{allowConfigLayout:true}),live=p=>readFileSync(p,'utf8'),readers=new WeakMap();
 function preCombinedSource(path,source,{target,readSource=live}={}){
  readSource=readers.get(readSource)?.raw??readSource;
  const projected=current.preCombinedSource(path,source,{target,readSource});
  if(projected!==source||target==='sevenPrior'||prior.current[path]?.sha256===current.proof.current[path]?.sha256)return projected;
  return original.preCombinedSource(path,source,{target,readSource:typeof readSource==='function'?current.combinedReader(readSource,'sevenPrior'):readSource});
 }
 function combinedReader(readSource=live,target){
  assert.equal(typeof readSource,'function','linked reader must be a function');
  const priorReader=readers.get(readSource);if(priorReader?.target===target)return readSource;
  const raw=priorReader?.raw??readSource,reader=path=>preCombinedSource(path,raw(path),{target,readSource:raw});
  readers.set(reader,{raw,target});return reader;
 }
 return Object.freeze({proof:current.proof,preCombinedSource,combinedReader,readerTarget:r=>readers.get(r)?.target});
}
