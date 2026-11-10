import {preEmeraldCostSource} from './helpers/map-optimized-cost-source-inverse.mjs';
import {preEmeraldMapCiSource as originalPreEmeraldMapCiSource} from './helpers/map-emerald-ci-source-inverse.mjs';
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
const path=proof.path,current=originalPlanningSource(path,preEmeraldMapCiSource(path,read(path)),'seven');

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
 const p=defectUtilitySourceProof.path,source=read(p),before=read('tests/fixtures/defect-utility-planning-before.lua');
 const fail=()=>assert.fail('standalone utility has no linked owner permission');
 for(const input of [source,source.replaceAll('\n','\r\n')]){
  assert.equal(preDefectUtilitySource(p,input),before);
  assert.equal(preM7FinalSource(p,input,{readSource:fail}),before);
 }
 for(const input of [source+'\n',source.slice(1),undefined,null,{},42])assert.equal(preM7FinalSource(p,input,{readSource:fail}),input);
 assert.equal(preM7FinalSource('foreign',source,{readSource:fail}),source);
});

// Preserve the complete original Emerald/historical assertions behind one exact registration boundary.
function preEmeraldMapCiSource(path,source){return originalPreEmeraldMapCiSource(path,preEmeraldCostSource(path,source));}
