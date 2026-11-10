import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sourceEpoch,preRunHealingEpoch} from './helpers/combined-epoch/source-epoch.mjs';
import {runHealingEpoch,extendRunHealingEpoch} from './helpers/run-healing-source-epoch.mjs';
import {copyIntegrationSourceClosure} from './helpers/copy-integration-source-closure.mjs';
const proof=sourceEpoch.proof,prior=preRunHealingEpoch.proof,outer=runHealingEpoch.proof;
const paths=['config/architecture.json','src/lua/abyss_run.lua','src/lua/abyss_uncommon_relics.lua','src/lua/abyss_run_health.lua'];
const added=paths.at(-1),raw=p=>proof.current[p]?.source??null;
const live=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
test('healing outer epoch binds published production and preserves every predecessor source and metadata',()=>{
 assert.equal(outer.currentCommit,'074258935b5cf6acef99089d7ded90d855facb22');
 assert.equal(outer.targets.prior.commit,'ab65ed3b5b4240eb653af4651a13c1b8c72b2e04');
 assert.deepEqual(outer.owners,paths);assert.equal(proof.owners.length,54);assert.equal(Object.keys(proof.current).length,340);
 assert.deepEqual(proof.owners,[...prior.owners,...paths.filter(p=>!prior.owners.includes(p))]);
 for(const path of paths){assert.equal(raw(path),live(path));assert.deepEqual(outer.targets.prior.files[path],prior.current[path]??null);assert.equal(proof.current[path].rawGitBlob,proof.current[path].gitBlob);}
 for(const [path,binding]of Object.entries(prior.current))if(!paths.includes(path))assert.deepEqual(proof.current[path],binding,path);
 for(const [key,value]of Object.entries(prior))if(!['current','owners','targets'].includes(key))assert.deepEqual(proof[key],value,key);
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(proof.targets[name],{...target,files:{...target.files,[added]:null}},name);
 assert.deepEqual(proof.targets.runHealingPrior.files,{...prior.current,[added]:null});
 assert(Object.isFrozen(proof));assert(Object.isFrozen(proof.current[added]));
 assert.throws(()=>{proof.current[added].source='foreign';},TypeError);
});
test('every target recovers exact LF/CRLF owners and retains absent new witness without retiring files',()=>{
 for(const [target,record]of Object.entries(proof.targets))for(const path of paths){
  const expected=record.files[path]?.source??raw(path);
  for(const input of [raw(path),raw(path).replaceAll('\n','\r\n')])assert.equal(sourceEpoch.preCombinedSource(path,input,{target,readSource:raw}),record.files[path]?expected:input,`${target}: ${path}`);
  assert.equal(record.files[added],null);
 }
});
test('current facade freshly reads every raw owner and rejects warmed drift, missing or invalid owners',()=>{
 const path=paths[0],input=raw(path),target='actor',expected=proof.targets.actor.files[path].source;
 for(const crlf of [false,true]){
  let bad=null,missing=null;const seen=[];
  const reader=p=>{seen.push(p);if(p===missing)return null;const value=live(p);return p===bad?value+'\n':crlf?value.replaceAll('\n','\r\n'):value;};
  for(let i=0;i<2;i++){seen.length=0;assert.equal(sourceEpoch.preCombinedSource(path,input,{target,readSource:reader}),expected);assert.deepEqual(seen,proof.owners);}
  for(const owner of proof.owners){
   bad=owner;assert.throws(()=>sourceEpoch.preCombinedSource(path,input,{target,readSource:reader}),/linked owner identity/,owner);bad=null;
   missing=owner;assert.throws(()=>sourceEpoch.preCombinedSource(paths[1],raw(paths[1]),{target:'runHealingPrior',readSource:reader}),/linked owner identity/,owner);missing=null;
  }
 }
});
test('configuration layout preserves exact tokens and never accepts foreign or invalid JSON',()=>{
 const path=paths[0],source=raw(path),target='actor',expected=proof.targets.actor.files[path].source;
 for(const input of [JSON.stringify(JSON.parse(source)),JSON.stringify(JSON.parse(source),null,'\t'),source+'\n\t ']){
  let reads=0;assert.equal(sourceEpoch.preCombinedSource(path,input,{target,readSource:p=>{reads++;return raw(p);}}),expected);assert.equal(reads,54);
  assert.throws(()=>sourceEpoch.preCombinedSource(path,input,{target,readSource:p=>p===path?input:raw(p)}),/linked owner identity/);
 }
 for(const input of [source.replace('"layers"','"layers":{},"layers"'),source.replace('"layers"','"laye\\u0072s"'),JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(source)).reverse())),'\ufeff'+source,source+'-- invalid',source+'\u00a0']){
  let calls=0;assert.equal(sourceEpoch.preCombinedSource(path,input,{target,readSource(){calls++;throw Error('unexpected');}}),input);assert.equal(calls,0);
 }
});
test('foreign source is opaque; original and new absent witnesses cannot authorize reads',()=>{
 for(const target of Object.keys(proof.targets))for(const path of paths)for(const source of [raw(path)+'\n-- foreign',raw(path).slice(1),null,undefined,{},17]){
  let calls=0;assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource(){calls++;throw Error('unexpected');}}),source);assert.equal(calls,0);
 }
 for(const target of Object.keys(proof.targets)){let calls=0;assert.equal(sourceEpoch.preCombinedSource(added,raw(added),{target,readSource(){calls++;throw Error('unexpected');}}),raw(added));assert.equal(calls,0);}
});
test('raw reader ownership survives idempotent composition and target switching',()=>{
 const reader=sourceEpoch.combinedReader(raw,'runHealingPrior');assert.equal(reader(paths[1]),prior.current[paths[1]].source);
 assert.equal(sourceEpoch.combinedReader(reader,'runHealingPrior'),reader);
 const next=sourceEpoch.combinedReader(reader,'actor');assert.equal(next(paths[0]),proof.targets.actor.files[paths[0]].source);
 for(const target of ['unknown','',null,undefined,'__proto__']){
  assert.throws(()=>sourceEpoch.preCombinedSource(paths[0],raw(paths[0]),{target,readSource:raw}),/unknown source target/);
  assert.throws(()=>sourceEpoch.combinedReader(raw,target),/unknown source target/);
 }
 for(const readSource of [null,false,0,{},[]])assert.throws(()=>sourceEpoch.preCombinedSource(paths[0],raw(paths[0]),{target:'actor',readSource}),/reader/);
 assert.throws(()=>sourceEpoch.preCombinedSource(paths[0],raw(paths[0]),{target:'actor',readSource(){throw Error('unavailable');}}),/linked owner missing/);
});
test('altered predecessor bindings fail before constructing the outer epoch',()=>{
 for(const path of paths.slice(0,3))for(const field of Object.keys(prior.current[path])){
  const changed=structuredClone(prior);changed.current[path][field]='tampered';
  assert.throws(()=>extendRunHealingEpoch({...preRunHealingEpoch,proof:changed}),/authenticated predecessor/);
 }
 const changed=structuredClone(prior);changed.current[added]=structuredClone(outer.current[added]);
 assert.throws(()=>extendRunHealingEpoch({...preRunHealingEpoch,proof:changed}),/authenticated predecessor/);
});
test('isolated helper closure authenticates the new facade and keeps every predecessor import available',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'healing-source-closure-'));
 try{
  copyIntegrationSourceClosure(directory);
  const isolated=(await import(pathToFileURL(join(directory,'tests/helpers/combined-epoch/source-epoch.mjs')).href)).sourceEpoch;
  assert.deepEqual(isolated.proof,proof);
  assert.equal(isolated.preCombinedSource(paths[0],raw(paths[0]),{target:'runHealingPrior',readSource:raw}),prior.current[paths[0]].source);
  for(const path of paths)assert.throws(()=>isolated.preCombinedSource(paths[0],raw(paths[0]),{target:'runHealingPrior',readSource:p=>p===path?raw(p)+'\n':raw(p)}),/linked owner identity/);
  const previous=(await import(pathToFileURL(join(directory,'tests/helpers/combined-epoch/pre-run-healing-source-epoch.mjs')).href)).sourceEpoch;
  assert.deepEqual(previous.proof,prior);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
