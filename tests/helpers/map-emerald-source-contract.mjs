import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sourceEpoch,preEmeraldNodeEpoch} from './combined-epoch/source-epoch.mjs';
import {emeraldNodeEpoch,extendEmeraldNodeEpoch} from './emerald-node-source-epoch.mjs';
import {copyIntegrationSourceClosure} from './copy-integration-source-closure.mjs';
const path='src/lua/abyss_map.lua',proof=sourceEpoch.proof,prior=preEmeraldNodeEpoch.proof;
const raw=p=>proof.current[p]?.source??null;
test('Emerald node adds one authenticated owner without altering historical proofs',()=>{
 assert.equal(emeraldNodeEpoch.proof.currentCommit,'1eb288472d7b33b7450eec97a624ca2ffa526f39');
 assert.equal(proof.currentTreeCommitted,false);assert.match(proof.emeraldNodeCurrentCommitRole,/base only/);
 assert.equal(raw(path),readFileSync(path,'utf8').replaceAll('\r\n','\n'));
 assert.deepEqual(emeraldNodeEpoch.proof.targets.prior.files[path],prior.current[path]);
 assert.deepEqual(proof.targets.emeraldNodePrior.files,prior.current);
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(proof.targets[name],target,name);
 for(const [file,binding]of Object.entries(prior.current))if(file!==path)assert.deepEqual(proof.current[file],binding,file);
 for(const [key,value]of Object.entries(prior))if(!['current','owners','targets'].includes(key))assert.deepEqual(proof[key],value,key);
 assert.deepEqual(proof.owners,[...prior.owners,path]);assert.equal(proof.owners.length,52);
 for(const field of Object.keys(prior.current[path])){
  const changed=structuredClone(prior);changed.current[path][field]='tampered';
  assert.throws(()=>extendEmeraldNodeEpoch({...preEmeraldNodeEpoch,proof:changed}),/authenticated predecessor/,field);
 }
 assert(Object.isFrozen(proof));assert(Object.isFrozen(proof.current[path]));
});
test('every historical target restores map LF and CRLF while foreign and original bytes never authorize reads',()=>{
 for(const [target,record]of Object.entries(proof.targets)){
  const expected=record.files[path]?.source??raw(path);
  for(const source of [raw(path),raw(path).replaceAll('\n','\r\n')])assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource:raw}),expected,target);
  for(const source of [expected,raw(path)+'\n',raw(path).slice(1),null,undefined,{},17]){
   let calls=0;assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource(){calls++;throw Error('unexpected read');}}),source);assert.equal(calls,0);
  }
 }
});
test('map and config authenticate all 52 live owners afresh, including after warm authorization',()=>{
 const config='config/architecture.json';
 for(const crlf of [false,true]){
  let corrupt=null,missing=null;const seen=[];
  const live=file=>{seen.push(file);if(file===missing)return null;const source=readFileSync(file,'utf8').replaceAll('\r\n','\n');return file===corrupt?source+'\n':crlf?source.replaceAll('\n','\r\n'):source;};
  for(const [file,target]of [[path,'emeraldNodePrior'],[config,'actor']]){
   const source=readFileSync(file,'utf8');
   for(let repeat=0;repeat<2;repeat++){seen.length=0;assert.equal(sourceEpoch.preCombinedSource(file,source,{target,readSource:live}),proof.targets[target].files[file].source);assert.deepEqual(seen,proof.owners);}
   for(const owner of proof.owners){
    corrupt=owner;assert.throws(()=>sourceEpoch.preCombinedSource(file,source,{target,readSource:live}),/linked owner identity/,owner);corrupt=null;
    missing=owner;assert.throws(()=>sourceEpoch.preCombinedSource(file,source,{target,readSource:live}),/linked owner identity/,owner);missing=null;
   }
  }
 }
 const layout=JSON.stringify(JSON.parse(raw(config)));
 assert.equal(sourceEpoch.preCombinedSource(config,layout,{target:'actor',readSource:raw}),proof.targets.actor.files[config].source);
 assert.throws(()=>sourceEpoch.preCombinedSource(config,layout,{target:'actor',readSource:p=>p===path?raw(p)+'\n':raw(p)}),/linked owner identity/);
});
test('reader composition preserves raw identity checks and rejects unknown targets or malformed readers',()=>{
 const reader=sourceEpoch.combinedReader(raw,'emeraldNodePrior');assert.equal(reader(path),prior.current[path].source);
 assert.equal(sourceEpoch.combinedReader(reader,'emeraldNodePrior'),reader);
 assert.equal(sourceEpoch.combinedReader(reader,'actor')(path),proof.targets.actor.files[path].source);
 for(const target of ['unknown','',undefined,null,'__proto__']){
  assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target,readSource:raw}),/unknown source target/);
  assert.throws(()=>sourceEpoch.combinedReader(raw,target),/unknown source target/);
 }
 for(const readSource of [null,false,0,{},[]]){
  assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target:'emeraldNodePrior',readSource}),/reader/);
  assert.equal(sourceEpoch.preCombinedSource(path,'foreign',{target:'actor',readSource}),'foreign');
 }
 assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target:'emeraldNodePrior',readSource(){throw Error('unavailable');}}),/linked owner missing/);
});
test('isolated authenticated helper closure preserves the map epoch and rejects drift',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'emerald-epoch-closure-'));
 try{
  copyIntegrationSourceClosure(directory);
  const isolated=(await import(pathToFileURL(join(directory,'tests/helpers/combined-epoch/source-epoch.mjs')).href)).sourceEpoch;
  assert.deepEqual(isolated.proof,proof);
  assert.equal(isolated.preCombinedSource(path,raw(path),{target:'emeraldNodePrior',readSource:raw}),prior.current[path].source);
  assert.throws(()=>isolated.preCombinedSource(path,raw(path),{target:'emeraldNodePrior',readSource:p=>p===path?raw(p)+'\n':raw(p)}),/linked owner identity/);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
