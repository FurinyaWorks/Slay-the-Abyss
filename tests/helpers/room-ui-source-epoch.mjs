// Exact committed room/map continuation; historical component archives stay frozen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
import {componentUiSourceEpoch} from './component-ui-source-epoch.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./room-ui-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'0b3cb34acf85e814bd3e7d82254e9586a6a60c78e20fd95603b2e96e877d7bfc','room UI compressed identity');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'9312602924483d508a01e03060cfa1c12e554915bbd48f2c80eaba80ffb842c4','room UI complete identity');
export const roomUiSourceEpoch=createSourceEpochProjector(JSON.parse(bytes),{allowConfigLayout:true});

export function extendRoomUiEpoch(original){
 const outer=roomUiSourceEpoch.proof,prior=original.proof;
 assert.deepEqual(outer.owners,componentUiSourceEpoch.proof.owners,'room UI complete component owner closure');
 for(const path of outer.owners)assert(prior.owners.includes(path),'room UI composed owner: '+path);
 for(const [path,binding]of Object.entries(outer.targets.componentUiPrior.files))
  assert.deepEqual(binding,prior.current[path],'room UI authenticated predecessor: '+path);
 const proof={...prior,currentCommit:outer.currentCommit,currentCommitRole:outer.currentCommitRole,
  // The 22-owner slice is committed; the composed 345-path historical corpus is not that Git tree.
  sourceSliceCommit:outer.sourceSliceCommit,currentTreeCommitted:false,
  current:{...prior.current,...outer.current},
  targets:{...prior.targets,componentUiPrior:{commit:prior.currentCommit,files:prior.current}}};
 const current=createSourceEpochProjector(proof,{allowConfigLayout:true}),live=p=>{
  try{return readFileSync(p,'utf8');}catch(error){if(error.code==='ENOENT')return null;throw error;}
 },readers=new WeakMap();
 function preCombinedSource(path,source,{target,readSource=live}={}){
  readSource=readers.get(readSource)?.raw??readSource;
  const projected=current.preCombinedSource(path,source,{target,readSource});
  if(projected!==source||target==='componentUiPrior'||prior.current[path]?.sha256===current.proof.current[path]?.sha256)return projected;
  return original.preCombinedSource(path,source,{target,
   readSource:typeof readSource==='function'?current.combinedReader(readSource,'componentUiPrior'):readSource});
 }
 function combinedReader(readSource=live,target){
  assert(Object.hasOwn(current.proof.targets,target),'unknown source target');
  assert.equal(typeof readSource,'function','linked reader must be a function');
  const existing=readers.get(readSource);if(existing?.target===target)return readSource;
  const raw=existing?.raw??readSource,reader=path=>preCombinedSource(path,raw(path),{target,readSource:raw});
  readers.set(reader,{raw,target});return reader;
 }
 return Object.freeze({proof:current.proof,preCombinedSource,combinedReader,readerTarget:r=>readers.get(r)?.target});
}
