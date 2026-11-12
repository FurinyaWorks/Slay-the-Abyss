import {preDefectActorSource} from './helpers/defect-actor-source-epoch.mjs';
import {originalPlanningSource} from './helpers/ci-complete-calibration-source-inverse.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {preDefectIntegrationPlanningSource as parent,defectOnlyPlanningSource as utility,defectIntegrationPlanningProof as proof} from './helpers/defect-integration-planning-source-inverse.mjs';
import {preDefectUtilityPlanningSource,defectUtilityPlanningProof,defectUtilityPlanningKey,defectUtilityPlanningFloor} from './helpers/defect-utility-planning-source-inverse.mjs';
import {preEnemyIntegrationPlanningSource,enemyIntegrationPlanningProof} from './helpers/enemy-integration-planning-source-inverse.mjs';
import {preCurrentCiPlacementSource,preCiCompleteCalibrationSource,ciCompleteCalibrationProof} from './helpers/ci-complete-calibration-source-inverse.mjs';
import {preM7FinalSource} from './helpers/m7-core-final-source-inverse.mjs';
import {preDefectUtilitySource,defectUtilitySourceProof} from './helpers/defect-utility-source-inverse.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const path=proof.path,current=originalPlanningSource(path,read(path),'seven');

test('combined planning authenticates both exact preserved parents without accepting unrelated source changes',()=>{
 assert.equal(hash(current),proof.combinedSha256);
 for(const input of [current,current.replaceAll('\n','\r\n')]){
  assert.equal(hash(parent(path,input)),proof.parentSha256);
  assert.equal(hash(utility(path,input)),proof.utilitySha256);
  assert.equal(hash(parent(path,input)),enemyIntegrationPlanningProof.combinedSha256);
  assert.equal(hash(utility(path,input)),defectUtilityPlanningProof.afterSha256);
  assert.equal(hash(preEnemyIntegrationPlanningSource(path,parent(path,input))),enemyIntegrationPlanningProof.parentSha256);
  assert.equal(hash(preDefectUtilityPlanningSource(path,utility(path,input))),defectUtilityPlanningProof.beforeSha256);
  for(const source of [input,parent(path,input),utility(path,input)]){
   assert.equal(preCurrentCiPlacementSource(path,source),ciCompleteCalibrationProof.files[path].afterSource);
   assert.equal(preCiCompleteCalibrationSource(path,source),ciCompleteCalibrationProof.files[path].beforeSource);
  }
 }
});

test('the only difference from the six-slice cost inventory is the authenticated utility floor',()=>{
 const actual=JSON.parse(current),before=JSON.parse(parent(path,current));
 assert.equal(Object.keys(actual.jsPlanning.localLowerBounds).length,13);
 assert.equal(Object.keys(before.jsPlanning.localLowerBounds).length,12);
 assert.deepEqual(actual.jsPlanning.localLowerBounds[defectUtilityPlanningKey],defectUtilityPlanningFloor);
 delete actual.jsPlanning.localLowerBounds[defectUtilityPlanningKey];assert.deepEqual(actual,before);
});

test('combined epoch fails closed on fragments, duplicates, foreign paths, nonstrings and independent mutations',()=>{
 const mutants=[current+'\n',current.slice(1),current+current,current.replace('"durationMs": 20000','"durationMs": 19999'),
  current.replace('"durationMs": 30000','"durationMs": 29999'),current.replace('"unknownJsMs": 10000','"unknownJsMs": 9999'),
  current.replace('"conclusion": "failure"','"conclusion": "success"'),current.replace('"unknownJsMs": 10000','"unknownJsMs": 10000,\n  "unknownJsMs": 10000')];
 for(const input of mutants){
  assert.notEqual(input,current);
  for(const project of [parent,utility,preCurrentCiPlacementSource,preCiCompleteCalibrationSource])assert.equal(project(path,input),input);
 }
 for(const input of [undefined,null,{},42,parent(path,current),utility(path,current)])for(const project of [parent,utility])assert.equal(project(path,input),input);
 for(const foreign of ['foreign','scripts/ci-quality-shape.mjs'])for(const project of [parent,utility])assert.equal(project(foreign,current),current);
});

test('utility production inverse composes with the current M7 source chain without live owner reads',()=>{
 const p=defectUtilitySourceProof.path,source=preDefectActorSource(p,read(p)),before=read('tests/fixtures/defect-utility-planning-before.lua');
 const fail=()=>assert.fail('standalone utility has no linked owner permission');
 for(const input of [source,source.replaceAll('\n','\r\n')]){
  assert.equal(preDefectUtilitySource(p,input),before);
  assert.equal(preM7FinalSource(p,input,{readSource:fail}),before);
 }
 for(const input of [source+'\n',source.slice(1),undefined,null,{},42])assert.equal(preM7FinalSource(p,input,{readSource:fail}),input);
 assert.equal(preM7FinalSource('foreign',source,{readSource:fail}),source);
});

import {defectActorEpoch,extendDefectActorEpoch} from './helpers/defect-actor-source-epoch.mjs';
import {sourceEpoch as actorCurrentEpoch,preDefectActorEpoch} from './helpers/combined-epoch/source-epoch.mjs';
const actorProof=defectActorEpoch.proof;
const actorPaths=['config/architecture.json','src/lua/abyss_combat_queued_play.lua','src/lua/abyss_defect_utility_cards.lua'];
const actorRaw=p=>actorProof.current[p]?.source??null;
test('Actor capability predecessor binds all three complete owners to independent 6a614fc Git blobs',()=>{
 const blobs={
  'config/architecture.json':'3b79effde6d5cd59a502ecc32982dd98be1f24b6',
  'src/lua/abyss_combat_queued_play.lua':'d4fda1b3cc44b4a88a9f01fedc11c3e8716e66da',
  'src/lua/abyss_defect_utility_cards.lua':'414d1f260d3a617eb06b4caadfbef013296f1a70'
 };
 assert.deepEqual(actorProof.owners,actorPaths);
 assert.deepEqual(Object.keys(actorProof.current),actorPaths);
 assert.equal(actorProof.targets.prior.commit,'6a614fc82697750ddb408750e54f59f801c24f1e');
 for(const p of actorPaths){
  const old=actorProof.targets.prior.files[p];
  assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(old.source)}\0`).update(old.source).digest('hex'),blobs[p]);
  assert.deepEqual(old,preDefectActorEpoch.proof.current[p]);
  assert.equal(actorRaw(p),read(p));
 }
});
test('Actor capability extends the complete 79-owner epoch without replacing a historical binding',()=>{
 const current=actorCurrentEpoch.proof,prior=preDefectActorEpoch.proof;
 assert.deepEqual(current.owners,prior.owners);assert.equal(current.owners.length,79);
 assert.deepEqual(current.targets.defectActorPrior.files,prior.current);
 for(const [target,binding]of Object.entries(prior.targets))assert.deepEqual(current.targets[target],binding,target);
 for(const [p,binding]of Object.entries(prior.current))assert.deepEqual(current.current[p],actorProof.current[p]??binding,p);
 assert.equal(current.currentTreeCommitted,false);
 assert.equal(current.defectActorCollectedBaseCommit,actorProof.targets.prior.commit);
 for(const key of ['source','sha256','gitBlob','rawGitBlob','mode']){
  const altered=structuredClone(prior);altered.current[actorPaths[1]][key]='foreign';
  assert.throws(()=>extendDefectActorEpoch({...preDefectActorEpoch,proof:altered}),/authenticated predecessor/,key);
 }
});
test('new capability sources require fresh three-owner permission before the old standalone Utility inverse',()=>{
 const p=defectUtilitySourceProof.path,source=actorRaw(p),old=actorProof.targets.prior.files[p].source;
 assert.equal(preDefectUtilitySource(p,source),source,'old single-source contract cannot admit the new ABI');
 assert.equal(preDefectUtilitySource(p,preDefectActorSource(p,source,{readSource:actorRaw})),beforeUtility());
 const fail=()=>assert.fail('old standalone source must not gain linked owner reads');
 assert.equal(preM7FinalSource(p,old,{readSource:fail}),beforeUtility());
 for(const readSource of [null,false,0,{},[]]){
  assert.throws(()=>preDefectActorSource(p,source,{readSource}),/reader/);
  assert.throws(()=>preM7FinalSource(p,source,{readSource}),/reader/);
 }
 for(const candidate of [source,source.replaceAll('\n','\r\n')])for(const bad of actorPaths){
  let drift=false,reads=[];const reader=q=>{reads.push(q);return drift&&q===bad?actorRaw(q)+'\n':actorRaw(q);};
  assert.equal(preDefectActorSource(p,candidate,{readSource:reader}),old);assert.deepEqual(reads,actorPaths);
  drift=true;assert.throws(()=>preDefectActorSource(p,candidate,{readSource:reader}),/linked owner identity/);
  for(const value of [null,undefined,{},false,17,Buffer.from(actorRaw(bad))])
   assert.throws(()=>preDefectActorSource(p,candidate,{readSource:q=>q===bad?value:actorRaw(q)}),/linked owner identity/);
  assert.throws(()=>preDefectActorSource(p,candidate,{readSource:q=>{if(q===bad)throw Error('missing');return actorRaw(q);}}),/linked owner missing/);
 }
});
function beforeUtility(){return read('tests/fixtures/defect-utility-planning-before.lua');}
test('foreign capability source bytes cannot trigger reader calls or hide unknown targets',()=>{
 for(const p of actorPaths)for(const source of [actorRaw(p)+(p==='config/architecture.json'?'-- foreign':'\n'),actorRaw(p).slice(1),actorRaw(p)+actorRaw(p),null,undefined,{},17]){
  let calls=0;const readSource=()=>{calls++;throw Error('must not read');};
  assert.equal(preDefectActorSource(p,source,{readSource}),source);assert.equal(calls,0);
  for(const target of ['unknown','',null,undefined,'__proto__'])
   assert.throws(()=>actorCurrentEpoch.preCombinedSource(p,source,{target,readSource:null}),/unknown source target/);
 }
 const source=actorRaw(actorPaths[1]);let calls=0;
 assert.equal(preDefectActorSource('foreign/'+actorPaths[1],source,{readSource:()=>{calls++;}}),source);assert.equal(calls,0);
});
test('the full current facade freshly checks every original owner including after warm success',()=>{
 const epoch=actorCurrentEpoch,proof=epoch.proof,p=actorPaths[0],source=read(p);
 const actual=Object.fromEntries(proof.owners.map(q=>[q,read(q)]));let bad,value,reads=[];
 const reader=q=>{reads.push(q);if(q===bad){if(value instanceof Error)throw value;return value;}return actual[q];};
 const project=()=>epoch.preCombinedSource(p,source,{target:'develop',readSource:reader});
 const expected=proof.targets.develop.files[p].source;
 assert.equal(project(),expected);assert.deepEqual(reads,proof.owners);
 for(const owner of proof.owners)for(value of [actual[owner]+'\n',null,new Error('unavailable')]){
  bad=owner;reads=[];assert.throws(project,/combined linked owner/);assert.deepEqual(reads,proof.owners.slice(0,proof.owners.indexOf(owner)+1));
  bad=undefined;reads=[];assert.equal(project(),expected);assert.deepEqual(reads,proof.owners);
 }
});
test('capability config layout accepts only an input spelling and still binds exact raw owners',()=>{
 const p=actorPaths[0],source=actorRaw(p),old=actorProof.targets.prior.files[p].source;
 for(const layout of [JSON.stringify(JSON.parse(source)),JSON.stringify(JSON.parse(source),null,'\t'),source+'\n\t']){
  assert.equal(preDefectActorSource(p,layout,{readSource:actorRaw}),old);
  assert.throws(()=>preDefectActorSource(p,layout,{readSource:q=>q===p?layout:actorRaw(q)}),/linked owner identity/);
 }
 for(const foreign of [source.replace('"layers"','"layers":{},"layers"'),source.replace('"layers"','"laye\\u0072s"'),source+'-- bad','\ufeff'+source]){
  let calls=0;assert.equal(preDefectActorSource(p,foreign,{readSource:()=>{calls++;}}),foreign);assert.equal(calls,0);
 }
});

import {m7FinalReader} from './helpers/m7-core-final-source-inverse.mjs';
import {classPotionWatcherSourceProof} from './helpers/class-potion-watcher-source-inverse.mjs';
test('M7 live and explicit current readers preserve the queued historical capability chain',()=>{
 const p=actorPaths[1],source=read(p),expected=classPotionWatcherSourceProof[p].beforeSha256;
 assert.equal(hash(preM7FinalSource(p,source)),expected);
 assert.equal(hash(m7FinalReader()(p)),expected);
 const raw=q=>actorCurrentEpoch.proof.current[q]?.source??null;
 for(const input of [source,source.replaceAll('\n','\r\n')])assert.equal(hash(preM7FinalSource(p,input,{readSource:raw})),expected);
 assert.equal(hash(m7FinalReader(raw)(p)),expected);
 const fail=()=>assert.fail('foreign queued input cannot authorize owner reads');
 for(const input of [source+'\n',source.slice(1),source+source,null,undefined,{},17])
  assert.equal(preM7FinalSource(p,input,{readSource:fail}),input);
 assert.equal(preM7FinalSource('foreign/'+p,source,{readSource:fail}),source);
 for(const readSource of [null,false,0,{},[]])assert.throws(()=>preM7FinalSource(p,source,{readSource}),/reader/);
 const config=actorPaths[0];
 assert.equal(preM7FinalSource(config,read(config)),actorCurrentEpoch.proof.targets.develop.files[config].source);
});
test('M7 queued capability authenticates all 79 current owners freshly after warm success',()=>{
 const p=actorPaths[1],source=read(p),proof=actorCurrentEpoch.proof;
 const expected=classPotionWatcherSourceProof[p].beforeSha256;
 let bad,value,reads=[];
 const reader=q=>{reads.push(q);if(q===bad){if(value instanceof Error)throw value;return value;}return proof.current[q]?.source??null;};
 const project=()=>preM7FinalSource(p,source,{readSource:reader});
 assert.equal(hash(project()),expected);
 for(const owner of proof.owners){
  assert(reads.includes(owner),'successful projection freshly reads '+owner);
  for(value of [(proof.current[owner]?.source??'')+'\n',null,new Error('missing')]){
   bad=owner;reads=[];assert.throws(project,/combined linked owner/);assert(reads.includes(owner),owner);
  }
  bad=undefined;reads=[];assert.equal(hash(project()),expected);
 }
});
