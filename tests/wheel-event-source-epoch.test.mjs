import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {sourceEpoch,preWheelEpoch} from './helpers/combined-epoch/source-epoch.mjs';
import {wheelEventEpoch,extendWheelEventEpoch} from './helpers/wheel-event-source-epoch.mjs';
import {copyIntegrationSourceClosure} from './helpers/copy-integration-source-closure.mjs';
import {preAct1ChoiceSource} from './helpers/act1-choice-source-inverse.mjs';
const proof=sourceEpoch.proof,prior=preWheelEpoch.proof,path='src/lua/abyss_wheel_event.lua';
const raw=p=>proof.current[p]?.source??null;
const hash=b=>createHash('sha256').update(b).digest('hex');
test('Wheel outer preserves all 339 predecessor bindings, metadata and historical targets',()=>{
 assert.equal(wheelEventEpoch.proof.currentCommit,'ef6b62a23aa85b41e32fb6e5c4e95b697b41d66c');
 assert.deepEqual(wheelEventEpoch.proof.owners,[path]);
 assert.equal(Object.keys(proof.current).length,339);assert.equal(proof.owners.length,54);
 assert.deepEqual(proof.owners,[...prior.owners,path]);
 assert.deepEqual(proof.targets.wheelPrior.files,prior.current);
 assert.equal(proof.currentTreeCommitted,false);assert.match(proof.wheelEventCurrentCommitRole,/base only/);
 for(const [key,value]of Object.entries(prior))if(!['current','owners','targets'].includes(key))assert.deepEqual(proof[key],value,key);
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(proof.targets[name],target,name);
 for(const [file,binding]of Object.entries(prior.current))if(file!==path)assert.deepEqual(proof.current[file],binding,file);
 assert.deepEqual(['config/architecture.json',...readdirSync('src/lua').filter(p=>p.endsWith('.lua')).map(p=>'src/lua/'+p)].sort(),Object.keys(proof.current).filter(p=>proof.current[p]!==null).sort());
 for(const [file,binding]of Object.entries(proof.current))if(binding)assert.equal(readFileSync(file,'utf8').replaceAll('\r\n','\n'),binding.source,file);
 assert.equal(readFileSync('tests/fixtures/wheel-event-before.lua','utf8'),prior.current[path].source);
 assert.equal(hash(readFileSync('tests/helpers/combined-epoch/pre-wheel-source-epoch.mjs')),'a06e3845b23f0c52f1871b7bbb2a8c2e12224e52c7dfe1a916a0d0d3d2a6cb45');
 assert.deepEqual(wheelEventEpoch.proof.targets.prior.files[path],prior.current[path]);
 for(const field of Object.keys(prior.current[path])){const changed={...prior,current:{...prior.current,[path]:{...prior.current[path],[field]:'tampered'}}};assert.throws(()=>extendWheelEventEpoch({...preWheelEpoch,proof:changed}),/authenticated predecessor/);}
 assert(Object.isFrozen(proof.targets.wheelPrior.files));assert(Object.isFrozen(proof.current[path]));
});
test('Wheel projects all historical targets from LF and CRLF, leaving originals and opaque inputs untouched',()=>{
 for(const [target,record]of Object.entries(proof.targets)){
  const expected=record.files[path]?.source??raw(path);
  for(const source of [raw(path),raw(path).replaceAll('\n','\r\n')])assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource:raw}),expected,target);
  for(const source of [record.files[path]?.source,raw(path)+'--foreign','\ufeff'+raw(path),null,undefined,{},17]){let reads=0;assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource(){reads++;throw Error('unexpected');}}),source);assert.equal(reads,0);}
 }
 for(const target of ['unknown','',null,undefined,'__proto__'])assert.throws(()=>sourceEpoch.preCombinedSource(path,'foreign',{target,readSource:null}),/unknown source target/);
});
test('all 54 fresh raw owners remain mandatory after warm authorization and linked-reader retargeting',()=>{
 for(const crlf of [false,true]){
  let corrupt=null,missing=null;const seen=[];
  const readSource=p=>{seen.push(p);if(p===missing)return null;const s=readFileSync(p,'utf8').replaceAll('\r\n','\n');return p===corrupt?s+'\n':crlf?s.replaceAll('\n','\r\n'):s;};
  for(let i=0;i<2;i++){seen.length=0;assert.equal(sourceEpoch.preCombinedSource(path,raw(path),{target:'wheelPrior',readSource}),prior.current[path].source);assert.deepEqual(seen,proof.owners);}
  for(const owner of proof.owners){corrupt=owner;assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target:'wheelPrior',readSource}),/linked owner identity/,owner);corrupt=null;missing=owner;assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target:'wheelPrior',readSource}),/linked owner identity/,owner);missing=null;}
  const reader=sourceEpoch.combinedReader(readSource,'wheelPrior');assert.equal(reader(path),prior.current[path].source);assert.equal(sourceEpoch.combinedReader(reader,'wheelPrior'),reader);
  const retarget=sourceEpoch.combinedReader(reader,'act1');assert.equal(retarget(path),proof.targets.act1.files[path].source);corrupt='config/architecture.json';assert.throws(()=>retarget(path),/linked owner identity/);
 }
 for(const readSource of [null,false,0,{},[]])assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target:'wheelPrior',readSource}),/reader/);
 assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target:'wheelPrior',readSource(){throw Error('missing');}}),/linked owner missing/);
 // Layout permission is input-only: linked configuration must still match its exact raw identity.
 const config='config/architecture.json',layout=JSON.stringify(JSON.parse(raw(config)));
 assert.equal(sourceEpoch.preCombinedSource(config,layout,{target:'act1',readSource:raw}),proof.targets.act1.files[config].source);
 assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target:'act1',readSource:p=>p===config?layout:raw(p)}),/linked owner identity/);
});
test('historical Act1 public facade preserves Wheel source with a complete authenticated reader',()=>{
 const expected=proof.targets.act1.files[path].source;
 for(const source of [raw(path),raw(path).replaceAll('\n','\r\n')])assert.equal(preAct1ChoiceSource(path,source,{readSource:raw}),expected);
 assert.equal(preAct1ChoiceSource(path,expected,{readSource:raw}),expected);
 assert.throws(()=>preAct1ChoiceSource(path,raw(path),{readSource:p=>p===path?raw(p)+'\n':raw(p)}),/linked owner identity/);
});
test('isolated helper closure imports both complete epochs without Git or production tree access',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'wheel-epoch-'));
 try{
  copyIntegrationSourceClosure(directory);
  const script=`import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
   const module=await import(${JSON.stringify(pathToFileURL(join(directory,'tests/helpers/combined-epoch/source-epoch.mjs')).href)});
   const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
   assert.equal(hash(module.sourceEpoch.proof),${JSON.stringify(hash(JSON.stringify(proof)))});
   assert.equal(hash(module.preWheelEpoch.proof),${JSON.stringify(hash(JSON.stringify(prior)))});
   const path='src/lua/abyss_wheel_event.lua',raw=p=>module.sourceEpoch.proof.current[p]?.source??null;
   assert.equal(module.sourceEpoch.preCombinedSource(path,raw(path),{target:'wheelPrior',readSource:raw}),module.preWheelEpoch.proof.current[path].source);
   assert.throws(()=>module.sourceEpoch.preCombinedSource(path,raw(path),{target:'wheelPrior',readSource:p=>p===path?null:raw(p)}),/linked owner identity/);`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:directory,encoding:'utf8'});
  assert.equal(child.status,0,child.stdout+child.stderr);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
