// A new exact outer epoch. Historical archives and their source identities stay frozen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./watcher-flow-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'9e81602d086a81680830cf179a5d9f9f041bd56e0938b2d82eb196e50f73c015','watcher-flow compressed identity');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'2e4fbec14a84c83f0f4c22130baa52762a90e5cb12d60c0f000be08c86323b4f','watcher-flow complete identity');
export const watcherFlowEpoch=createSourceEpochProjector(JSON.parse(bytes));
export function extendWatcherFlowEpoch(original){
 const outer=watcherFlowEpoch.proof,prior=original.proof;
 for(const [path,binding]of Object.entries(outer.targets.prior.files))
  for(const key of ['source','sha256','gitBlob'])assert.equal(binding?.[key],prior.current[path]?.[key],'watcher-flow authenticated predecessor: '+path+': '+key);
 const proof={...prior,currentTreeCommitted:false,watcherFlowSourceSliceCommit:outer.currentCommit,watcherFlowCollectedBaseCommit:outer.targets.prior.commit,current:{...prior.current,...outer.current},
  owners:[...new Set([...prior.owners,...outer.owners])],
  targets:{...prior.targets,watcherFlowPrior:{commit:outer.targets.prior.commit,files:prior.current}}};
 const current=createSourceEpochProjector(proof,{allowConfigLayout:true}),live=p=>readFileSync(p,'utf8'),readers=new WeakMap();
 function preCombinedSource(path,source,{target,readSource=live}={}){
  readSource=readers.get(readSource)?.raw??readSource;
  const projected=current.preCombinedSource(path,source,{target,readSource});
  if(projected!==source||target==='watcherFlowPrior'||prior.current[path]?.sha256===current.proof.current[path]?.sha256)return projected;
  return original.preCombinedSource(path,source,{target,readSource:typeof readSource==='function'?current.combinedReader(readSource,'watcherFlowPrior'):readSource});
 }
 function combinedReader(readSource=live,target){
  assert(Object.hasOwn(current.proof.targets,target),'unknown source target');
  assert.equal(typeof readSource,'function','linked reader must be a function');
  const priorReader=readers.get(readSource);if(priorReader?.target===target)return readSource;
  const raw=priorReader?.raw??readSource,reader=path=>preCombinedSource(path,raw(path),{target,readSource:raw});
  readers.set(reader,{raw,target});return reader;
 }
 return Object.freeze({proof:current.proof,preCombinedSource,combinedReader,readerTarget:r=>readers.get(r)?.target});
}
