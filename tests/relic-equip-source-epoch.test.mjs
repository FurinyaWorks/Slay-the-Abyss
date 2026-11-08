import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {preSilentFinalEpoch as sourceEpoch,preRelicEquipEpoch} from './helpers/combined-epoch/pre-defect-source-epoch.mjs';
import {relicEquipEpoch} from './helpers/relic-equip-source-epoch.mjs';
import {copyIntegrationSourceClosure} from './helpers/copy-integration-source-closure.mjs';
const path='src/lua/abyss_relic_hooks.lua',proof=sourceEpoch.proof,prior=preRelicEquipEpoch.proof;
const raw=p=>proof.current[p]?.source??null;
test('Relic equip outer epoch preserves every prior binding and exact frozen production byte',()=>{
 assert.equal(relicEquipEpoch.proof.currentCommit,'cbabad34d0957309cbda03e1ae467cd94371bf1c');
 assert.equal(proof.currentCommit,prior.currentCommit);
 assert.equal(proof.currentTreeCommitted,false);
 assert.match(proof.relicEquipCurrentCommitRole,/base only/);
 assert.equal(raw(path),readFileSync(path,'utf8').replaceAll('\r\n','\n'));
 assert.deepEqual(relicEquipEpoch.proof.targets.prior.files[path],prior.current[path]);
 assert.deepEqual(proof.targets.relicEquipPrior.files,prior.current);
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(proof.targets[name],target,name);
 for(const [file,binding]of Object.entries(prior.current))if(file!==path)assert.deepEqual(proof.current[file],binding,file);
 assert.deepEqual(proof.owners,prior.owners);assert.equal(proof.owners.length,48);
});
test('all advertised historical targets restore Relic equip from LF and CRLF without rewriting originals',()=>{
 for(const [target,record]of Object.entries(proof.targets)){
  const expected=record.files[path]?.source??raw(path);
  for(const source of [raw(path),raw(path).replaceAll('\n','\r\n')])assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource:raw}),expected,target);
  let reads=0;const original=record.files[path]?.source;
  assert.equal(sourceEpoch.preCombinedSource(path,original,{target,readSource(){reads++;throw Error('unexpected read');}}),original);assert.equal(reads,0);
 }
});
test('current facade retains exact config identity and rechecks all 48 owners after warm success',()=>{
 const file='config/architecture.json',source=raw(file),target='actor';
 let calls=0;assert.equal(sourceEpoch.preCombinedSource(file,source,{target,readSource:p=>{calls++;return raw(p);}}),proof.targets.actor.files[file].source);assert.equal(calls,48);
 for(const owner of proof.owners){
  let bad=false;const readSource=p=>bad&&p===owner?raw(p)+'\n':raw(p);
  sourceEpoch.preCombinedSource(file,source,{target,readSource});bad=true;
  assert.throws(()=>sourceEpoch.preCombinedSource(file,source,{target,readSource}),/linked owner identity/,owner);
  assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target:'relicEquipPrior',readSource:p=>p===owner?null:raw(p)}),/linked owner identity/,owner);
 }
});
test('foreign bytes never authorize reads and composed readers preserve explicit raw reader ownership',()=>{
 for(const target of Object.keys(proof.targets))for(const source of [raw(path)+'\n',raw(path).slice(1),null,undefined,{},17]){
  let reads=0;assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource(){reads++;throw Error('unexpected read');}}),source);assert.equal(reads,0);
 }
 const reader=sourceEpoch.combinedReader(raw,'relicEquipPrior');assert.equal(reader(path),prior.current[path].source);
 assert.equal(sourceEpoch.combinedReader(reader,'relicEquipPrior'),reader);
 const retargeted=sourceEpoch.combinedReader(reader,'actor');assert.equal(retargeted(path),proof.targets.actor.files[path].source);
 assert.throws(()=>sourceEpoch.combinedReader(null,'actor'),/reader/);
});
test('isolated authenticated helper closure retains the exact Relic equip epoch and rejects owner drift',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'silent-epoch-closure-'));
 try{
  copyIntegrationSourceClosure(directory);
  const isolated=(await import(pathToFileURL(join(directory,'tests/helpers/combined-epoch/pre-defect-source-epoch.mjs')).href)).preSilentFinalEpoch;
  assert.deepEqual(isolated.proof,proof);
  assert.equal(isolated.preCombinedSource(path,raw(path),{target:'relicEquipPrior',readSource:raw}),prior.current[path].source);
  assert.throws(()=>isolated.preCombinedSource(path,raw(path),{target:'relicEquipPrior',readSource:p=>p===path?raw(p)+'\n':raw(p)}),/linked owner identity/);
 }finally{rmSync(directory,{recursive:true,force:true});}
});


test('unknown source targets are rejected rather than gaining an identity fallback',()=>{
 for(const target of ['unknown','',undefined,null]){
  assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target,readSource:raw}),/unknown source target/);
  assert.throws(()=>sourceEpoch.combinedReader(raw,target)(path),/unknown source target/);
 }
});

test('configuration layout admission preserves exact tokens and freshly authenticates all 48 current raw owners',async()=>{
 const {preSilentFinalEpoch:sourceEpoch}=await import('./helpers/combined-epoch/pre-defect-source-epoch.mjs');
 const proof=sourceEpoch.proof,path='config/architecture.json',source=proof.current[path].source;
 const raw=p=>proof.current[p]?.source??null,expected=proof.targets.actor.files[path].source;
 assert.equal(proof.owners.length,48);
 const layouts=[JSON.stringify(JSON.parse(source)),JSON.stringify(JSON.parse(source),null,'\t'),source+'\n\t '];
 for(const input of layouts){
  let calls=0;assert.equal(sourceEpoch.preCombinedSource(path,input,{target:'actor',readSource:p=>{calls++;return raw(p);}}),expected);
  assert.equal(calls,48);
  assert.throws(()=>sourceEpoch.preCombinedSource(path,input,{target:'actor',readSource:null}),/reader/);
  assert.throws(()=>sourceEpoch.preCombinedSource(path,input,{target:'actor',readSource:p=>p===path?input:raw(p)}),/linked owner identity/);
 }
 for(const owner of proof.owners){
  let drift=false;const reader=p=>drift&&p===owner?raw(p)+'\n':raw(p);
  sourceEpoch.preCombinedSource(path,layouts[0],{target:'actor',readSource:reader});drift=true;
  assert.throws(()=>sourceEpoch.preCombinedSource(path,layouts[0],{target:'actor',readSource:reader}),/linked owner identity/);
  assert.throws(()=>sourceEpoch.preCombinedSource(path,layouts[0],{target:'actor',readSource:p=>p===owner?null:raw(p)}),/linked owner identity/);
 }
 const variants=[source.replace('"layers"','"layers": {}, "layers"'),source.replace('"layers"','"laye\\u0072s"'),JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(source)).reverse())),'\ufeff'+source,source+'-- invalid',source+'\u00a0'];
 for(const input of variants){let calls=0;assert.equal(sourceEpoch.preCombinedSource(path,input,{target:'actor',readSource(){calls++;throw Error('unexpected');}}),input);assert.equal(calls,0);}
});

test('outer foreign-source fallback preserves invalid raw-reader semantics',()=>{
 for(const target of Object.keys(proof.targets))for(const source of ['foreign source',null,{},17])for(const readSource of [null,false,0,{}])
  assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource}),source);
});
