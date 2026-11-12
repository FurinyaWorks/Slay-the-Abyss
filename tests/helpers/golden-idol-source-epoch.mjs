// A new exact outer epoch. Historical archives and their source identities stay frozen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./golden-idol-current-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'b46c8ed0a17d8dcfa442861b4452cae2250b9ce2da31ef0bb1619be7e416fc46','golden-idol compressed identity');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'bc78e199016d404718a5414f44915943e31c6947df6d185de3ea1c52d672694c','golden-idol complete identity');
export const goldenIdolEpoch=createSourceEpochProjector(JSON.parse(bytes));
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
export function extendGoldenIdolEpoch(original){
 const outer=goldenIdolEpoch.proof,prior=original.proof;
 for(const [path,binding]of Object.entries(outer.targets.prior.files))
  assert.deepEqual(binding,prior.current[path],'golden-idol authenticated predecessor: '+path);
 const proof={...prior,currentTreeCommitted:false,goldenIdolCurrentCommitRole:outer.currentCommitRole,goldenIdolCollectedBaseCommit:outer.targets.prior.commit,current:{...prior.current,...outer.current},
  owners:[...new Set([...prior.owners,...outer.owners])],
  targets:{...prior.targets,goldenIdolPrior:{commit:outer.targets.prior.commit,files:prior.current}}};
 const current=createSourceEpochProjector(freeze(proof),{allowConfigLayout:true,reuseFrozenInput:true}),live=p=>readFileSync(p,'utf8'),readers=new WeakMap();
 function preCombinedSource(path,source,{target,readSource=live}={}){
  readSource=readers.get(readSource)?.raw??readSource;
  const projected=current.preCombinedSource(path,source,{target,readSource});
  if(projected!==source||target==='goldenIdolPrior'||prior.current[path]?.sha256===current.proof.current[path]?.sha256)return projected;
  return original.preCombinedSource(path,source,{target,readSource:typeof readSource==='function'?current.combinedReader(readSource,'goldenIdolPrior'):readSource});
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
