// Pure complete-byte integration epoch. All prior floors and helpers stay frozen.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {enemyAiPlanningKey,enemyAiPlanningFloor} from './enemy-ai-planning-source-inverse.mjs';
import {watcherPlanningKey,watcherPlanningFloor} from './watcher-planning-source-inverse.mjs';
import {classPotionPlanningKey,classPotionPlanningFloor} from './class-potion-planning-source-inverse.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
export const enemyIntegrationPlanningProof=Object.freeze({
 path:'scripts/ci-test-timings.json',
 combinedSha256:'af9781fd580e38f8fd61a452b5e69be9942d1d270febb0833449214b94d28747',
 parentSha256:'4f737b7c4391304e0a16f68b7b81c35747b5c57578702ba5899f91042109fd64',
 enemySha256:'2030a7b180492df2710854a5b050f7b4f9f4b808ba2b3672cffc30b36a6db2cb',
});
function project(path,source,target){
 const proof=enemyIntegrationPlanningProof;
 if(path!==proof.path||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==proof.combinedSha256)return source;
 const value=JSON.parse(source);
 for(const [key,floor]of [[enemyAiPlanningKey,enemyAiPlanningFloor],[watcherPlanningKey,watcherPlanningFloor],[classPotionPlanningKey,classPotionPlanningFloor]])
  assert.deepEqual(value.jsPlanning.localLowerBounds[key],floor);
 for(const key of target==='parent'?[enemyAiPlanningKey]:[watcherPlanningKey,classPotionPlanningKey])delete value.jsPlanning.localLowerBounds[key];
 const previous=JSON.stringify(value,null,2)+'\n';
 assert.equal(hash(previous),target==='parent'?proof.parentSha256:proof.enemySha256,'complete input epoch bytes');
 return previous;
}
export const preEnemyIntegrationPlanningSource=(path,source)=>project(path,source,'parent');
export const enemyOnlyPlanningSource=(path,source)=>project(path,source,'enemy');
