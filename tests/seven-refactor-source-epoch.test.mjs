import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sevenRefactorEpoch as epoch} from './helpers/seven-refactor-source-epoch.mjs';
const proof=epoch.proof,read=p=>proof.current[p]?.source??null;
test('seven-refactor exact outer epoch restores every complete predecessor owner',()=>{
 assert.equal(proof.owners.length,11);
 for(const path of proof.owners){
  const source=readFileSync(path,'utf8').replaceAll('\r\n','\n');
  assert.equal(source,read(path));
  for(const variant of [source,source.replaceAll('\n','\r\n')])
   assert.equal(epoch.preCombinedSource(path,variant,{target:'prior',readSource:read}),proof.targets.prior.files[path].source);
 }
});
test('seven-refactor projection freshly rejects drift and missing owners after warming',()=>{
 const path='config/architecture.json';
 for(const owner of proof.owners){
  let bad=false;const reader=p=>bad&&p===owner?read(p)+'\n':read(p);
  epoch.preCombinedSource(path,read(path),{target:'prior',readSource:reader});bad=true;
  assert.throws(()=>epoch.preCombinedSource(path,read(path),{target:'prior',readSource:reader}),/linked owner identity/);
  assert.throws(()=>epoch.preCombinedSource(path,read(path),{target:'prior',readSource:p=>p===owner?null:read(p)}),/linked owner identity/);
 }
});
test('foreign and predecessor inputs remain opaque without linked reads',()=>{
 for(const path of proof.owners)for(const source of [read(path)+'\n',proof.targets.prior.files[path].source]){
  let calls=0;assert.equal(epoch.preCombinedSource(path,source,{target:'prior',readSource(){calls++;throw Error('unexpected');}}),source);assert.equal(calls,0);
 }
});
test('every advertised composed target preserves foreign bytes without linked reads',async()=>{
 const {sourceEpoch}=await import('./helpers/combined-epoch/source-epoch.mjs');
 for(const target of Object.keys(sourceEpoch.proof.targets)){
  const source=read('config/architecture.json')+'\n';let calls=0;
  assert.equal(sourceEpoch.preCombinedSource('config/architecture.json',source,{target,readSource(){calls++;throw Error('unexpected');}}),source);
  assert.equal(calls,0,target);
 }
});
