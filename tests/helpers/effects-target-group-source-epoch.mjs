// A new exact outer epoch. Historical archives and their source identities stay frozen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./effects-target-group-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'f22d0328aedd7b7e9c785482271483f9f083c5c6abd7cd55d19933b24a48c0c2','effects-target-group compressed identity');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'ba9e9658dcf769c514c5e8fdd507c57389f82d19944d46f4be956f9f80950702','effects-target-group complete identity');
export const effectsTargetGroupEpoch=createSourceEpochProjector(JSON.parse(bytes));
export function extendEffectsTargetGroupEpoch(original){
 const outer=effectsTargetGroupEpoch.proof,prior=original.proof;
 for(const [path,binding]of Object.entries(outer.targets.prior.files))
  for(const key of ['source','sha256','gitBlob'])assert.equal(binding?.[key],prior.current[path]?.[key],'effects-target-group authenticated predecessor: '+path+': '+key);
 const proof={...prior,currentTreeCommitted:false,effectsTargetGroupSourceSliceCommit:outer.currentCommit,effectsTargetGroupLocalSourceSliceCommit:outer.localSourceSliceCommit,effectsTargetGroupSourceTree:outer.sourceTree,effectsTargetGroupCollectedBaseCommit:outer.collectedBaseCommit,effectsTargetGroupCurrentCommitRole:outer.currentCommitRole,current:{...prior.current,...outer.current},
  owners:[...new Set([...prior.owners,...outer.owners])],
  targets:{...prior.targets,effectsTargetGroupPrior:{commit:outer.targets.prior.commit,files:prior.current}}};
 const current=createSourceEpochProjector(proof,{allowConfigLayout:true}),live=p=>readFileSync(p,'utf8'),readers=new WeakMap();
 function preCombinedSource(path,source,{target,readSource=live}={}){
  readSource=readers.get(readSource)?.raw??readSource;
  const projected=current.preCombinedSource(path,source,{target,readSource});
  if(projected!==source||target==='effectsTargetGroupPrior'||prior.current[path]?.sha256===current.proof.current[path]?.sha256)return projected;
  return original.preCombinedSource(path,source,{target,readSource:typeof readSource==='function'?current.combinedReader(readSource,'effectsTargetGroupPrior'):readSource});
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
