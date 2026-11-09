// A new exact outer epoch. Historical archives and their source identities stay frozen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./silent-final-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'8d70652c025b8075e2a03936f12c2509dbca427abd555e472f197b1ac4850b49','silent-final compressed identity');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'8f4c50418532d787c0667c987f0cb4f3c56f282146af3656c6a792f24ec14ed1','silent-final complete identity');
export const silentFinalEpoch=createSourceEpochProjector(JSON.parse(bytes));
export function extendSilentFinalEpoch(original){
 const outer=silentFinalEpoch.proof,prior=original.proof;
 for(const [path,binding]of Object.entries(outer.targets.prior.files))
  for(const key of ['source','sha256','gitBlob'])assert.equal(binding?.[key],prior.current[path]?.[key],'silent-final authenticated predecessor: '+path+': '+key);
 const proof={...prior,currentTreeCommitted:false,silentFinalCurrentCommitRole:outer.currentCommitRole,silentFinalCollectedBaseCommit:outer.targets.prior.commit,current:{...prior.current,...outer.current},
  owners:[...new Set([...prior.owners,...outer.owners])],
  targets:{...prior.targets,silentFinalPrior:{commit:outer.targets.prior.commit,files:prior.current}}};
 const current=createSourceEpochProjector(proof,{allowConfigLayout:true}),live=p=>readFileSync(p,'utf8'),readers=new WeakMap();
 function preCombinedSource(path,source,{target,readSource=live}={}){
  readSource=readers.get(readSource)?.raw??readSource;
  const projected=current.preCombinedSource(path,source,{target,readSource});
  if(projected!==source||target==='silentFinalPrior'||prior.current[path]?.sha256===current.proof.current[path]?.sha256)return projected;
  return original.preCombinedSource(path,source,{target,readSource:typeof readSource==='function'?current.combinedReader(readSource,'silentFinalPrior'):readSource});
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
