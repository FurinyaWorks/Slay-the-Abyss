// Exact outer identity for the component UI continuation. Earlier archives and
// their complete source/hash oracles remain unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const archive=readFileSync(new URL('./component-ui-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'df2a27ff146ecbee4fb01054eb1071458ffe491ece1bb50fa6fb33d19df74d4a','component UI compressed identity');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'28409a616ba20ce449428d53b876cc002736acacef63a35a40f65b7707b4835a','component UI complete identity');
export const componentUiSourceEpoch=createSourceEpochProjector(JSON.parse(bytes),{allowConfigLayout:true});

export function extendComponentUiEpoch(original){
 const outer=componentUiSourceEpoch.proof,prior=original.proof;
 const paths=Object.keys(outer.current).sort();
 assert.deepEqual(paths,[...new Set([...Object.keys(prior.current),...paths])].sort(),'component UI complete predecessor paths');
 for(const path of paths)for(const key of ['source','sha256','gitBlob'])
  assert.equal(outer.targets.componentPrior.files[path]?.[key],prior.current[path]?.[key],
   'component UI authenticated predecessor: '+path+': '+key);
 const complete=files=>Object.fromEntries(paths.map(path=>[path,files[path]??null]));
 const targets=Object.fromEntries(Object.entries(prior.targets).map(([name,target])=>
  [name,{...target,files:complete(target.files)}]));
 targets.componentPrior={commit:prior.currentCommit,files:complete(prior.current)};
 const proof={...prior,currentCommit:outer.currentCommit,currentCommitRole:outer.currentCommitRole,
  sourceSliceCommit:outer.sourceSliceCommit,collectedBaseCommit:outer.collectedBaseCommit,
  currentTreeCommitted:outer.currentTreeCommitted,current:outer.current,targets};
 proof.owners=paths.filter(path=>Object.values(targets).some(target=>
  target.files[path]?.sha256!==proof.current[path]?.sha256));
 // Flatten authorization to this complete declared closure. Frozen bindings
 // are reused without cloning the complete historical source corpus again.
 for(const target of Object.values(targets)){Object.freeze(target.files);Object.freeze(target);}
 Object.freeze(targets);Object.freeze(proof.owners);Object.freeze(proof);
 const current=createSourceEpochProjector(proof,{allowConfigLayout:true,reuseFrozenInput:true});
 const live=path=>{
  try{return readFileSync(path,'utf8');}catch(error){if(error.code==='ENOENT')return null;throw error;}
 },readers=new WeakMap();
 function preCombinedSource(path,source,{target,readSource=live}={}){
  readSource=readers.get(readSource)?.raw??readSource;
  const projected=current.preCombinedSource(path,source,{target,readSource});
  if(projected!==source||target==='componentPrior'||prior.current[path]?.sha256===current.proof.current[path]?.sha256)return projected;
  return original.preCombinedSource(path,source,{target,
   readSource:typeof readSource==='function'?current.combinedReader(readSource,'componentPrior'):readSource});
 }
 function combinedReader(readSource=live,target){
  assert.equal(typeof readSource,'function','linked reader must be a function');
  const existing=readers.get(readSource);if(existing?.target===target)return readSource;
  const raw=existing?.raw??readSource,reader=path=>preCombinedSource(path,raw(path),{target,readSource:raw});
  readers.set(reader,{raw,target});return reader;
 }
 return Object.freeze({proof:current.proof,preCombinedSource,combinedReader,
  readerTarget:reader=>readers.get(reader)?.target});
}
