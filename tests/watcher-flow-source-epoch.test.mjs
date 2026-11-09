import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {standaloneWatcherFlowEpoch as sourceEpoch,preWatcherFlowEpoch} from './helpers/combined-epoch/pre-defect-source-epoch.mjs';
import {watcherFlowEpoch} from './helpers/watcher-flow-source-epoch.mjs';
import {copyIntegrationSourceClosure} from './helpers/copy-integration-source-closure.mjs';
const path='src/lua/abyss_watcher_flow_cards.lua',proof=sourceEpoch.proof,prior=preWatcherFlowEpoch.proof;
const raw=p=>proof.current[p]?.source??null;
import {sourceEpoch as currentEpoch} from './helpers/combined-epoch/source-epoch.mjs';
test('Flow outer epoch preserves every prior binding and exact frozen production byte',()=>{
 assert.equal(watcherFlowEpoch.proof.currentCommit,'c24ef4e02173d2a160382f09d32f2dec82eed5fc');
 assert.equal(raw(path),currentEpoch.preCombinedSource(path,readFileSync(path,'utf8'),{target:'watcherFlowPreparationPrior'}));
 assert.deepEqual(watcherFlowEpoch.proof.targets.prior.files[path],prior.current[path]);
 assert.deepEqual(proof.targets.watcherFlowPrior.files,prior.current);
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(proof.targets[name],target,name);
 for(const [file,binding]of Object.entries(prior.current))if(file!==path)assert.deepEqual(proof.current[file],binding,file);
 assert.deepEqual(proof.owners,[...prior.owners,path]);assert.equal(proof.owners.length,46);
});
test('all advertised historical targets restore Flow from LF and CRLF without rewriting originals',()=>{
 for(const [target,record]of Object.entries(proof.targets)){
  const expected=record.files[path]?.source??raw(path);
  for(const source of [raw(path),raw(path).replaceAll('\n','\r\n')])assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource:raw}),expected,target);
  let reads=0;const original=record.files[path]?.source;
  assert.equal(sourceEpoch.preCombinedSource(path,original,{target,readSource(){reads++;throw Error('unexpected read');}}),original);assert.equal(reads,0);
 }
});
test('current facade retains config token semantics and rechecks all 46 owners after warm success',()=>{
 const file='config/architecture.json',source=JSON.stringify(JSON.parse(raw(file))),target='actor';
 let calls=0;assert.equal(sourceEpoch.preCombinedSource(file,source,{target,readSource:p=>{calls++;return raw(p);}}),proof.targets.actor.files[file].source);assert.equal(calls,46);
 for(const owner of proof.owners){
  let bad=false;const readSource=p=>bad&&p===owner?raw(p)+'\n':raw(p);
  sourceEpoch.preCombinedSource(file,source,{target,readSource});bad=true;
  assert.throws(()=>sourceEpoch.preCombinedSource(file,source,{target,readSource}),/linked owner identity/,owner);
  assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target:'watcherFlowPrior',readSource:p=>p===owner?null:raw(p)}),/linked owner identity/,owner);
 }
});
test('foreign bytes never authorize reads and composed readers preserve explicit raw reader ownership',()=>{
 for(const target of Object.keys(proof.targets))for(const source of [raw(path)+'\n',raw(path).slice(1),null,undefined,{},17]){
  let reads=0;assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource(){reads++;throw Error('unexpected read');}}),source);assert.equal(reads,0);
 }
 const reader=sourceEpoch.combinedReader(raw,'watcherFlowPrior');assert.equal(reader(path),prior.current[path].source);
 assert.equal(sourceEpoch.combinedReader(reader,'watcherFlowPrior'),reader);
 const retargeted=sourceEpoch.combinedReader(reader,'actor');assert.equal(retargeted(path),proof.targets.actor.files[path].source);
 assert.throws(()=>sourceEpoch.combinedReader(null,'actor'),/reader/);
});
test('isolated authenticated helper closure retains the exact Flow epoch and rejects owner drift',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'flow-epoch-closure-'));
 try{
  copyIntegrationSourceClosure(directory);
  const isolated=(await import(pathToFileURL(join(directory,'tests/helpers/combined-epoch/pre-defect-source-epoch.mjs')).href)).standaloneWatcherFlowEpoch;
  assert.deepEqual(isolated.proof,proof);
  assert.equal(isolated.preCombinedSource(path,raw(path),{target:'watcherFlowPrior',readSource:raw}),prior.current[path].source);
  assert.throws(()=>isolated.preCombinedSource(path,raw(path),{target:'watcherFlowPrior',readSource:p=>p===path?raw(p)+'\n':raw(p)}),/linked owner identity/);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
