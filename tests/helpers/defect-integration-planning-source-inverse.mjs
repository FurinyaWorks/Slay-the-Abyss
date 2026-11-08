// Complete-byte seven-slice planning epoch; original input proofs remain frozen.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {defectUtilityPlanningKey,defectUtilityPlanningFloor} from './defect-utility-planning-source-inverse.mjs';
import {enemyAiPlanningKey,enemyAiPlanningFloor} from './enemy-ai-planning-source-inverse.mjs';
import {watcherPlanningKey,watcherPlanningFloor} from './watcher-planning-source-inverse.mjs';
import {classPotionPlanningKey,classPotionPlanningFloor} from './class-potion-planning-source-inverse.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
export const defectIntegrationPlanningProof=Object.freeze({
 path:'scripts/ci-test-timings.json',
 combinedSha256:'fdbe17987d4a07a9de1ee3c4ce3ed9c4d9b4a6bb667e06def5ffc4e0002ebde5',
 parentSha256:'af9781fd580e38f8fd61a452b5e69be9942d1d270febb0833449214b94d28747',
 utilitySha256:'28a6d1317385181b00c89b11efea2598c3a06ce72cde7b5b61562c139910254c',
});
function project(path,source,target){
 const proof=defectIntegrationPlanningProof;
 if(path!==proof.path||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==proof.combinedSha256)return source;
 const value=JSON.parse(source);
 for(const [key,floor]of [[defectUtilityPlanningKey,defectUtilityPlanningFloor],[enemyAiPlanningKey,enemyAiPlanningFloor],[watcherPlanningKey,watcherPlanningFloor],[classPotionPlanningKey,classPotionPlanningFloor]])
  assert.deepEqual(value.jsPlanning.localLowerBounds[key],floor);
 for(const key of target==='parent'?[defectUtilityPlanningKey]:[enemyAiPlanningKey,watcherPlanningKey,classPotionPlanningKey])delete value.jsPlanning.localLowerBounds[key];
 const previous=JSON.stringify(value,null,2)+'\n';
 assert.equal(hash(previous),target==='parent'?proof.parentSha256:proof.utilitySha256,'complete input epoch bytes');
 return previous;
}
export const preDefectIntegrationPlanningSource=(path,source)=>project(path,source,'parent');
export const defectOnlyPlanningSource=(path,source)=>project(path,source,'utility');
