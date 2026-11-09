import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {standaloneEffectsTargetGroupEpoch as sourceEpoch,preEffectsTargetGroupEpoch} from './helpers/combined-epoch/pre-defect-source-epoch.mjs';
import {effectsTargetGroupEpoch} from './helpers/effects-target-group-source-epoch.mjs';
import {copyIntegrationSourceClosure} from './helpers/copy-integration-source-closure.mjs';
const path='src/lua/abyss_effects.lua',proof=sourceEpoch.proof,prior=preEffectsTargetGroupEpoch.proof;
const raw=p=>proof.current[p]?.source??null;
test('Effects target group outer epoch preserves every prior binding and exact frozen production byte',()=>{
 assert.equal(effectsTargetGroupEpoch.proof.currentCommit,'549e92aac19eaf4589e2f5ff869943becea78459');
 assert.equal(proof.currentCommit,prior.currentCommit);
 assert.equal(proof.sourceSliceCommit,prior.sourceSliceCommit);
 assert.equal(proof.collectedBaseCommit,prior.collectedBaseCommit);
 assert.equal(proof.effectsTargetGroupLocalSourceSliceCommit,'eba244948d6116aeb478b409095680f5c3f8cdc9');
 assert.equal(proof.effectsTargetGroupSourceTree,'ef6ff1bd7ce4fe466ea52752bee6c9fd9eb5fc65');
 assert.equal(raw(path),readFileSync(path,'utf8').replaceAll('\r\n','\n'));
 assert.deepEqual(effectsTargetGroupEpoch.proof.targets.prior.files[path],prior.current[path]);
 assert.deepEqual(proof.targets.effectsTargetGroupPrior.files,prior.current);
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(proof.targets[name],target,name);
 for(const [file,binding]of Object.entries(prior.current))if(file!==path)assert.deepEqual(proof.current[file],binding,file);
 assert.deepEqual(proof.owners,[...prior.owners,path]);assert.equal(proof.owners.length,46);
});
test('all advertised historical targets restore Effects target group from LF and CRLF without rewriting originals',()=>{
 for(const [target,record]of Object.entries(proof.targets)){
  const expected=record.files[path]?.source??raw(path);
  for(const source of [raw(path),raw(path).replaceAll('\n','\r\n')])assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource:raw}),expected,target);
  let reads=0;const original=record.files[path]?.source;
  assert.equal(sourceEpoch.preCombinedSource(path,original,{target,readSource(){reads++;throw Error('unexpected read');}}),original);assert.equal(reads,0);
 }
});
test('current facade retains exact config identity and rechecks all 46 owners after warm success',()=>{
 const file='config/architecture.json',source=raw(file),target='actor';
 let calls=0;assert.equal(sourceEpoch.preCombinedSource(file,source,{target,readSource:p=>{calls++;return raw(p);}}),proof.targets.actor.files[file].source);assert.equal(calls,46);
 for(const owner of proof.owners){
  let bad=false;const readSource=p=>bad&&p===owner?raw(p)+'\n':raw(p);
  sourceEpoch.preCombinedSource(file,source,{target,readSource});bad=true;
  assert.throws(()=>sourceEpoch.preCombinedSource(file,source,{target,readSource}),/linked owner identity/,owner);
  assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target:'effectsTargetGroupPrior',readSource:p=>p===owner?null:raw(p)}),/linked owner identity/,owner);
 }
});
test('foreign bytes never authorize reads and composed readers preserve explicit raw reader ownership',()=>{
 for(const target of Object.keys(proof.targets))for(const source of [raw(path)+'\n',raw(path).slice(1),null,undefined,{},17]){
  let reads=0;assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource(){reads++;throw Error('unexpected read');}}),source);assert.equal(reads,0);
 }
 const reader=sourceEpoch.combinedReader(raw,'effectsTargetGroupPrior');assert.equal(reader(path),prior.current[path].source);
 assert.equal(sourceEpoch.combinedReader(reader,'effectsTargetGroupPrior'),reader);
 const retargeted=sourceEpoch.combinedReader(reader,'actor');assert.equal(retargeted(path),proof.targets.actor.files[path].source);
 assert.throws(()=>sourceEpoch.combinedReader(null,'actor'),/reader/);
});
test('isolated authenticated helper closure retains the exact Effects target group epoch and rejects owner drift',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'silent-epoch-closure-'));
 try{
  copyIntegrationSourceClosure(directory);
  const isolated=(await import(pathToFileURL(join(directory,'tests/helpers/combined-epoch/pre-defect-source-epoch.mjs')).href)).standaloneEffectsTargetGroupEpoch;
  assert.deepEqual(isolated.proof,proof);
  assert.equal(isolated.preCombinedSource(path,raw(path),{target:'effectsTargetGroupPrior',readSource:raw}),prior.current[path].source);
  assert.throws(()=>isolated.preCombinedSource(path,raw(path),{target:'effectsTargetGroupPrior',readSource:p=>p===path?raw(p)+'\n':raw(p)}),/linked owner identity/);
 }finally{rmSync(directory,{recursive:true,force:true});}
});


test('unknown source targets are rejected rather than gaining an identity fallback',()=>{
 for(const target of ['unknown','',undefined,null]){
  assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target,readSource:raw}),/unknown source target/);
  assert.throws(()=>sourceEpoch.combinedReader(raw,target)(path),/unknown source target/);
 }
});

test('configuration layout admission preserves exact tokens and freshly authenticates all 46 current raw owners',async()=>{
 const {standaloneEffectsTargetGroupEpoch:sourceEpoch}=await import('./helpers/combined-epoch/pre-defect-source-epoch.mjs');
 const proof=sourceEpoch.proof,path='config/architecture.json',source=proof.current[path].source;
 const raw=p=>proof.current[p]?.source??null,expected=proof.targets.actor.files[path].source;
 assert.equal(proof.owners.length,46);
 const layouts=[JSON.stringify(JSON.parse(source)),JSON.stringify(JSON.parse(source),null,'\t'),source+'\n\t '];
 for(const input of layouts){
  let calls=0;assert.equal(sourceEpoch.preCombinedSource(path,input,{target:'actor',readSource:p=>{calls++;return raw(p);}}),expected);
  assert.equal(calls,46);
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

// Combined published stack is checked separately from the three frozen siblings.
test('published Flow Silent and Effects stack retains all predecessor bindings and authenticates 48 raw owners',async()=>{
 const {preRelicEquipEpoch:combined,standaloneWatcherFlowEpoch:flow,standaloneSilentTacticsEpoch:silent,standaloneEffectsTargetGroupEpoch:effects}=await import('./helpers/combined-epoch/pre-defect-source-epoch.mjs');
 const proof=combined.proof,raw=p=>proof.current[p]?.source??null;
 const changed=['src/lua/abyss_watcher_flow_cards.lua','src/lua/abyss_silent_tactics_cards.lua','src/lua/abyss_effects.lua'];
 assert.equal(proof.owners.length,48);assert.equal(new Set(proof.owners).size,48);
 assert.equal(proof.currentTreeCommitted,false);
 assert.equal(proof.currentCommit,preEffectsTargetGroupEpoch.proof.currentCommit);
 for(const [file,standalone]of changed.map((file,i)=>[file,[flow,silent,effects][i]])){
  assert.deepEqual(proof.current[file],standalone.proof.current[file]);
  assert.equal(raw(file),readFileSync(file,'utf8').replaceAll('\r\n','\n'));
 }
 for(const [name,target]of Object.entries(preEffectsTargetGroupEpoch.proof.targets))assert.deepEqual(proof.targets[name],target);
 for(const [file,binding]of Object.entries(preEffectsTargetGroupEpoch.proof.current))if(!changed.includes(file))assert.deepEqual(proof.current[file],binding);
 for(const [target,record]of Object.entries(proof.targets))for(const file of changed){
  const expected=record.files[file]?.source??raw(file);
  for(const input of [raw(file),raw(file).replaceAll('\n','\r\n')])assert.equal(combined.preCombinedSource(file,input,{target,readSource:raw}),record.files[file]?.sha256===proof.current[file]?.sha256?input:expected);
 }
 const file='config/architecture.json',input=JSON.stringify(JSON.parse(raw(file)));
 let calls=0;assert.equal(combined.preCombinedSource(file,input,{target:'actor',readSource:p=>{calls++;return raw(p);}}),proof.targets.actor.files[file].source);assert.equal(calls,48);
 for(const owner of proof.owners){
  let drift=false;const reader=p=>drift&&p===owner?raw(p)+'\n':raw(p);
  combined.preCombinedSource(file,input,{target:'actor',readSource:reader});drift=true;
  assert.throws(()=>combined.preCombinedSource(file,input,{target:'actor',readSource:reader}),/linked owner identity/,owner);
  assert.throws(()=>combined.preCombinedSource(file,input,{target:'actor',readSource:p=>p===owner?null:raw(p)}),/linked owner identity/,owner);
 }
});

test('combined outer stack keeps foreign bytes non-authorizing and rejects invalid readers and unknown targets',async()=>{
 const {preRelicEquipEpoch:combined}=await import('./helpers/combined-epoch/pre-defect-source-epoch.mjs');
 const proof=combined.proof,raw=p=>proof.current[p]?.source??null;
 for(const path of ['src/lua/abyss_watcher_flow_cards.lua','src/lua/abyss_silent_tactics_cards.lua','src/lua/abyss_effects.lua']){
  for(const target of Object.keys(proof.targets))for(const source of ['foreign source',null,{},17])for(const readSource of [null,false,0,{}])assert.equal(combined.preCombinedSource(path,source,{target,readSource}),source);
  for(const target of ['unknown','',undefined,null]){
   assert.throws(()=>combined.preCombinedSource(path,raw(path),{target,readSource:raw}),/unknown source target/);
   assert.throws(()=>combined.combinedReader(raw,target),/unknown source target/);
  }
  const reader=combined.combinedReader(raw,'actor');assert.equal(reader(path),proof.targets.actor.files[path].source);
  assert.equal(combined.combinedReader(reader,'actor'),reader);
  const next=combined.combinedReader(reader,'effectsTargetGroupPrior');assert.equal(next(path),proof.targets.effectsTargetGroupPrior.files[path].source);
 }
 const path='config/architecture.json',source=raw(path);
 const layouts=[JSON.stringify(JSON.parse(source)),JSON.stringify(JSON.parse(source),null,'\t'),source+'\n\t '];
 for(const input of layouts){
  assert.throws(()=>combined.preCombinedSource(path,input,{target:'actor',readSource:null}),/reader/);
  assert.throws(()=>combined.preCombinedSource(path,input,{target:'actor',readSource:p=>p===path?input:raw(p)}),/linked owner identity/);
 }
 const variants=[source.replace('"layers"','"layers": {}, "layers"'),source.replace('"layers"','"laye\\u0072s"'),JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(source)).reverse())),'\ufeff'+source,source+'-- invalid',source+'\u00a0'];
 for(const input of variants){let calls=0;assert.equal(combined.preCombinedSource(path,input,{target:'actor',readSource(){calls++;throw Error('unexpected');}}),input);assert.equal(calls,0);}
});

test('isolated complete combined helper closure uses all three published owners with no live fallback',async()=>{
 const {preRelicEquipEpoch:combined}=await import('./helpers/combined-epoch/pre-defect-source-epoch.mjs');
 const directory=mkdtempSync(join(tmpdir(),'published-combined-closure-'));
 try{
  copyIntegrationSourceClosure(directory);
  const isolated=(await import(pathToFileURL(join(directory,'tests/helpers/combined-epoch/pre-defect-source-epoch.mjs')).href)).preRelicEquipEpoch;
  assert.deepEqual(isolated.proof,combined.proof);
  const raw=p=>isolated.proof.current[p]?.source??null;
  for(const file of ['src/lua/abyss_watcher_flow_cards.lua','src/lua/abyss_silent_tactics_cards.lua','src/lua/abyss_effects.lua']){
   assert.equal(isolated.preCombinedSource(file,raw(file),{target:'actor',readSource:raw}),isolated.proof.targets.actor.files[file].source);
   assert.throws(()=>isolated.preCombinedSource(file,raw(file),{target:'actor',readSource:p=>p===file?null:raw(p)}),/linked owner identity/);
  }
 }finally{rmSync(directory,{recursive:true,force:true});}
});
