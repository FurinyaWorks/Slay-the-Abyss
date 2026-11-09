import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sourceEpoch,preTreasureSourceEpoch} from './helpers/combined-epoch/source-epoch.mjs';
import {treasureSourceEpoch} from './helpers/treasure-source-source-epoch.mjs';
import {copyIntegrationSourceClosure} from './helpers/copy-integration-source-closure.mjs';
const path='src/lua/abyss_treasure_source.lua',proof=sourceEpoch.proof,prior=preTreasureSourceEpoch.proof;
const raw=p=>proof.current[p]?.source??null;
test('Treasure source outer epoch preserves every prior binding and exact frozen production byte',()=>{
 assert.equal(treasureSourceEpoch.proof.currentCommit,'1eb288472d7b33b7450eec97a624ca2ffa526f39');
 assert.equal(proof.currentCommit,prior.currentCommit);
 assert.equal(proof.currentTreeCommitted,false);
 assert.match(proof.treasureSourceCurrentCommitRole,/base only/);
 assert.equal(raw(path),readFileSync(path,'utf8').replaceAll('\r\n','\n'));
 assert.deepEqual(treasureSourceEpoch.proof.targets.prior.files[path],prior.current[path]);
 assert.deepEqual(proof.targets.treasureSourcePrior.files,prior.current);
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(proof.targets[name],target,name);
 for(const [file,binding]of Object.entries(prior.current))if(file!==path)assert.deepEqual(proof.current[file],binding,file);
 assert.deepEqual(proof.owners,[...prior.owners,path]);assert.equal(proof.owners.length,52);
});
test('all advertised historical targets restore Treasure source from LF and CRLF without rewriting originals',()=>{
 for(const [target,record]of Object.entries(proof.targets)){
  const expected=record.files[path]?.source??raw(path);
  for(const source of [raw(path),raw(path).replaceAll('\n','\r\n')])assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource:raw}),expected,target);
  let reads=0;const original=record.files[path]?.source;
  assert.equal(sourceEpoch.preCombinedSource(path,original,{target,readSource(){reads++;throw Error('unexpected read');}}),original);assert.equal(reads,0);
 }
});
test('current facade retains exact config identity and rechecks all 52 owners after warm success',()=>{
 const file='config/architecture.json',source=raw(file),target='actor';
 let calls=0;assert.equal(sourceEpoch.preCombinedSource(file,source,{target,readSource:p=>{calls++;return raw(p);}}),proof.targets.actor.files[file].source);assert.equal(calls,52);
 for(const owner of proof.owners){
  let bad=false;const readSource=p=>bad&&p===owner?raw(p)+'\n':raw(p);
  sourceEpoch.preCombinedSource(file,source,{target,readSource});bad=true;
  assert.throws(()=>sourceEpoch.preCombinedSource(file,source,{target,readSource}),/linked owner identity/,owner);
  assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target:'treasureSourcePrior',readSource:p=>p===owner?null:raw(p)}),/linked owner identity/,owner);
 }
});
test('foreign bytes never authorize reads and composed readers preserve explicit raw reader ownership',()=>{
 for(const target of Object.keys(proof.targets))for(const source of [raw(path)+'\n',raw(path).slice(1),null,undefined,{},17]){
  let reads=0;assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource(){reads++;throw Error('unexpected read');}}),source);assert.equal(reads,0);
 }
 const reader=sourceEpoch.combinedReader(raw,'treasureSourcePrior');assert.equal(reader(path),prior.current[path].source);
 assert.equal(sourceEpoch.combinedReader(reader,'treasureSourcePrior'),reader);
 const retargeted=sourceEpoch.combinedReader(reader,'actor');assert.equal(retargeted(path),proof.targets.actor.files[path].source);
 assert.throws(()=>sourceEpoch.combinedReader(null,'actor'),/reader/);
});
test('isolated authenticated helper closure retains the exact Treasure source epoch and rejects owner drift',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'treasure-source-epoch-closure-'));
 try{
  copyIntegrationSourceClosure(directory);
  const isolated=(await import(pathToFileURL(join(directory,'tests/helpers/combined-epoch/source-epoch.mjs')).href)).sourceEpoch;
  assert.deepEqual(isolated.proof,proof);
  assert.equal(isolated.preCombinedSource(path,raw(path),{target:'treasureSourcePrior',readSource:raw}),prior.current[path].source);
  assert.throws(()=>isolated.preCombinedSource(path,raw(path),{target:'treasureSourcePrior',readSource:p=>p===path?raw(p)+'\n':raw(p)}),/linked owner identity/);
 }finally{rmSync(directory,{recursive:true,force:true});}
});


test('unknown source targets are rejected rather than gaining an identity fallback',()=>{
 for(const target of ['unknown','',undefined,null]){
  assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target,readSource:raw}),/unknown source target/);
  assert.throws(()=>sourceEpoch.combinedReader(raw,target)(path),/unknown source target/);
 }
});

test('configuration layout admission preserves exact tokens and freshly authenticates all 52 current raw owners',async()=>{
 const {sourceEpoch}=await import('./helpers/combined-epoch/source-epoch.mjs');
 const proof=sourceEpoch.proof,path='config/architecture.json',source=proof.current[path].source;
 const raw=p=>proof.current[p]?.source??null,expected=proof.targets.actor.files[path].source;
 assert.equal(proof.owners.length,52);
 const layouts=[JSON.stringify(JSON.parse(source)),JSON.stringify(JSON.parse(source),null,'\t'),source+'\n\t '];
 for(const input of layouts){
  let calls=0;assert.equal(sourceEpoch.preCombinedSource(path,input,{target:'actor',readSource:p=>{calls++;return raw(p);}}),expected);
  assert.equal(calls,52);
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

test('live LF and CRLF raw owner reads authenticate 52 current owners on every call',()=>{
 const config='config/architecture.json',input=readFileSync(config,'utf8'),expected=proof.targets.actor.files[config].source;
 for(const crlf of [false,true]){
  const seen=[];let corrupt=null,missing=null;
  const live=file=>{seen.push(file);if(file===missing)return null;const bytes=readFileSync(file,'utf8').replaceAll('\r\n','\n');return file===corrupt?bytes+'\n':crlf?bytes.replaceAll('\n','\r\n'):bytes;};
  for(let repeat=0;repeat<2;repeat++){seen.length=0;assert.equal(sourceEpoch.preCombinedSource(config,input,{target:'actor',readSource:live}),expected);assert.deepEqual(seen,proof.owners);}
  for(const owner of proof.owners){
   corrupt=owner;assert.throws(()=>sourceEpoch.preCombinedSource(config,input,{target:'actor',readSource:live}),/linked owner identity/,owner);corrupt=null;
   missing=owner;assert.throws(()=>sourceEpoch.preCombinedSource(path,readFileSync(path,'utf8'),{target:'treasureSourcePrior',readSource:live}),/linked owner identity/,owner);missing=null;
  }
 }
});

test('outer metadata preserves the full predecessor and rejects altered predecessor metadata',async()=>{
 const {extendTreasureSourceEpoch}=await import('./helpers/treasure-source-source-epoch.mjs');
 for(const [key,value]of Object.entries(prior))if(!['current','owners','targets'].includes(key))assert.deepEqual(proof[key],value,key);
 assert.equal(proof.treasureSourceCollectedBaseCommit,'1eb288472d7b33b7450eec97a624ca2ffa526f39');
 assert.equal(proof.current[path].rawGitBlob,proof.current[path].gitBlob);
 assert.equal(proof.current[path].mode,'100644');
 for(const field of ['source','sha256','gitBlob','rawGitBlob','mode']){
  const changed=structuredClone(prior);changed.current[path][field]='tampered';
  assert.throws(()=>extendTreasureSourceEpoch({...preTreasureSourceEpoch,proof:changed}),/authenticated predecessor/,field);
 }
 assert(Object.isFrozen(proof));assert(Object.isFrozen(proof.targets.treasureSourcePrior.files[path]));
 assert.throws(()=>{proof.current[path].source='foreign';},TypeError);
});

test('source and configuration reject unknown targets and malformed live readers after warm authorization',()=>{
 for(const file of [path,'config/architecture.json']){
  for(const target of ['unknown','',null,undefined,'__proto__']){
   assert.throws(()=>sourceEpoch.preCombinedSource(file,raw(file),{target,readSource:raw}),/unknown source target/);
   assert.throws(()=>sourceEpoch.preCombinedSource(file,'foreign',{target,readSource:null}),/unknown source target/);
  }
  const target=file===path?'treasureSourcePrior':'actor';
  sourceEpoch.preCombinedSource(file,raw(file),{target,readSource:raw});
  for(const readSource of [null,false,0,{},[]])assert.throws(()=>sourceEpoch.preCombinedSource(file,raw(file),{target,readSource}),/reader/);
  assert.throws(()=>sourceEpoch.preCombinedSource(file,raw(file),{target,readSource(){throw Error('unavailable');}}),/linked owner missing/);
  for(const value of [{},17,false,undefined])assert.throws(()=>sourceEpoch.preCombinedSource(file,raw(file),{target,readSource:()=>value}),/linked owner identity/);
 }
});
