// Exact Actor-capability slice; previous source archives and their assertions stay frozen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./defect-actor-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'c41e28bf8a5d51f0e29f80b48f31cc5d416741ec8d54f4f6c03ce924d1027e17','Defect Actor compressed identity');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'13b45621428f8e8da6eac9ad10bbdab77077efcefe91eefe60b92e54963700f6','Defect Actor complete identity');
export const defectActorEpoch=createSourceEpochProjector(JSON.parse(bytes),{allowConfigLayout:true});
export function preDefectActorSource(path,source,options={}){
 return defectActorEpoch.preCombinedSource(path,source,{...options,target:'prior'});
}
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
export function extendDefectActorEpoch(original){
 const outer=defectActorEpoch.proof,prior=original.proof;
 for(const [path,binding]of Object.entries(outer.targets.prior.files))
  assert.deepEqual(binding,prior.current[path],'Defect Actor authenticated predecessor: '+path);
 const proof=freeze({...prior,currentTreeCommitted:false,defectActorCurrentCommitRole:outer.currentCommitRole,
  defectActorCollectedBaseCommit:outer.targets.prior.commit,current:{...prior.current,...outer.current},
  owners:[...new Set([...prior.owners,...outer.owners])],
  targets:{...prior.targets,defectActorPrior:{commit:outer.targets.prior.commit,files:prior.current}}});
 const current=createSourceEpochProjector(proof,{allowConfigLayout:true,reuseFrozenInput:true});
 const live=p=>readFileSync(p,'utf8'),readers=new WeakMap();
 function preCombinedSource(path,source,{target,readSource=live}={}){
  readSource=readers.get(readSource)?.raw??readSource;
  const projected=current.preCombinedSource(path,source,{target,readSource});
  if(projected!==source||target==='defectActorPrior'||prior.current[path]?.sha256===current.proof.current[path]?.sha256)return projected;
  return original.preCombinedSource(path,source,{target,
   readSource:typeof readSource==='function'?current.combinedReader(readSource,'defectActorPrior'):readSource});
 }
 function combinedReader(readSource=live,target){
  assert(Object.hasOwn(current.proof.targets,target),'unknown source target');
  assert.equal(typeof readSource,'function','linked owner reader');
  const existing=readers.get(readSource);if(existing?.target===target)return readSource;
  const raw=existing?.raw??readSource,reader=path=>preCombinedSource(path,raw(path),{target,readSource:raw});
  readers.set(reader,{raw,target});return reader;
 }
 return Object.freeze({proof:current.proof,preCombinedSource,combinedReader,readerTarget:r=>readers.get(r)?.target});
}
