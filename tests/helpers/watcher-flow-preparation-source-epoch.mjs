// A new exact outer epoch. Historical archives and their source identities stay frozen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./watcher-flow-preparation-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'96d600e6ea9d584cd238f57a80d804d0a866cb613e963c5950d00b68cfd1aac8','watcher-flow-preparation compressed identity');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'12cfdee653f5f9e8086d18067f3dfeaddcdc0d1129eabaca879dd43d1319a502','watcher-flow-preparation complete identity');
export const watcherFlowPreparationEpoch=createSourceEpochProjector(JSON.parse(bytes));
export function extendWatcherFlowPreparationEpoch(original){
 const outer=watcherFlowPreparationEpoch.proof,prior=original.proof;
 for(const [path,binding]of Object.entries(outer.targets.prior.files))
  assert.deepEqual(binding,prior.current[path],'watcher-flow-preparation authenticated predecessor: '+path);
 const proof={...prior,currentTreeCommitted:false,watcherFlowPreparationCurrentCommitRole:outer.currentCommitRole,watcherFlowPreparationCollectedBaseCommit:outer.targets.prior.commit,current:{...prior.current,...outer.current},
  owners:[...new Set([...prior.owners,...outer.owners])],
  targets:{...prior.targets,watcherFlowPreparationPrior:{commit:outer.targets.prior.commit,files:prior.current}}};
 // Prior proofs are already deeply frozen and authenticated. Do not clone the
 // entire accumulated target graph again for a one-file outer epoch. Keep only
 // one validated target projector alive; authorization itself is never cached.
 Object.freeze(proof.current);Object.freeze(proof.owners);
 Object.freeze(proof.targets.watcherFlowPreparationPrior);
 Object.freeze(proof.targets);Object.freeze(proof);
 let activeTarget,activeProjector;
 const current={proof,preCombinedSource(path,source,options){
  assert(Object.hasOwn(proof.targets,options.target),'unknown source target');
  if(activeTarget!==options.target){
   activeProjector=createSourceEpochProjector({...proof,targets:{[options.target]:proof.targets[options.target]}},{allowConfigLayout:true});
   activeTarget=options.target;
  }
  return activeProjector.preCombinedSource(path,source,options);
 },combinedReader(readSource,target){
  assert(Object.hasOwn(proof.targets,target),'unknown source target');
  assert.equal(typeof readSource,'function','linked reader must be a function');
  return path=>current.preCombinedSource(path,readSource(path),{target,readSource});
 }};
 const live=p=>readFileSync(p,'utf8'),readers=new WeakMap();
 function preCombinedSource(path,source,{target,readSource=live}={}){
  readSource=readers.get(readSource)?.raw??readSource;
  const projected=current.preCombinedSource(path,source,{target,readSource});
  if(projected!==source||target==='watcherFlowPreparationPrior'||prior.current[path]?.sha256===current.proof.current[path]?.sha256)return projected;
  return original.preCombinedSource(path,source,{target,readSource:typeof readSource==='function'?current.combinedReader(readSource,'watcherFlowPreparationPrior'):readSource});
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
