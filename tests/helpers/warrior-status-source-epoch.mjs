// A new exact outer epoch. Historical archives and their source identities stay frozen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./warrior-status-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'e632098a14246e0888f2fde9a86c30eaf99fdf3271962a11f59841c426fc3e56','warrior-status compressed identity');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'877a206a55a24e4bec083cbe7e9c2f4b9c3ec635cfb72e6944e6fed3876f08fa','warrior-status complete identity');
export const warriorStatusEpoch=createSourceEpochProjector(JSON.parse(bytes));
export function extendWarriorStatusEpoch(original){
 const outer=warriorStatusEpoch.proof,prior=original.proof;
 for(const [path,binding]of Object.entries(outer.targets.prior.files))
  assert.deepEqual(binding,prior.current[path],'warrior-status authenticated predecessor: '+path);
 const proof={...prior,currentTreeCommitted:false,warriorStatusCurrentCommitRole:outer.currentCommitRole,warriorStatusCollectedBaseCommit:outer.targets.prior.commit,warriorStatusSourceSliceCommit:outer.sourceSliceCommit,current:{...prior.current,...outer.current},
  owners:[...new Set([...prior.owners,...outer.owners])],
  targets:{...prior.targets,warriorStatusPrior:{commit:outer.targets.prior.commit,files:prior.current}}};
 const current=createSourceEpochProjector(proof,{allowConfigLayout:true}),live=p=>readFileSync(p,'utf8'),readers=new WeakMap();
 function preCombinedSource(path,source,{target,readSource=live}={}){
  readSource=readers.get(readSource)?.raw??readSource;
  const projected=current.preCombinedSource(path,source,{target,readSource});
  if(projected!==source||target==='warriorStatusPrior'||prior.current[path]?.sha256===current.proof.current[path]?.sha256)return projected;
  return original.preCombinedSource(path,source,{target,readSource:typeof readSource==='function'?current.combinedReader(readSource,'warriorStatusPrior'):readSource});
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
