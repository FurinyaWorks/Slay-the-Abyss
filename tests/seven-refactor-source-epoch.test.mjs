import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
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
  const source=read('config/architecture.json')+'\n-- foreign';let calls=0;
  assert.equal(sourceEpoch.preCombinedSource('config/architecture.json',source,{target,readSource(){calls++;throw Error('unexpected');}}),source);
  assert.equal(calls,0,target);
 }
});

test('facades preserve original invalid-reader semantics while public reader factories remain strict',async()=>{
 const cases=[['actor-presence','preActorPresenceSource'],['potion-callback','prePotionCallbackSource'],['reward-query-boundary','preRewardQueryBoundarySource'],['m7-core-final','preM7FinalSource'],['core-lifecycle','preCoreLifecycleSource'],['game-ui-extraction','preGameUiExtractionSource'],['power-shop','prePowerShopSource'],['session-reward','preSessionRewardSource'],['watcher-final-execution','preWatcherExecutionSource'],['inventory-responsibilities','preInventoryResponsibilitiesSource'],['act1-choice','preAct1ChoiceSource'],['defect-plan','preDefectPlanSource'],['colorless-catalog','preColorlessCatalogSource'],['end-turn-responsibilities','preEndTurnResponsibilitiesSource']];
 const targets={'actor-presence':'actor','potion-callback':'potion','reward-query-boundary':'reward','power-shop':'powerShop','session-reward':'sessionReward','watcher-final-execution':'watcher','inventory-responsibilities':'inventory','act1-choice':'act1','defect-plan':'defect','colorless-catalog':'colorless','end-turn-responsibilities':'endTurn'};
 for(const [file,name]of cases){
  const original=(await import(`./helpers/epochs/${targets[file]??'develop'}/tests/helpers/${file}-source-inverse.mjs`))[name];
  const project=(await import(`./helpers/${file}-source-inverse.mjs`))[name];
  for(const source of ['unrecognized bytes',null,{},17])for(const readSource of [null,false,0,{}]){
   let failure;try{assert.equal(original('config/architecture.json',source,{readSource}),source);}catch(error){failure=error;}
   if(failure)assert.throws(()=>project('config/architecture.json',source,{readSource}),error=>error.name===failure.name&&error.message===failure.message,file);
   else assert.equal(project('config/architecture.json',source,{readSource}),source,file);
  }
 }
 const {sourceEpoch}=await import('./helpers/combined-epoch/source-epoch.mjs');
 assert.throws(()=>sourceEpoch.combinedReader(null,'actor'),/reader/);
});

test('configuration layout admission preserves exact tokens and freshly authenticates all 45 raw owners',async()=>{
 const {sourceEpoch}=await import('./helpers/combined-epoch/source-epoch.mjs');
 const proof=sourceEpoch.proof,path='config/architecture.json',source=proof.current[path].source;
 const raw=p=>proof.current[p]?.source??null,expected=proof.targets.actor.files[path].source;
 assert.equal(proof.owners.length,45);
 const layouts=[JSON.stringify(JSON.parse(source)),JSON.stringify(JSON.parse(source),null,'\t'),source+'\n\t '];
 for(const input of layouts){
  let calls=0;assert.equal(sourceEpoch.preCombinedSource(path,input,{target:'actor',readSource:p=>{calls++;return raw(p);}}),expected);
  assert.equal(calls,45);
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

test('configuration layout never repairs invalid number or keyword tokens',async()=>{
 const {createSourceEpochProjector}=await import('./helpers/combined-epoch/source-epoch-runtime.mjs');
 const path='config/architecture.json',source='{"count":12,"enabled":true,"offset":-2,"rate":1e2,"empty":null}\n';
 const bind=source=>({source,sha256:createHash('sha256').update(source).digest('hex')});
 const proof={schemaVersion:1,normalization:'LF',currentCommit:'a'.repeat(40),owners:[path],current:{[path]:bind(source)},
  targets:{prior:{commit:'b'.repeat(40),files:{[path]:bind('{}\n')}}}};
 const project=createSourceEpochProjector(proof,{allowConfigLayout:true});
 const layout=source.replaceAll(',',',\n\t').replaceAll(':',': ');
 let reads=0;const raw=()=>{reads++;return source;};
 assert.equal(project.preCombinedSource(path,layout,{target:'prior',readSource:raw}),'{}\n');assert.equal(reads,1);
 assert.throws(()=>project.preCombinedSource(path,layout,{target:'prior',readSource:()=>layout}),/linked owner identity/);
 for(const [before,after]of [['12','1 2'],['true','tr ue'],['-2','- 2'],['1e2','1e 2'],['null','nu ll']]){
  const malformed=source.replace(before,after);assert.throws(()=>JSON.parse(malformed),SyntaxError);
  reads=0;
  for(const readSource of [raw,null])assert.equal(project.preCombinedSource(path,malformed,{target:'prior',readSource}),malformed);
  assert.equal(reads,0,'invalid JSON cannot authorize linked reads: '+after);
 }
 const strict=createSourceEpochProjector(proof);reads=0;
 assert.equal(strict.preCombinedSource(path,layout,{target:'prior',readSource:raw}),layout);assert.equal(reads,0);
});
