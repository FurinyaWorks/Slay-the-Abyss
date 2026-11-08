// A new exact outer epoch. Historical archives and their source identities stay frozen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./silent-tactics-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'046c798aed3ded45bf29ad696c777551102f74066a262174af3d9990bdabb1c7','silent-tactics compressed identity');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'7d10399e576fb8b300346acde8d97ddc99dfa5b0920215e3a55e909a5f30e06d','silent-tactics complete identity');
export const silentTacticsEpoch=createSourceEpochProjector(JSON.parse(bytes));
export function extendSilentTacticsEpoch(original){
 const outer=silentTacticsEpoch.proof,prior=original.proof;
 for(const [path,binding]of Object.entries(outer.targets.prior.files))
  for(const key of ['source','sha256','gitBlob'])assert.equal(binding?.[key],prior.current[path]?.[key],'silent-tactics authenticated predecessor: '+path+': '+key);
 const proof={...prior,currentCommitRole:"saved Silent tactics production slice",currentTreeCommitted:false,sourceSliceCommit:outer.currentCommit,collectedBaseCommit:outer.targets.prior.commit,currentCommit:outer.currentCommit,current:{...prior.current,...outer.current},
  owners:[...new Set([...prior.owners,...outer.owners])],
  targets:{...prior.targets,silentTacticsPrior:{commit:outer.targets.prior.commit,files:prior.current}}};
 const current=createSourceEpochProjector(proof),live=p=>readFileSync(p,'utf8'),readers=new WeakMap();
 function preCombinedSource(path,source,{target,readSource=live}={}){
  readSource=readers.get(readSource)?.raw??readSource;
  const projected=current.preCombinedSource(path,source,{target,readSource});
  if(projected!==source||target==='silentTacticsPrior'||prior.current[path]?.sha256===current.proof.current[path]?.sha256)return projected;
  return original.preCombinedSource(path,source,{target,readSource:current.combinedReader(readSource,'silentTacticsPrior')});
 }
 function combinedReader(readSource=live,target){
  assert.equal(typeof readSource,'function','linked reader must be a function');
  const priorReader=readers.get(readSource);if(priorReader?.target===target)return readSource;
  const raw=priorReader?.raw??readSource,reader=path=>preCombinedSource(path,raw(path),{target,readSource:raw});
  readers.set(reader,{raw,target});return reader;
 }
 return Object.freeze({proof:current.proof,preCombinedSource,combinedReader,readerTarget:r=>readers.get(r)?.target});
}
