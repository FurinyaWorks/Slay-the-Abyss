// A new exact outer epoch. Historical archives and their source identities stay frozen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./run-healing-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'4d2eb01f67d8fc66add025681806653d0947e1d9a3117a7d359cfadf0bada05c','run-healing compressed identity');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'39a3a08d9f351482cf3f83b947b467d89a301517cb20771326128e97e8ff1b21','run-healing complete identity');
export const runHealingEpoch=createSourceEpochProjector(JSON.parse(bytes));
export function extendRunHealingEpoch(original){
 const outer=runHealingEpoch.proof,prior=original.proof;
 for(const [path,binding]of Object.entries(outer.targets.prior.files))
  assert.deepEqual(binding,prior.current[path]??null,'run-healing authenticated predecessor: '+path);
 const added=Object.fromEntries(outer.owners.filter(path=>!Object.hasOwn(prior.current,path)).map(path=>[path,null]));
 const complete=files=>({...files,...added});
 const proof={...prior,currentTreeCommitted:false,runHealingCurrentCommitRole:outer.currentCommitRole,runHealingCollectedBaseCommit:outer.targets.prior.commit,current:{...prior.current,...outer.current},
  owners:[...new Set([...prior.owners,...outer.owners])],
  targets:{...Object.fromEntries(Object.entries(prior.targets).map(([name,target])=>[name,{...target,files:complete(target.files)}])),runHealingPrior:{commit:outer.targets.prior.commit,files:complete(prior.current)}}};
 const current=createSourceEpochProjector(proof,{allowConfigLayout:true}),live=p=>readFileSync(p,'utf8'),readers=new WeakMap();
 function preCombinedSource(path,source,{target,readSource=live}={}){
  readSource=readers.get(readSource)?.raw??readSource;
  const projected=current.preCombinedSource(path,source,{target,readSource});
  if(projected!==source||target==='runHealingPrior'||prior.current[path]?.sha256===current.proof.current[path]?.sha256)return projected;
  return original.preCombinedSource(path,source,{target,readSource:typeof readSource==='function'?current.combinedReader(readSource,'runHealingPrior'):readSource});
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
