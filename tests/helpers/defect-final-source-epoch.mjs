// A new exact outer epoch. Historical archives and their source identities stay frozen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./defect-final-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'a656584db182a608b75f66a46a8d31ae4d4bbaba6c64d376d1d47a011c7833ce','defect-final compressed identity');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'9ff0ee03d4e8357784730a351463ba4d3afa7284b3aba3d262051af1e6c885c5','defect-final complete identity');
export const defectFinalEpoch=createSourceEpochProjector(JSON.parse(bytes));
export function extendDefectFinalEpoch(original){
 const outer=defectFinalEpoch.proof,prior=original.proof;
 for(const [path,binding]of Object.entries(outer.targets.prior.files))
  assert.deepEqual(binding,prior.current[path],'defect-final authenticated predecessor: '+path);
 const proof={...prior,currentTreeCommitted:false,defectFinalCurrentCommitRole:outer.currentCommitRole,defectFinalCollectedBaseCommit:outer.targets.prior.commit,current:{...prior.current,...outer.current},
  owners:[...new Set([...prior.owners,...outer.owners])],
  targets:{...prior.targets,defectFinalPrior:{commit:outer.targets.prior.commit,files:prior.current}}};
 const current=createSourceEpochProjector(proof,{allowConfigLayout:true}),live=p=>readFileSync(p,'utf8'),readers=new WeakMap();
 function preCombinedSource(path,source,{target,readSource=live}={}){
  readSource=readers.get(readSource)?.raw??readSource;
  const projected=current.preCombinedSource(path,source,{target,readSource});
  if(projected!==source||target==='defectFinalPrior'||prior.current[path]?.sha256===current.proof.current[path]?.sha256)return projected;
  return original.preCombinedSource(path,source,{target,readSource:typeof readSource==='function'?current.combinedReader(readSource,'defectFinalPrior'):readSource});
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
