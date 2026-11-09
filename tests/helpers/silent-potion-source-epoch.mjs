// A new exact outer epoch. Historical archives and their source identities stay frozen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./silent-potion-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'60114ed947c22b989b28f06cbb202c091431c7b5e658da3760c10bef474f90b9','silent-potion compressed identity');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'d7c47fccf3404facf21c3e7f6d5254283c73a2e3c018922141c1a78fb06a5670','silent-potion complete identity');
export const silentPotionEpoch=createSourceEpochProjector(JSON.parse(bytes));
export function extendSilentPotionEpoch(original){
 const outer=silentPotionEpoch.proof,prior=original.proof;
 for(const [path,binding]of Object.entries(outer.targets.prior.files))
  assert.deepEqual(binding,prior.current[path],'silent-potion authenticated predecessor: '+path);
 const proof={...prior,currentTreeCommitted:false,silentPotionCurrentCommitRole:outer.currentCommitRole,silentPotionCollectedBaseCommit:outer.targets.prior.commit,current:{...prior.current,...outer.current},
  owners:[...new Set([...prior.owners,...outer.owners])],
  targets:{...prior.targets,silentPotionPrior:{commit:outer.targets.prior.commit,files:prior.current}}};
 const current=createSourceEpochProjector(proof,{allowConfigLayout:true}),live=p=>readFileSync(p,'utf8'),readers=new WeakMap();
 function preCombinedSource(path,source,{target,readSource=live}={}){
  readSource=readers.get(readSource)?.raw??readSource;
  const projected=current.preCombinedSource(path,source,{target,readSource});
  if(projected!==source||target==='silentPotionPrior'||prior.current[path]?.sha256===current.proof.current[path]?.sha256)return projected;
  return original.preCombinedSource(path,source,{target,readSource:typeof readSource==='function'?current.combinedReader(readSource,'silentPotionPrior'):readSource});
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
