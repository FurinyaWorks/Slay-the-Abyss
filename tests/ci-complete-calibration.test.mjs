import {preEncounterFormationCiSource,encounterFormationPlanningFloors,encounterFormationCiInventory} from './helpers/encounter-formation-ci-source-inverse.mjs';
import {prePosix15ShapeSource,posix15ShapeProof} from './helpers/posix15-shape-source-inverse.mjs';
import {preDefectFinalCiSource,defectFinalPlanningFloors} from './helpers/defect-final-ci-source-inverse.mjs';
import {preSilentFinalCiSource,silentFinalPlanningKey,silentFinalPlanningFloor,silentFinalSourcePlanningKey,silentFinalSourcePlanningFloor} from './helpers/silent-final-ci-source-inverse.mjs';
import {preRelicEquipCiSource,relicEquipPlanningKey,relicEquipPlanningFloor} from './helpers/relic-equip-ci-source-inverse.mjs';
import {preCombinedGateSource,preCombinedPlanningSource,preSilentTacticsPlanningSource,silentTacticsPlanningKey,silentTacticsPlanningFloor,preEffectsTargetGroupPlanningSource,effectsTargetGroupPlanningKey,effectsTargetGroupPlanningFloor} from './helpers/ci-complete-calibration-source-inverse.mjs';
import {gunzipSync} from 'node:zlib';
import {preWatcherFlowPlanningSource,watcherFlowPlanningKey,watcherFlowPlanningFloor,savedWatcherFlowPlanningFloor} from './helpers/ci-complete-calibration-source-inverse.mjs';
import {prePartialCasePlanningSource,partialCasePlanningFloors,originalPlanningSource,preGameUiLocalPlanningSource,gameUiLocalPlanningKey,gameUiLocalPlanningFloor} from './helpers/ci-complete-calibration-source-inverse.mjs';
import {ciEpoch} from './helpers/integration-ci-epochs.mjs';
import {potionCallbackFloorKey,verifiedPotionCallbackFloor,prePotionCallbackPlanningSource} from './helpers/potion-callback-planning.mjs';
import {endTurnFloorKey,verifiedEndTurnFloor} from './helpers/end-turn-planning.mjs';
import {prePresencePlanningSource,presencePlanningBefore} from './helpers/actor-presence-planning-source-inverse.mjs';
import {rewardQueryPlanningProof,preRewardQueryPlanningSource} from './helpers/reward-query-planning-source-inverse.mjs';
import {assertRewardQueryPlanningReceipt,assertRewardQueryPlanningProjection} from './helpers/reward-query-planning-contract.mjs';
import {runCatalogFloorKey,verifiedRunCatalogFloor} from './helpers/run-catalog-planning.mjs';
import {beforeExecutionTimeoutWorkflow} from './helpers/auto-merge-workflow.mjs';
import {preDefectIntegrationPlanningSource,defectOnlyPlanningSource,defectIntegrationPlanningProof} from './helpers/defect-integration-planning-source-inverse.mjs';
import {defectUtilityPlanningKey,defectUtilityPlanningFloor,defectUtilityPlanningProof,preDefectUtilityPlanningSource} from './helpers/defect-utility-planning-source-inverse.mjs';
import {preEnemyIntegrationPlanningSource,enemyOnlyPlanningSource,enemyIntegrationPlanningProof} from './helpers/enemy-integration-planning-source-inverse.mjs';
import {enemyAiPlanningKey,enemyAiPlanningFloor,enemyAiPlanningProof,preEnemyAiPlanningSource} from './helpers/enemy-ai-planning-source-inverse.mjs';
import {preWatcherPlanningSource,watcherPlanningKey,watcherPlanningFloor} from './helpers/watcher-planning-source-inverse.mjs';
import {preClassPotionPlanningSource,classPotionPlanningKey,classPotionPlanningFloor} from './helpers/class-potion-planning-source-inverse.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as diskReadFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ciCompleteCalibrationProof as proof,preCiCompleteCalibrationSource as project,preCurrentCiPlacementSource,prePosix14ShapeSource} from './helpers/ci-complete-calibration-source-inverse.mjs';
import {ciHostTimingProof,preCiHostTimingSource} from './helpers/ci-host-timing-source-inverse.mjs';
import {ciWindowsShapeProof,preCiWindowsShapeSource} from './helpers/ci-windows-shape-source-inverse.mjs';
import {preIntegrationSource} from './helpers/pr372-integration-source.mjs';
import {qualityShardMatrices as currentQualityShardMatrices,qualityShardJobs as currentQualityShardJobs} from '../scripts/ci-quality-shape.mjs';
import {currentFullQualityJobs} from '../scripts/verify-delivery.mjs';
import {discoverJs,partition,jsShard as currentJsShard,jsPlanningWeights as currentJsPlanningWeights,timings as actualCurrentTimings} from '../scripts/ci-shards.mjs';
import {shardLuaScripts} from '../scripts/test-lua.mjs';
// Existing receipt contracts retain exact pre-Formation and pre-Defect inputs. Current
// costs/inventory use live imports; the new outer tests below use raw disk bytes.
const rawReadFileSync=(file,encoding)=>{const value=diskReadFileSync(file,encoding);if(typeof value==='string')return preEncounterFormationCiSource(file,value);const text=value.toString('utf8'),prior=preEncounterFormationCiSource(file,text);return prior===text?value:Buffer.from(prior);};
const readFileSync=(file,encoding)=>{
 const raw=rawReadFileSync(file,encoding),text=typeof raw==='string'?raw:raw.toString('utf8');
 const prior=preDefectFinalCiSource(file,prePosix15ShapeSource(file,text));
 return typeof raw==='string'?prior:prior===text?raw:Buffer.from(prior);
};
const hash=s=>createHash('sha256').update(s).digest('hex'),read=p=>originalPlanningSource(p,readFileSync(p,'utf8').replaceAll('\r\n','\n'));
const currentTimings=actualCurrentTimings;
// Frozen 17/13 contracts retain their original complete shape and job identity.
const frozenShapeSource=prePosix14ShapeSource('scripts/ci-quality-shape.mjs',read('scripts/ci-quality-shape.mjs'));
const {qualityShardMatrices:frozenQualityShardMatrices,qualityShardJobs:frozenQualityShardJobs}=await import('data:text/javascript,'+encodeURIComponent(frozenShapeSource));
const frozenFullQualityJobs=['check','presentation','engineering-posix',...frozenQualityShardJobs,'impact','fast'];
const path='scripts/ci-test-timings.json',binding=proof.files[path],before=JSON.parse(binding.beforeSource),after=JSON.parse(binding.afterSource),e=proof.evidence;
// The three original contracts own the frozen 16/12 calibration, including its
// unmeasured files. Current placement is checked separately below.
const timings=after;
const placementTimings=ciEpoch('reward').timings;
const placementWeights=ciEpoch('reward').jsPlanningWeights,placementShard=ciEpoch('reward').jsShard;

const {qualityShardMatrices,qualityShardJobs}=await import('data:text/javascript,'+encodeURIComponent(proof.files['scripts/ci-quality-shape.mjs'].afterSource));
const historicalFullQualityJobs=['check','presentation','engineering-posix',...qualityShardJobs,'impact','fast'];
const jsPlanningWeights=(files,platform)=>Object.fromEntries(files.map(file=>[file,Math.max(timings.js[platform][file]??timings.unknownJsMs,timings.jsPlanning?.localLowerBounds?.[file]?.durationMs??0)]));
const jsShard=(files,value,platform)=>partition(files,value,jsPlanningWeights(files,platform),timings.unknownJsMs,Array.from({length:Number(value.split('/')[1])},(_,i)=>i===0?timings.initialMs[platform][0]:0));
const placementPath='docs/evidence/pr521-ci-placement-20261106.json',placementBytes=read(placementPath),placement=JSON.parse(placementBytes);
const floorPath='docs/evidence/pr521-run-max-planning-floor-20261106.json',floorBytes=read(floorPath),floorReceipt=JSON.parse(floorBytes),floorKey='tests/run-max-hp-config-inverse.test.mjs';
const localFloorPath='docs/evidence/power-shop-planning-20261107.json',localFloorBytes=read(localFloorPath),localFloorReceipt=JSON.parse(localFloorBytes),localFloorKey='tests/power-shop-boundaries.test.mjs';
// Added after the frozen #521 placement receipts. Never use these files to
// reconstruct historical shard assignments or invent historical measurements.
const encounterFormationJs=["tests/encounter-formation-responsibilities.test.mjs","tests/encounter-formation-complexity.test.mjs","tests/encounter-formation-source-epoch.test.mjs"];
const defectFinalJs=["tests/defect-final-execute.test.mjs","tests/defect-final-execute-complexity.test.mjs","tests/defect-final-source-epoch.test.mjs"];
const silentFinalJs=["tests/silent-final-apply.test.mjs","tests/silent-final-apply-complexity.test.mjs","tests/silent-final-source-epoch.test.mjs"];
const relicEquipJs=["tests/relic-equip-complexity.test.mjs","tests/relic-equip-responsibilities.test.mjs","tests/relic-equip-source-epoch.test.mjs"];
const postPlacementJs=[...encounterFormationJs,...defectFinalJs,...silentFinalJs,...relicEquipJs,"tests/act1-choice-responsibilities.test.mjs","tests/act3-ai-responsibilities.test.mjs","tests/actor-presence-source.test.mjs","tests/actor-presence.test.mjs","tests/card-capability-responsibilities.test.mjs","tests/class-potion-orb-boundary.test.mjs","tests/class-potion-orb-source-inverse.test.mjs","tests/colorless-catalog-source.test.mjs","tests/colorless-catalog.test.mjs","tests/defect-integration-source.test.mjs","tests/defect-plan-responsibilities.test.mjs","tests/defect-utility-planning.test.mjs","tests/effects-target-group-source-epoch.test.mjs","tests/effects-target-group.test.mjs","tests/end-turn-responsibilities.test.mjs","tests/enemy-ai-lifecycle.test.mjs","tests/game-build-modes.test.mjs","tests/integration-source-epoch.test.mjs","tests/intent-visibility-cache.test.mjs","tests/inventory-responsibilities.test.mjs","tests/lightweight-2d-profile.test.mjs","tests/lightweight-card-layout.test.mjs","tests/m7-core-final.test.mjs","tests/native-page-lifecycle.test.mjs","tests/portrait-paint-cache.test.mjs","tests/potion-callback-source.test.mjs","tests/potion-callback.test.mjs","tests/power-shop-boundaries.test.mjs","tests/pr-quality-evidence.test.mjs","tests/repository-costs.test.mjs","tests/reward-query-boundary-source.test.mjs","tests/reward-query-boundary.test.mjs","tests/run-catalog-responsibilities.test.mjs","tests/runtime-path-baseline.test.mjs","tests/scry-choice-responsibilities.test.mjs","tests/session-reward-capabilities.test.mjs","tests/session-reward-source-inverse.test.mjs","tests/seven-refactor-source-epoch.test.mjs","tests/shiv-turn-responsibilities.test.mjs","tests/silent-tactics-planning.test.mjs","tests/silent-tactics-source-epoch.test.mjs","tests/watcher-actor-boundary.test.mjs","tests/watcher-actor-source-inverse.test.mjs","tests/watcher-final-execution.test.mjs","tests/watcher-flow-planning.test.mjs","tests/watcher-flow-source-epoch.test.mjs","tests/watcher-potion-integration-source.test.mjs"].sort();
const postPlacementLua=["tests/lua/actor_presence_contract.lua","tests/lua/colorless_catalog_contract.lua","tests/lua/defect_utility_planning.lua","tests/lua/enemy_ai_lifecycle.lua","tests/lua/intent_visibility_cache.lua","tests/lua/potion_callback_contract.lua","tests/lua/silent_tactics_planning.lua","tests/lua/watcher_final_execution_boundaries.lua","tests/lua/watcher_flow_planning.lua"].sort();
// V25 tests have no rows in the frozen placement observations. Register the
// current files explicitly instead of letting discovery rewrite that inventory.
const currentV25Js=[
 'tests/evidence-native-junction.test.mjs',
 'tests/v25-battle-chrome.test.mjs',
 'tests/v25-battle-runtime.test.mjs',
 'tests/v25-battle-scene.test.mjs',
 'tests/v25-card-audit-inputs.test.mjs',
 'tests/v25-card-content-layout.test.mjs',
 'tests/v25-card-skin-integration.test.mjs',
 'tests/v25-card-surface-reuse.test.mjs',
 'tests/v25-card-surface.test.mjs',
 'tests/v25-card-templates.test.mjs',
 'tests/v25-character-layout.test.mjs',
 'tests/v25-layout.test.mjs',
 'tests/v25-map-layout.test.mjs',
 'tests/v25-map-return.test.mjs',
 'tests/v25-map-theme.test.mjs',
 'tests/v25-node-layout.test.mjs',
 'tests/v25-portrait-profile.test.mjs',
 'tests/v25-private-card-assets.test.mjs',
 'tests/v25-profile.test.mjs',
 'tests/v25-result-layout.test.mjs',
 'tests/v25-texture-runtime.test.mjs',
];
const componentAddedJs=['tests/enemy-name-stability.test.mjs',
 'tests/native-component-profile.test.mjs',
 'tests/component-lifecycle-benchmark.test.mjs','tests/component-portrait-diagnosis.test.mjs'];
const componentAddedLua=['tests/lua/v25_texture_runtime.lua','tests/lua/component_pages.lua',
 'tests/lua/native_card_art_image_capabilities.lua','tests/lua/component_content_retry.lua',
 'tests/lua/component_page_failures.lua'];
postPlacementJs.push(...currentV25Js,...componentAddedJs);postPlacementJs.sort();
postPlacementLua.push(...componentAddedLua);postPlacementLua.sort();
const currentLua=()=>readdirSync('tests/lua').filter(n=>n.endsWith('.lua')).map(n=>'tests/lua/'+n).sort();
const placementJs=()=>discoverJs().filter(file=>!postPlacementJs.includes(file));
const placementLua=()=>currentLua().filter(file=>!postPlacementLua.includes(file));
// These files were added after the frozen 725-file observations. They still
// belong to the current Full inventory and retain the unknown-file cost.
const postCalibrationJs=['tests/ci-complete-calibration.test.mjs','tests/native-ui-preview.test.mjs','tests/reference-ui-lab.test.mjs',
 'tests/actor-lifecycle.test.mjs','tests/actor-power-rules-boundary.test.mjs','tests/combat-lifecycle.test.mjs',
 'tests/core-lifecycle-complexity.test.mjs','tests/core-lifecycle-source-inverse.test.mjs',
 'tests/relic-query.test.mjs','tests/relic-query-architecture.test.mjs','tests/relic-query-source-inverse.test.mjs',
 'tests/purge-query.test.mjs','tests/purge-query-architecture.test.mjs',
 'tests/relic-lifecycle.test.mjs','tests/relic-lifecycle-boundary.test.mjs','tests/relic-lifecycle-mutations.test.mjs'].sort();
const postCalibrationLua=['tests/lua/actor_lifecycle.lua','tests/lua/actor_lifecycle_rules.lua','tests/lua/combat-lifecycle.lua',
 'tests/lua/relic_query_contract.lua','tests/lua/relic_query_rewards.lua','tests/lua/relic_query_cold_load.lua',
 'tests/lua/purge_query_contract.lua','tests/lua/purge_query_dynamic.lua','tests/lua/purge_query_cold_load.lua',
 'tests/lua/joust_event_slice_2.lua',
 ...['contracts','dynamic','fatal_guardian','fatal_native','fatal_orb','fatal_shared',
  'hooks_attacks','hooks_opening','hooks_turns','hp','rare','session','shop_early','shop_late','special',
  ...Array.from({length:9},(_,i)=>'parasite_'+String(i+1).padStart(2,'0')),
  ...Array.from({length:11},(_,i)=>'uncommon_'+String(i+1).padStart(2,'0'))]
  .map(group=>'tests/lua/relic_lifecycle_'+group+'.lua')].sort();

test('V25 tests stay outside frozen observations and each missing registration is rejected',()=>{
 const current=discoverJs(),v25=current.filter(file=>/^tests\/v25.*\.test\.mjs$/.test(file)||file==='tests/evidence-native-junction.test.mjs').sort();
 assert.deepEqual(v25,currentV25Js);
 const historical=placementJs();assert.equal(historical.length,placement.inventory.js);
 for(const file of currentV25Js){
  assert.ok(!historical.includes(file));
  for(const platform of ['win32','linux']){
   assert.equal(timings.js[platform][file],undefined,'V25 cannot acquire fabricated frozen observations');
   assert.equal(placementTimings.js[platform][file],undefined,'V25 cannot acquire a historical placement measurement');
  }
  const omitted=postPlacementJs.filter(value=>value!==file),contaminated=current.filter(value=>!omitted.includes(value));
  assert.throws(()=>assert.equal(contaminated.length,placement.inventory.js),'omitting any V25 registration must fail the original inventory contract');
 }
});

test('complete native successful rows authenticate every observed file and only raise effective placement costs',()=>{
 assert.equal(e.lockedObservationsSha256,'a80b5fe95fcfb0b4d5fedf839045100466423f3129c000ce2eef642cc31c421d');
 assert.equal(e.sourceHead,'41a99579e41ea685a1d71d9ce6e6e603839968db');assert.equal(e.groupHead,'8ba123b90ef176ad240c25154059597ec2c34b9b');
 assert.equal(e.sharedTree,'65f5bb53e19fd6055488b928865804e132285fc2');assert.equal(e.sourceRecords.length,46);
 const expected=structuredClone(before),observedJs=new Set(),raw=new Set();
 function authenticate(row,kind){
  const source=e.sourceRecords.find(s=>s.id===row.jobId&&s.runId===row.runId);assert.ok(source);
  assert.equal(row.logSha256,source.sha256);assert.match(row.logSha256,/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(row.line)&&row.line>0);
  assert.ok(Number.isFinite(row.durationMs)&&row.durationMs>0);
  const step=kind==='js'?source.jsStep:source.rawStep;assert.equal(step.status,'completed');assert.equal(step.conclusion,'success');
  const time=Date.parse(row.rawLine.split(' ')[0]);assert.ok(time>=Date.parse(step.started_at)&&time<Date.parse(step.completed_at)+1000,'outer completed-success step is authoritative');
  if(kind==='js'){
   assert.equal(row.platform,source.platform);assert.equal(row.success,true);
   const match=row.rawLine.match(/CI_FILE_TIMING (\{.*\})/);assert.ok(match);
   assert.deepEqual(JSON.parse(match[1]),{file:row.file,durationMs:row.durationMs,success:true});
  }else{
   assert.equal(source.platform,'win32');const match=row.rawLine.match(/Lua fixture ([^:]+): (\d+) ms/);assert.ok(match);
   assert.equal(match[1],row.file);assert.equal(Number(match[2]),row.durationMs);
  }
 }
 for(const row of e.observations.js){authenticate(row,'js');const key=[row.runId,row.platform,row.file].join(':');assert.ok(!observedJs.has(key));observedJs.add(key);
  expected.js[row.platform][row.file]=Math.max(expected.js[row.platform][row.file]??before.unknownJsMs,Math.ceil(row.durationMs));}
 for(const row of e.observations.lua){authenticate(row,'lua');const key=[row.runId,row.file].join(':');assert.ok(!raw.has(key));raw.add(key);
  expected.luaShard[row.file]=Math.max(expected.luaShard[row.file]??before.lua[row.file]??before.unknownLuaMs,Math.ceil(row.durationMs));}
 assert.equal(observedJs.size,2900);assert.equal(raw.size,2712);assert.equal(e.excludedEmbeddedLua,14);
 const inventory=placementJs(),originalJs=inventory.filter(p=>!postCalibrationJs.includes(p)).sort();assert.equal(originalJs.length,725);
 assert.deepEqual(inventory.filter(p=>postCalibrationJs.includes(p)).sort(),postCalibrationJs);
 for(const platform of ['win32','linux'])for(const file of postCalibrationJs){
  assert.equal(after.js[platform][file],undefined,'new tests must not acquire fabricated historical measurements');
  assert.equal(jsPlanningWeights(postCalibrationJs,platform)[file],after.unknownJsMs);
 }
 const observedLua=placementLua();
 const originalLua=observedLua.filter(p=>!postCalibrationLua.includes(p));assert.equal(originalLua.length,1356);
 assert.equal(observedLua.length,1356+postCalibrationLua.length);
 assert.deepEqual(observedLua.filter(p=>postCalibrationLua.includes(p)),postCalibrationLua);
 for(const file of postCalibrationLua){
  assert.equal(after.luaShard[file],undefined,'new fixtures must not acquire fabricated historical placement costs');
  assert.equal(after.lua[file],undefined,'new fixtures must not acquire fabricated historical worker safety');
 }
 for(const runId of [e.sourceRun,e.groupRun]){
  for(const platform of ['win32','linux'])assert.deepEqual(e.observations.js.filter(r=>r.runId===runId&&r.platform===platform).map(r=>r.file).sort(),originalJs);
   assert.deepEqual(e.observations.lua.filter(r=>r.runId===runId).map(r=>r.file).sort(),originalLua);
 }
 for(const key of ['jsCalibrationUpdates','luaShardCalibrationUpdates']){
  assert.deepEqual(after[key].slice(0,-1),before[key]);expected[key].push(after[key].at(-1));
 }
 assert.equal(JSON.stringify(expected,null,2)+'\n',binding.afterSource,'every other source value/order stays untouched');
 assert.equal(preCurrentCiPlacementSource(path,read(path)),binding.afterSource);assert.deepEqual(timings,after);
 assert.deepEqual(after.lua,before.lua);assert.deepEqual(after.initialMs,before.initialMs);
 assert.deepEqual(after.jsPlanning,before.jsPlanning);assert.equal(after.unknownJsMs,before.unknownJsMs);assert.equal(after.unknownLuaMs,before.unknownLuaMs);
 const luaBlock=s=>s.slice(s.indexOf('  "lua": {'),s.indexOf('  "jsSource":'));
 assert.equal(luaBlock(binding.afterSource),luaBlock(binding.beforeSource),'literal original safety map bytes unchanged');
});

test('only complete approved sources reverse 16/12 to 14/9 to 13/9 and new timing to d580 to original 8e epoch',()=>{
 for(const [path,b]of Object.entries(proof.files)){
  assert.equal(preCurrentCiPlacementSource(path,read(path)),b.afterSource);
  for(const source of [b.afterSource,b.afterSource.replaceAll('\n','\r\n')])assert.equal(project(path,source),b.beforeSource);
  const legacy=path.endsWith('.json')?preCiHostTimingSource(path,b.beforeSource):preCiWindowsShapeSource(path,b.beforeSource);
  assert.equal(legacy,path.endsWith('.json')?ciHostTimingProof.beforeSource:ciWindowsShapeProof.beforeSource);
  assert.equal(preIntegrationSource(path,b.afterSource,'base',{readSource(){assert.fail('CI projection must not read live owners');}}),legacy);
  for(const value of [b.beforeSource,null,{},undefined,17])assert.equal(project(path,value),value);
  for(const value of [b.afterSource+'\n',b.afterSource.slice(1),b.afterSource.replace('length:16','length:15'),b.afterSource.replace('length:12','length:9')].filter(v=>v!==b.afterSource)){
   assert.equal(project(path,value),value);assert.notEqual(hash(value),b.beforeSha256);
  }
  assert.equal(project('foreign',b.afterSource),b.afterSource);
 }
 const key='tests/game-ui-host-result.test.mjs',value=after.js.win32[key],entry=JSON.stringify(key)+': '+value;
 const at=binding.afterSource.indexOf('"kind": "complete-multi-run"');assert.ok(at>0);
 const prefix=binding.afterSource.slice(0,at),multi=binding.afterSource.slice(at);
 const sourceMetadataMutations=[multi.replace('"complete-multi-run"','"single-run"'),multi.replace('"runAttempt": 1','"runAttempt": 2'),multi.replace('"treeSha": "'+e.sharedTree+'"','"treeSha": "'+'f'.repeat(40)+'"'),multi.replace('"conclusion": "success"','"conclusion": "failure"')].map(s=>prefix+s);
 for(const altered of [binding.afterSource.replace(entry,JSON.stringify(key)+': '+(value+1)),binding.afterSource.replace(entry,entry+',\n      '+entry),binding.afterSource.replace(entry,JSON.stringify(key)+': '+value+'.0'),binding.afterSource.replace('"unknownJsMs": 10000','"unknownJsMs": 9999'),...sourceMetadataMutations]){
  assert.notEqual(altered,binding.afterSource);assert.equal(project(path,altered),altered);assert.notEqual(hash(altered),binding.beforeSha256);
 }
 assert.ok(Object.isFrozen(proof.files));assert.ok(Object.isFrozen(e.observations.lua[0]));
});

test('historical physical Windows16 POSIX12 Full33 covers final inventory under original budgets and unchanged setup reserve',()=>{
 assert.deepEqual(qualityShardMatrices.windows,Array.from({length:16},(_,i)=>i+1));assert.deepEqual(qualityShardMatrices.posix,Array.from({length:12},(_,i)=>i+1));
 const shape=proof.files['scripts/ci-quality-shape.mjs'];assert.equal(shape.afterSource,shape.beforeSource.replace('length:14','length:16').replace('length:9','length:12'));
 assert.equal(preCurrentCiPlacementSource('scripts/ci-quality-shape.mjs',read('scripts/ci-quality-shape.mjs')),shape.afterSource);assert.equal(qualityShardJobs.length,28);
 assert.deepEqual(historicalFullQualityJobs,['check','presentation','engineering-posix',...Array.from({length:16},(_,i)=>`rules (${i+1}/16)`),...Array.from({length:12},(_,i)=>`engineering-posix (${i+1}/12)`),'impact','fast']);
 assert.equal(historicalFullQualityJobs.length,33);assert.equal(new Set(historicalFullQualityJobs).size,33);
 const js=placementJs(),lua=placementLua();
 assert.equal(js.length,725+postCalibrationJs.length,'725 observed files plus every explicitly unmeasured new test');
 for(const [platform,count,budget]of [['win32',16,1800000],['linux',12,1200000]]){
  const loads=jsShard(js,`1/${count}`,platform).loads;
  const jsBins=Array.from({length:count},(_,i)=>jsShard(js,`${i+1}/${count}`,platform).files);
  assert.deepEqual(jsBins.flat().sort(),[...js].sort());assert.equal(new Set(jsBins.flat()).size,js.length);
  if(platform==='linux'){
   assert.ok(Math.max(...loads)+60000<budget,`POSIX JS-only max+60s=${Math.max(...loads)+60000} retains original twenty-minute budget`);
   continue;
  }
  const planning={...timings,windowsJsShardMs:loads};
  const bins=Array.from({length:count},(_,i)=>shardLuaScripts(lua,`${i+1}/${count}`,planning,2));
  assert.deepEqual(bins.flat().sort(),[...lua].sort());assert.equal(new Set(bins.flat()).size,lua.length);
  const cost=f=>timings.luaShard[f]??timings.lua[f]??timings.unknownLuaMs,safety=f=>timings.lua[f]??timings.unknownLuaMs;
  const combined=bins.map((bin,i)=>{const pool=[0,0];for(const f of bin.filter(f=>safety(f)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(f);
   return loads[i]+bin.filter(f=>safety(f)>=10000).reduce((s,f)=>s+cost(f),0)+Math.max(...pool);});
  assert.ok(Math.max(...combined)+60000<budget,`${platform} exact inventory max+60s=${Math.max(...combined)+60000} must retain original budget ${budget}`);
 }
 const workflow=beforeExecutionTimeoutWorkflow(read('.github/workflows/quality.yml'));assert.match(workflow,/max-parallel: 12/);assert.match(workflow,/timeout-minutes: 20/);assert.match(workflow,/local-special' && 75 \|\| 30/);
});

test('frozen Windows17 POSIX13 Full35 receipt covers its exact 741 JS and 1401 Lua files within unchanged budgets',()=>{
 assert.deepEqual(frozenQualityShardMatrices.windows,Array.from({length:17},(_,i)=>i+1));
 assert.deepEqual(frozenQualityShardMatrices.posix,Array.from({length:13},(_,i)=>i+1));
 assert.equal(frozenShapeSource,proof.files['scripts/ci-quality-shape.mjs'].afterSource.replace('length:16','length:17').replace('length:12','length:13'));
 assert.equal(frozenQualityShardJobs.length,30);
 assert.deepEqual(frozenFullQualityJobs,['check','presentation','engineering-posix',...Array.from({length:17},(_,i)=>`rules (${i+1}/17)`),...Array.from({length:13},(_,i)=>`engineering-posix (${i+1}/13)`),'impact','fast']);
 assert.equal(frozenFullQualityJobs.length,35);assert.equal(new Set(frozenFullQualityJobs).size,35);
 const js=placementJs(),lua=placementLua();
 assert.equal(js.length,741);assert.equal(lua.length,1401);
 const totalJs=platform=>Object.values(placementWeights(js,platform)).reduce((sum,n)=>sum+n,0)+(placementTimings.initialMs[platform]?.[0]??0);
 const rawWork=lua.reduce((sum,file)=>sum+(placementTimings.luaShard[file]??placementTimings.lua[file]??placementTimings.unknownLuaMs)/((placementTimings.lua[file]??placementTimings.unknownLuaMs)<10000?2:1),0);
 assert.ok((totalJs('win32')+rawWork)/16+60000>1800000,'even ideal old Windows16 distribution exceeds its unchanged budget');
 assert.ok(totalJs('linux')/12+60000>1200000,'even ideal old POSIX12 distribution exceeds its unchanged budget');
 const maxima={},priorMaxima={};
 for(const [platform,count,budget]of [['win32',17,1800000],['linux',13,1200000]]){
  const loads=placementShard(js,`1/${count}`,platform).loads;
  const priorWeights=Object.fromEntries(js.map(file=>[file,Math.max(placementTimings.js[platform][file]??placementTimings.unknownJsMs,after.jsPlanning.localLowerBounds[file]?.durationMs??0)]));
  const priorLoads=partition(js,`1/${count}`,priorWeights,placementTimings.unknownJsMs,Array.from({length:count},(_,i)=>i===0?placementTimings.initialMs[platform][0]:0)).loads;
  const jsBins=Array.from({length:count},(_,i)=>placementShard(js,`${i+1}/${count}`,platform).files);
  assert.deepEqual(jsBins.flat().sort(),[...js].sort());assert.equal(new Set(jsBins.flat()).size,741);
  if(platform==='linux'){
   priorMaxima[platform]=Math.max(...priorLoads)+60000;
   maxima[platform]=Math.max(...loads)+60000;
   assert.ok(maxima[platform]<budget,`POSIX JS max+60s=${maxima[platform]} retains twenty-minute budget`);
   continue;
  }
  assert.deepEqual(loads,priorLoads,'the global floor does not raise the already observed Windows cost');
  const planning={...placementTimings,windowsJsShardMs:loads};
  const bins=Array.from({length:count},(_,i)=>shardLuaScripts(lua,`${i+1}/${count}`,planning,2));
  assert.deepEqual(bins.flat().sort(),[...lua].sort());assert.equal(new Set(bins.flat()).size,1401);
  const cost=f=>placementTimings.luaShard[f]??placementTimings.lua[f]??placementTimings.unknownLuaMs;
  const safety=f=>placementTimings.lua[f]??placementTimings.unknownLuaMs;
  const combined=bins.map((bin,i)=>{const pool=[0,0];for(const f of bin.filter(f=>safety(f)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(f);
   return loads[i]+bin.filter(f=>safety(f)>=10000).reduce((sum,f)=>sum+cost(f),0)+Math.max(...pool);});
  maxima[platform]=Math.max(...combined)+60000;
  priorMaxima[platform]=maxima[platform];
  assert.ok(maxima[platform]<budget,`Windows combined max+60s=${maxima[platform]} retains thirty-minute budget`);
 }
 assert.deepEqual(priorMaxima,{win32:1707732,linux:1138396});
 assert.equal(placement.forecast.attempts[0].win32.maxPlusReserveMs,priorMaxima.win32);assert.equal(placement.forecast.attempts[0].linux.maxPlusReserveMs,priorMaxima.linux);
 assert.deepEqual(maxima,{win32:1707732,linux:1187278});
 const forecast=floorReceipt.planningEffect.forecast17_13;
 assert.deepEqual(forecast.before,{windowsMaxPlusReserveMs:priorMaxima.win32,posixMaxPlusReserveMs:priorMaxima.linux});
 assert.deepEqual(forecast.after,{windowsMaxPlusReserveMs:maxima.win32,posixMaxPlusReserveMs:maxima.linux});
 assert.equal(forecast.reserveMs,60000);assert.deepEqual(forecast.budgets,{windows:1800000,posix:1200000});assert.deepEqual(forecast.inventory,{js:741,lua:1401});
 assert.equal(forecast.workers,2);assert.equal(forecast.concurrencyCapUnchanged,12);assert.equal(forecast.actualFullPassClaim,false);
 const workflow=beforeExecutionTimeoutWorkflow(read('.github/workflows/quality.yml'));assert.match(workflow,/max-parallel: 12/);assert.match(workflow,/timeout-minutes: 20/);assert.match(workflow,/local-special' && 75 \|\| 30/);
});

test('current Full37 retains full coverage and reports performance targets under unchanged execution guards',t=>{
 const workflow=read('.github/workflows/quality.yml');assert.match(workflow,/timeout-minutes: \$\{\{ inputs.runner_pool == 'local-special' && 75 \|\| 45 \}\}/);assert.match(workflow,/runs-on: ubuntu-24.04\n    timeout-minutes: 30/);
 const js=discoverJs(),lua=currentLua();
 assert.deepEqual(currentQualityShardMatrices,{windows:Array.from({length:17},(_,i)=>i+1),posix:Array.from({length:15},(_,i)=>i+1)});
 assert.equal(currentQualityShardJobs.length,32);assert.equal(currentFullQualityJobs.length,37);assert.equal(new Set(currentFullQualityJobs).size,37);
 assert.deepEqual(js.filter(file=>postPlacementJs.includes(file)).sort(),postPlacementJs);
 assert.deepEqual(lua.filter(file=>postPlacementLua.includes(file)),postPlacementLua);
 assert.equal(js.length,placement.inventory.js+postPlacementJs.length);
 assert.equal(lua.length,placement.inventory.lua+postPlacementLua.length);
 for(const platform of ['win32','linux'])for(const file of postPlacementJs){
  assert.equal(currentTimings.js[platform][file],undefined,'new files have no fabricated hosted measurements');
  if(Object.hasOwn(encounterFormationPlanningFloors,file)){
   assert.deepEqual(currentTimings.jsPlanning.localLowerBounds[file],encounterFormationPlanningFloors[file]);
   assert.equal(currentJsPlanningWeights([file],platform)[file],Math.max(currentTimings.unknownJsMs,encounterFormationPlanningFloors[file].durationMs));
  }else if(Object.hasOwn(defectFinalPlanningFloors,file)){
   assert.deepEqual(currentTimings.jsPlanning.localLowerBounds[file],defectFinalPlanningFloors[file]);
   assert.equal(currentJsPlanningWeights([file],platform)[file],Math.max(currentTimings.unknownJsMs,defectFinalPlanningFloors[file].durationMs));
  }else if(file===silentFinalSourcePlanningKey){
   assert.deepEqual(currentTimings.jsPlanning.localLowerBounds[file],silentFinalSourcePlanningFloor);
   assert.equal(currentJsPlanningWeights([file],platform)[file],Math.max(currentTimings.unknownJsMs,silentFinalSourcePlanningFloor.durationMs));
  }else if(file===silentFinalPlanningKey){
   assert.deepEqual(currentTimings.jsPlanning.localLowerBounds[file],silentFinalPlanningFloor);
   assert.equal(currentJsPlanningWeights([file],platform)[file],Math.max(currentTimings.unknownJsMs,silentFinalPlanningFloor.durationMs));
  }else if(file===relicEquipPlanningKey){
   assert.deepEqual(currentTimings.jsPlanning.localLowerBounds[file],relicEquipPlanningFloor);
   assert.equal(currentJsPlanningWeights([file],platform)[file],Math.max(currentTimings.unknownJsMs,relicEquipPlanningFloor.durationMs));
  }else if(file===silentTacticsPlanningKey){
   assert.deepEqual(currentTimings.jsPlanning.localLowerBounds[file],silentTacticsPlanningFloor);
   assert.equal(currentJsPlanningWeights([file],platform)[file],21636);
  }else if(file===effectsTargetGroupPlanningKey){
   assert.deepEqual(currentTimings.jsPlanning.localLowerBounds[file],effectsTargetGroupPlanningFloor);
   assert.equal(currentJsPlanningWeights([file],platform)[file],10000);
  }else if(file===watcherFlowPlanningKey){
   assert.deepEqual(currentTimings.jsPlanning.localLowerBounds[file],watcherFlowPlanningFloor);
   assert.equal(currentJsPlanningWeights([file],platform)[file],55668);
  }else if(file===localFloorKey){
   assert.equal(currentTimings.jsPlanning.localLowerBounds[file].durationMs,68586,'one complete local measurement supplies a planning floor, not hosted data');
   assert.equal(currentJsPlanningWeights([file],platform)[file],68586);
  }else if(file===runCatalogFloorKey){
   assert.deepEqual(currentTimings.jsPlanning.localLowerBounds[file],verifiedRunCatalogFloor());
   assert.equal(currentJsPlanningWeights([file],platform)[file],verifiedRunCatalogFloor().durationMs);
  }else if(file===potionCallbackFloorKey){
   assert.deepEqual(currentTimings.jsPlanning.localLowerBounds[file],verifiedPotionCallbackFloor());
   assert.equal(currentJsPlanningWeights([file],platform)[file],verifiedPotionCallbackFloor().durationMs);
  }else if(file===endTurnFloorKey){
   assert.deepEqual(currentTimings.jsPlanning.localLowerBounds[file],verifiedEndTurnFloor());
   assert.equal(currentJsPlanningWeights([file],platform)[file],verifiedEndTurnFloor().durationMs);
  }else if(file==='tests/actor-presence.test.mjs'){
   assert.deepEqual(currentTimings.jsPlanning.localLowerBounds[file],ciEpoch('actor').timings.jsPlanning.localLowerBounds['tests/actor-presence.test.mjs']);
   assert.equal(currentJsPlanningWeights([file],platform)[file],ciEpoch('actor').timings.jsPlanning.localLowerBounds['tests/actor-presence.test.mjs'].durationMs);
  }else if(file==='tests/reward-query-boundary.test.mjs'){
   assert.deepEqual(currentTimings.jsPlanning.localLowerBounds[file],JSON.parse(rewardQueryPlanningProof.afterSource).jsPlanning.localLowerBounds['tests/reward-query-boundary.test.mjs']);
   assert.equal(currentJsPlanningWeights([file],platform)[file],JSON.parse(rewardQueryPlanningProof.afterSource).jsPlanning.localLowerBounds['tests/reward-query-boundary.test.mjs'].durationMs);
  }else if([defectUtilityPlanningKey,enemyAiPlanningKey,classPotionPlanningKey,watcherPlanningKey].includes(file)){
   const floor=({[defectUtilityPlanningKey]:defectUtilityPlanningFloor,[enemyAiPlanningKey]:enemyAiPlanningFloor,[classPotionPlanningKey]:classPotionPlanningFloor,[watcherPlanningKey]:watcherPlanningFloor})[file];
   assert.deepEqual(currentTimings.jsPlanning.localLowerBounds[file],floor);
   assert.equal(currentJsPlanningWeights([file],platform)[file],Math.max(currentTimings.unknownJsMs,floor.durationMs));
  }else{
   assert.equal(currentTimings.jsPlanning.localLowerBounds[file],undefined,'other new files have no fabricated planning floors');
   assert.equal(currentJsPlanningWeights([file],platform)[file],currentTimings.unknownJsMs);
  }
 }
 for(const file of postPlacementLua){
  assert.equal(currentTimings.lua[file],undefined,'new fixtures have no fabricated worker-safety measurements');
  assert.equal(currentTimings.luaShard[file],undefined,'new fixtures have no fabricated placement measurements');
 }
 // Keep the original forecasts bound to their original inventory. Newly added
 // unmeasured V25 files still participate in a separate complete-current plan.
 const preV25Js=js.filter(file=>!currentV25Js.includes(file)&&!componentAddedJs.includes(file));
 for(const [platform,count,budget]of [['win32',17,1800000],['linux',15,1200000]])for(const [label,inventory]of [['pre-V25',preV25Js],['current',js]]){
  const loads=currentJsShard(inventory,`1/${count}`,platform).loads;
  const jsBins=Array.from({length:count},(_,i)=>currentJsShard(inventory,`${i+1}/${count}`,platform).files);
  assert.deepEqual(jsBins.flat().sort(),[...inventory].sort());assert.equal(new Set(jsBins.flat()).size,inventory.length);
  if(platform==='linux'){
   const forecast=Math.max(...loads)+60000;if(label==='pre-V25')assert.equal(forecast,1128812);assert.ok(forecast<budget,'complete POSIX inventory fits the unchanged performance target including reserve');t.diagnostic(`POSIX ${label} forecast ${forecast} ms; target ${budget} ms; overrun ${Math.max(0,forecast-budget)} ms; actual Full pass not claimed`);assert.ok(forecast<1800000,'forecast must fit the separately authorized 30-minute execution guard');
   continue;
  }
  const planning={...currentTimings,windowsJsShardMs:loads};
  const selectedLua=label==='pre-V25'?lua.filter(file=>!componentAddedLua.includes(file)):lua;
  const bins=Array.from({length:count},(_,i)=>shardLuaScripts(selectedLua,`${i+1}/${count}`,planning,2));
  assert.deepEqual(bins.flat().sort(),[...selectedLua].sort());assert.equal(new Set(bins.flat()).size,selectedLua.length);
  const cost=file=>currentTimings.luaShard[file]??currentTimings.lua[file]??currentTimings.unknownLuaMs;
  const safety=file=>currentTimings.lua[file]??currentTimings.unknownLuaMs;
  const combined=bins.map((bin,i)=>{const pool=[0,0];for(const file of bin.filter(file=>safety(file)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(file);
   return loads[i]+bin.filter(file=>safety(file)>=10000).reduce((sum,file)=>sum+cost(file),0)+Math.max(...pool);});
  const forecast=Math.max(...combined)+60000;if(label==='pre-V25')assert.equal(forecast,1794163);assert.ok(forecast<budget,'complete Windows inventory fits the unchanged performance target including reserve');t.diagnostic(`Windows ${label} forecast ${forecast} ms; target ${budget} ms; overrun ${Math.max(0,forecast-budget)} ms; actual Full pass not claimed`);assert.ok(forecast<2700000,'forecast must fit the separately authorized 45-minute execution guard');
 }
});

test('current placement authenticates 1458 complete successful assigned files without claiming failed containing jobs passed',()=>{
 assert.equal(hash(placementBytes),'5af2e277b3472262b57a12a6c13e387f4a008eeff0223b2a214bdddae115bd78');
 assert.equal(placement.schemaVersion,1);assert.equal(placement.kind,'pr521-native-file-placement');
 const run=placement.sourceRun;assert.equal(run.id,42176327678);assert.equal(run.attempt,1);
 assert.equal(run.headSha,'7be4b68ce2214d42273affe7a887bddf03bdbd87');assert.equal(run.treeSha,'c532b6efb5b752198be083be1c4dcf51b7c4167c');
 assert.equal(run.status,'completed');assert.equal(run.conclusion,'failure');
 assert.deepEqual(placement.inventory,{js:741,lua:1401,sourceShape:{windows:16,posix:12},plannedShape:{windows:17,posix:13}});
 assert.equal(placement.sourceRecords.length,28);assert.equal(placement.observations.length,1458);assert.equal(placement.rawLines.length,1458);
 assert.equal(placement.observationCount,1458);assert.deepEqual(placement.observedFileCounts,{win32:734,linux:724});
 const records=new Map(),assignments=new Map(),rawLines=new Map(),seen=new Set(),counts={win32:0,linux:0};
 const inventory=placementJs();
 for(const source of placement.sourceRecords){
  assert.ok(!records.has(source.jobId));records.set(source.jobId,source);
  assert.equal(source.runId,run.id);assert.equal(source.runAttempt,run.attempt);assert.equal(source.headSha,run.headSha);assert.equal(source.treeSha,run.treeSha);
  assert.equal(source.status,'completed');assert.equal(source.step.status,'completed');
  assert.match(source.sha256,/^[a-f0-9]{64}$/);assert.equal(source.path,`build/m7-full-7be-failure/job-${source.jobId}.log`);
  const match=source.jobName.match(/^(rules|engineering-posix) \((\d+)\/(16|12)\)$/);assert.ok(match);
  const platform=match[1]==='rules'?'win32':'linux',count=platform==='win32'?16:12;
  assert.equal(source.platform,platform);assert.equal(Number(match[3]),count);
  assignments.set(source.jobId,new Set(jsShard(inventory,`${match[2]}/${count}`,platform).files));
 }
 for(const row of placement.rawLines){const key=row.jobId+':'+row.line;assert.ok(!rawLines.has(key));rawLines.set(key,row.rawLine);}
 for(const row of placement.observations){
  const source=records.get(row.jobId);assert.ok(source);assert.equal(row.success,true);
  assert.ok(Number.isFinite(row.durationMs)&&row.durationMs>0);assert.ok(Number.isSafeInteger(row.line)&&row.line>0);
  assert.equal(row.platform,source.platform);assert.equal(row.jobName,source.jobName);assert.equal(row.jobConclusion,source.conclusion);assert.equal(row.jsStepConclusion,source.step.conclusion);
  assert.equal(row.logPath,source.path);assert.equal(row.logSha256,source.sha256);assert.ok(assignments.get(row.jobId).has(row.file));
  const raw=rawLines.get(row.jobId+':'+row.line);assert.equal(typeof raw,'string');
  const match=raw.match(/^(\S+) CI_FILE_TIMING (\{.*\})$/);assert.ok(match);assert.equal(match[1],row.timestamp);
  assert.deepEqual(JSON.parse(match[2]),{file:row.file,durationMs:row.durationMs,success:true});
  const time=Date.parse(row.timestamp);assert.ok(time>=Date.parse(source.step.startedAt)&&time<Date.parse(source.step.completedAt)+1000);
  const key=row.platform+':'+row.file;assert.ok(!seen.has(key));seen.add(key);counts[row.platform]++;
 }
 assert.deepEqual(counts,{win32:734,linux:724});
 assert.equal(placement.excluded.failedFileRows.length,13);assert.equal(placement.excluded.unfinishedOrUnobservedFiles.length,11);assert.deepEqual(placement.excluded.otherRejectedTimingRows,[]);
 const excluded=[...placement.excluded.failedFileRows,...placement.excluded.unfinishedOrUnobservedFiles];
 for(const row of excluded){const source=records.get(row.jobId);assert.ok(source);assert.ok(assignments.get(row.jobId).has(row.file));assert.ok(!seen.has(source.platform+':'+row.file));}
 for(const [jobId,assigned]of assignments){
  const rows=[...placement.observations,...excluded].filter(row=>row.jobId===jobId).map(row=>row.file);
  assert.deepEqual(rows.sort(),[...assigned].sort());assert.equal(new Set(rows).size,assigned.size);
 }
 const d5=placement.observations.find(row=>row.platform==='linux'&&row.file==='tests/relic-lifecycle.test.mjs');
 assert.equal(d5.durationMs,461486.846292);assert.equal(d5.success,true);assert.equal(d5.jsStepConclusion,'cancelled');
});

test('current 129 placement raises reconstruct exact timings while preserving all old floors and raw worker safety bytes',()=>{
 const expected=structuredClone(after),changes=[],raisedCounts={win32:0,linux:0};
 for(const row of placement.observations){
  const map=expected.js[row.platform],hadOwnBefore=Object.hasOwn(map,row.file),oldMs=map[row.file]??after.unknownJsMs,newMs=Math.max(oldMs,Math.ceil(row.durationMs));
  if(newMs>oldMs){map[row.file]=newMs;changes.push({...row,oldMs,newMs,raiseMs:newMs-oldMs,hadOwnBefore});raisedCounts[row.platform]++;}
 }
 assert.equal(changes.length,129);assert.deepEqual(raisedCounts,{win32:70,linux:59});assert.deepEqual(changes,placement.changes);
 assert.equal(placement.raisedCount,129);assert.deepEqual(placement.raisedCounts,raisedCounts);
 assert.equal(placement.previousMapSha256,hash(JSON.stringify(after.js)));assert.equal(placement.resultingMapSha256,hash(JSON.stringify(expected.js)));
 const update=currentTimings.jsCalibrationUpdates.at(-1);
 assert.deepEqual(currentTimings.jsCalibrationUpdates.slice(0,-1),after.jsCalibrationUpdates);
 assert.equal(update.runId,placement.sourceRun.id);assert.equal(update.runAttempt,1);assert.equal(update.headSha,placement.sourceRun.headSha);assert.equal(update.treeSha,placement.sourceRun.treeSha);assert.equal(update.conclusion,'failure');
 assert.deepEqual(update.sourceRecords,placement.sourceRecords);assert.deepEqual(update.observedFileCounts,placement.observedFileCounts);assert.equal(update.observationCount,1458);assert.deepEqual(update.raisedCounts,raisedCounts);
 assert.deepEqual(update.excludedFailedCounts,{win32:7,linux:6});assert.deepEqual(update.excludedUnfinishedCounts,{win32:0,linux:11});
 assert.equal(update.detailedReceipt,placementPath);assert.equal(update.detailedReceiptSha256,hash(placementBytes));
 expected.jsCalibrationUpdates.push(update);
 const priorBytes=JSON.stringify(expected,null,2)+'\n';
 assert.equal(hash(priorBytes),'3f12a6a2cffe9516fae02de768d545a2847e5632efedb72b0298a8bb26ca9ee5','the original 129 raises and one provenance append recover their exact complete timing epoch');
 assert.equal(hash(floorBytes),'503e94c83632f032d6b160ae24ec6b3d33f8d91c4c0f734d91056f4371a750b0');
 assert.equal(floorReceipt.schemaVersion,1);assert.equal(floorReceipt.kind,'cross-platform-planning-floor');assert.equal(floorReceipt.file,floorKey);assert.equal(floorReceipt.beforeTimingsLfSha256,hash(priorBytes));
 assert.equal(Object.hasOwn(floorReceipt,'afterTimingsLfSha256'),false,'receipt has no circular after-source identity');
 assert.equal(floorReceipt.originalPlacementEvidence.path,placementPath);assert.equal(floorReceipt.originalPlacementEvidence.sha256,hash(placementBytes));assert.deepEqual(floorReceipt.originalPlacementEvidence.sourceRun,placement.sourceRun);
 const windows=floorReceipt.completedWindowsSource,row=windows.observation,source=windows.sourceRecord;
 assert.deepEqual(row,placement.observations.find(observation=>observation.platform==='win32'&&observation.file===floorKey));
 assert.deepEqual(source,placement.sourceRecords.find(record=>record.jobId===row.jobId));
 assert.equal(windows.rawLine,placement.rawLines.find(line=>line.jobId===row.jobId&&line.line===row.line).rawLine);
 assert.equal(row.durationMs,889637.0668);assert.equal(row.success,true);assert.equal(row.platform,'win32');assert.equal(source.step.status,'completed');assert.equal(source.step.conclusion,'success');assert.equal(source.conclusion,'cancelled');
 assert.equal(windows.ceilMs,Math.ceil(row.durationMs));assert.equal(windows.ceilMs,889638);assert.equal(floorReceipt.durationMs,windows.ceilMs);assert.equal(floorReceipt.environment,'hosted Windows');
 const censored=floorReceipt.censoredLinuxSource;
 assert.equal(censored.plannedCount,58);assert.equal(censored.completedCount,44);assert.equal(censored.firstUncompletedFile,floorKey);
 assert.deepEqual(censored.completeSuccessfulPrefix.map(row=>row.file),censored.plannedFiles.slice(0,44));assert.equal(censored.plannedFiles[44],floorKey);
 assert.equal(censored.censoredWindowMs,629181);assert.equal(censored.measurementImported,false);assert.equal(censored.censoringIsNotRuntimeOrPass,true);
 assert.equal(currentTimings.js.linux[floorKey],254137,'the unfinished Linux duration never replaces its previous complete observation');
 assert.equal(floorReceipt.planningEffect.previousEffectiveLinuxMs,254137);assert.equal(floorReceipt.planningEffect.previousEffectiveWindowsMs,889638);assert.equal(floorReceipt.planningEffect.newFloorMs,889638);
 assert.deepEqual(floorReceipt.planningEffect.additionalTotalWorkMs,{linux:635501,win32:0});
 expected.jsPlanning.model=after.jsPlanning.model.replace('explicit local lower bounds.','explicit local and cross-platform planning floors.');
 assert.notEqual(expected.jsPlanning.model,after.jsPlanning.model);
 expected.jsPlanning.localLowerBounds[floorKey]={durationMs:889638,environment:'hosted Windows',coverage:floorReceipt.coverage,
  kind:'Planning-only cross-platform floor from a complete successful hosted Windows same-file observation; not a Linux measurement or censored elapsed-time sample.',
  sourceLog:row.logPath,sourceLogSha256:row.logSha256,sourceRunId:source.runId,sourceHeadSha:source.headSha,sourceJobId:row.jobId,sourceReceipt:floorPath,sourceReceiptSha256:hash(floorBytes)};
 assert.equal(hash(JSON.stringify(expected,null,2)+'\n'),'a5841ddaa53d8bc810f9c16ae342ed2de8cb5479bbcb073562d2c6c921ed1b24','all 129 raises and the nine prior floors retain their exact complete epoch');
 assert.equal(hash(localFloorBytes),'52570c893c538ac0c5ab592e3b6d89afe883495ea6624fa4f35abaad3053f8f7','complete local planning provenance remains immutable');
 assert.equal(localFloorReceipt.schemaVersion,1);assert.equal(localFloorReceipt.kind,'local-complete-file-planning-floor');assert.equal(localFloorReceipt.file,localFloorKey);
 assert.equal(localFloorReceipt.beforeTimingsLfSha256,hash(JSON.stringify(expected,null,2)+'\n'));assert.equal(localFloorReceipt.durationMs,68586);
 const localRun=localFloorReceipt.completedRun;assert.equal(hash(localRun.rawTap),localRun.sha256);
 for(const pattern of [/ℹ tests 8\r?\n/,/ℹ pass 8\r?\n/,/ℹ fail 0\r?\n/,/ℹ skipped 0\r?\n/])assert.match(localRun.rawTap,pattern);
 assert.equal(Number(localRun.rawTap.match(/ℹ duration_ms ([\d.]+)/)[1]),68585.5837);assert.equal(localRun.durationMs,68585.5837);assert.equal(Math.ceil(localRun.durationMs),localFloorReceipt.durationMs);
 assert.deepEqual([localRun.tests,localRun.passed,localRun.failed,localRun.skipped,localRun.checkpoints,localRun.bytesPerSide],[8,8,0,0,694,55585110]);
 assert.equal(localFloorReceipt.environment.node,'v24.18.0');assert.equal(localFloorReceipt.environment.platform,'win32');assert.match(localFloorReceipt.environment.scope,/not a hosted Windows or Linux measurement/);
 assert.equal(localRun.testProcessMaxRSSKiB,2324108);assert.match(localRun.rawTap,/POWER_SHOP_RESOURCE \{"testProcessMaxRSSKiB":2324108\}/);
 assert.equal(localRun.reports.reduce((n,r)=>n+r.checkpoints,0),694);assert.equal(localRun.reports.reduce((n,r)=>n+r.bytesPerSide,0),55585110);
 assert.equal(localFloorReceipt.sourceIdentity.ownerFiles.length,5);assert.ok(localFloorReceipt.sourceIdentity.selectedFiles.some(f=>f.path===localFloorKey));
 const oldLocal=localFloorReceipt.historicalFullEncoding;assert.equal(oldLocal.durationMs,153107.4336);assert.equal(hash(oldLocal.rawTap),oldLocal.sha256);assert.equal(oldLocal.checkpoints,694);assert.equal(oldLocal.bytesPerSide,335541022);
 assert.equal(oldLocal.rejectedPlanningForecast.linuxMaxPlusReserveMs,1201367);assert.match(oldLocal.reason,/not a controlled speed comparison/);
 expected.jsPlanning.localLowerBounds[localFloorKey]={durationMs:68586,environment:'local Windows',coverage:'8/8 complete file passed; 0 skipped; stable complete-graph observer',
  kind:'Local complete-run planning estimate only; not hosted or Linux measurement.',sourceLog:localRun.path,sourceLogSha256:localRun.sha256,sourceReceipt:localFloorPath,sourceReceiptSha256:hash(localFloorBytes)};
 assert.equal(hash(JSON.stringify(expected,null,2)+'\n'),'1832a5f395318af201322666f31f601ffb183c0870fcc6fa62a5d8e48af0922d','the complete Power/Shop timing epoch stays immutable');
 expected.jsPlanning.localLowerBounds[runCatalogFloorKey]=verifiedRunCatalogFloor();
 const originalNine=JSON.parse(rewardQueryPlanningProof.beforeSource);
 const runEpoch=structuredClone(originalNine);runEpoch.jsPlanning.localLowerBounds[runCatalogFloorKey]=verifiedRunCatalogFloor();
 assert.equal(hash(JSON.stringify(runEpoch,null,2)+'\n'),'39ad201a4b9bf0486820a23a95937a879a47092e2e07cf7ee848acd4a8f0ff14');
 const potionEpoch=structuredClone(runEpoch);potionEpoch.jsPlanning.localLowerBounds[potionCallbackFloorKey]=verifiedPotionCallbackFloor();
 assert.equal(hash(JSON.stringify(potionEpoch,null,2)+'\n'),'ff45c2819a7000cea148d421305ab1afac780d0b71de1196b2dc68c69fb8fd66');
 const endEpoch=structuredClone(originalNine);endEpoch.jsPlanning.localLowerBounds[endTurnFloorKey]=verifiedEndTurnFloor();
 assert.equal(hash(JSON.stringify(endEpoch,null,2)+'\n'),'69b5e0640831032a24a27309b0349c623417890b58700aec56188203e70bb147');
 expected.jsPlanning.localLowerBounds[potionCallbackFloorKey]=verifiedPotionCallbackFloor();
 expected.jsPlanning.localLowerBounds[endTurnFloorKey]=verifiedEndTurnFloor();
 expected.jsPlanning.localLowerBounds['tests/actor-presence.test.mjs']=ciEpoch('actor').timings.jsPlanning.localLowerBounds['tests/actor-presence.test.mjs'];
 expected.jsPlanning.localLowerBounds['tests/reward-query-boundary.test.mjs']=JSON.parse(rewardQueryPlanningProof.afterSource).jsPlanning.localLowerBounds['tests/reward-query-boundary.test.mjs'];
 assert.equal(JSON.stringify(expected,null,2)+'\n',read(path),'only independently sourced Power/Shop and Run catalogue floors extend the original epoch');
 for(const [key,floor]of [[defectUtilityPlanningKey,defectUtilityPlanningFloor],[enemyAiPlanningKey,enemyAiPlanningFloor],[classPotionPlanningKey,classPotionPlanningFloor],[watcherPlanningKey,watcherPlanningFloor]])expected.jsPlanning.localLowerBounds[key]=floor;
 expected.jsPlanning.localLowerBounds[gameUiLocalPlanningKey]=gameUiLocalPlanningFloor;
 Object.assign(expected.jsPlanning.localLowerBounds,partialCasePlanningFloors);
 expected.jsPlanning.localLowerBounds[watcherFlowPlanningKey]=watcherFlowPlanningFloor;
 expected.jsPlanning.localLowerBounds[silentTacticsPlanningKey]=silentTacticsPlanningFloor;
 expected.jsPlanning.localLowerBounds[effectsTargetGroupPlanningKey]=effectsTargetGroupPlanningFloor;
 expected.jsPlanning.localLowerBounds[relicEquipPlanningKey]=relicEquipPlanningFloor;
 expected.jsPlanning.localLowerBounds[silentFinalPlanningKey]=silentFinalPlanningFloor;
 expected.jsPlanning.localLowerBounds[silentFinalSourcePlanningKey]=silentFinalSourcePlanningFloor;
 Object.assign(expected.jsPlanning.localLowerBounds,defectFinalPlanningFloors,encounterFormationPlanningFloors);
 assert.deepEqual(currentTimings,expected);
 for(const platform of ['win32','linux'])for(const [file,value]of Object.entries(after.js[platform]))assert.ok(currentTimings.js[platform][file]>=value);
 const luaBlock=s=>s.slice(s.indexOf('  "lua": {'),s.indexOf('  "jsSource":'));
 assert.equal(luaBlock(read(path)),luaBlock(binding.afterSource),'literal worker-safety bytes remain frozen');
 for(const key of ['lua','luaShard','luaShardCalibrationUpdates','initialMs','unknownJsMs','unknownLuaMs'])assert.deepEqual(currentTimings[key],after[key],key+' remains unchanged');
 const priorFloors=structuredClone(currentTimings.jsPlanning.localLowerBounds);for(const key of Object.keys(encounterFormationPlanningFloors))delete priorFloors[key];for(const key of Object.keys(defectFinalPlanningFloors))delete priorFloors[key];delete priorFloors[silentFinalSourcePlanningKey];delete priorFloors[silentFinalPlanningKey];delete priorFloors[relicEquipPlanningKey];delete priorFloors[watcherFlowPlanningKey];delete priorFloors[silentTacticsPlanningKey];delete priorFloors[effectsTargetGroupPlanningKey];for(const key of Object.keys(partialCasePlanningFloors))delete priorFloors[key];delete priorFloors[gameUiLocalPlanningKey];delete priorFloors[floorKey];delete priorFloors[localFloorKey];delete priorFloors[runCatalogFloorKey];delete priorFloors[potionCallbackFloorKey];delete priorFloors[endTurnFloorKey];delete priorFloors['tests/actor-presence.test.mjs'];delete priorFloors['tests/reward-query-boundary.test.mjs'];for(const key of [defectUtilityPlanningKey,enemyAiPlanningKey,classPotionPlanningKey,watcherPlanningKey])delete priorFloors[key];assert.deepEqual(priorFloors,after.jsPlanning.localLowerBounds,'all eight existing local floors remain exact');assert.equal(Object.keys(priorFloors).length,8);
 for(const platform of ['win32','linux'])assert.equal(currentJsPlanningWeights([floorKey],platform)[floorKey],889638);
 assert.equal(placement.forecast.reserveMs,60000);assert.deepEqual(placement.forecast.budgets,{win32:1800000,linux:1200000});assert.equal(placement.forecast.workers,2);assert.equal(placement.forecast.concurrencyCapUnchanged,12);
});

test('only two exact current source identities enter the unchanged pure historical CI chain and all byte drift remains visible',()=>{
 const identities={
  'scripts/ci-test-timings.json':'119d296f254629aa5316ff9a9fef5b51ff5f5bb3d25c7d5a912df9066b4ebde3',
  'scripts/ci-quality-shape.mjs':'0d6c82c2a7e7db82e276eb563978d5253d9a225039329e171ed3f907f98609d1',
 };
 for(const [path,digest]of Object.entries(identities)){
  const source=prePosix14ShapeSource(path,read(path)),b=proof.files[path];assert.equal(hash(source),digest);
  for(const input of [source,source.replaceAll('\n','\r\n')]){
   assert.equal(preCurrentCiPlacementSource(path,input),b.afterSource);assert.equal(project(path,input),b.beforeSource);
   const legacy=path.endsWith('.json')?preCiHostTimingSource(path,b.beforeSource):preCiWindowsShapeSource(path,b.beforeSource);
   assert.equal(preIntegrationSource(path,input,'base',{readSource(){assert.fail('pure CI source projection must not read any live owner');}}),legacy);
  }
  for(const value of [b.afterSource,b.beforeSource,undefined,null,{},123])assert.equal(preCurrentCiPlacementSource(path,value),value);
  assert.equal(preCurrentCiPlacementSource('foreign',source),source);
  const other=Object.keys(identities).find(other=>other!==path);assert.equal(preCurrentCiPlacementSource(other,source),source);
  const mutants=[source+'\n',source.slice(1),source.replaceAll('\n','\n '),source.replace('length:17','length:16'),source.replace('length:13','length:12'),
   source.replace('"unknownJsMs": 10000','"unknownJsMs": 9999'),source.replace('"unknownJsMs": 10000','"unknownJsMs": 10000,\n  "unknownJsMs": 10000'),
   source.replace('"conclusion": "failure"','"conclusion": "success"'),source.replace('"durationMs": 889638','"durationMs": 629181'),
   source.replace('"tests/run-max-hp-config-inverse.test.mjs": 254137','"tests/run-max-hp-config-inverse.test.mjs": 889638'),
   source.replace('not a Linux measurement or censored elapsed-time sample.','a Linux measurement and censored elapsed-time sample.')].filter(value=>value!==source);
  for(const mutant of mutants){assert.equal(preCurrentCiPlacementSource(path,mutant),mutant);assert.equal(project(path,mutant),mutant);assert.notEqual(hash(mutant),b.beforeSha256);}
 }
});

test('Potion timing outer projection preserves the complete Run catalogue epoch and rejects drift without live reads',()=>{
 const {read,readFileSync,timings:currentTimings}=ciEpoch('potion');
 const source=read('scripts/ci-test-timings.json'),prior=read('tests/helpers/potion-callback-planning-before.json');
 assert.equal(hash(prior),'39ad201a4b9bf0486820a23a95937a879a47092e2e07cf7ee848acd4a8f0ff14');
 for(const value of [source,source.replaceAll('\n','\r\n')])assert.equal(prePotionCallbackPlanningSource(path,value),prior);
 for(const value of [prior,null,undefined,{},17,source+'\n',source.slice(1),source.replace('"durationMs": 29232','"durationMs": 26662'),source.replace('"durationMs": 71327','"durationMs": 71326'),source.replace('"unknownJsMs": 10000','"unknownJsMs": 9999')]){
  assert.equal(prePotionCallbackPlanningSource(path,value),value);
 }
 assert.equal(prePotionCallbackPlanningSource('foreign',source),source);
 const expected=JSON.parse(source);delete expected.jsPlanning.localLowerBounds[potionCallbackFloorKey];
 assert.equal(JSON.stringify(expected,null,2)+'\n',prior,'no observed map, worker safety, matrix, unknown weight, or prior floor changes');
});

test('presence planning adds only one authenticated complete local observation and rejects failed or partial evidence',()=>{
 const {read,readFileSync,timings:currentTimings}=ciEpoch('actor');
 const receiptPath='docs/evidence/actor-presence-planning-floor-20261107.json';
 const bytes=read(receiptPath),receipt=JSON.parse(bytes),key='tests/actor-presence.test.mjs';
 const entry=currentTimings.jsPlanning.localLowerBounds[key];
 const validate=r=>{
  assert.equal(r.schemaVersion,1);assert.equal(r.kind,'local-complete-file-planning-floor');assert.equal(r.notHostedCiMeasurement,true);
  assert.equal(r.file,key);assert.equal(r.sourceHeadSha,'9624804b44d4773a40c557f02e0b13b3a31f2497');assert.equal(r.sourceTreeSha,'3d7ff446596c93fd3b2992005a05d90bdeb20cda');
  const o=r.observation;assert.equal(o.file,key);assert.equal(o.notHostedCiMeasurement,true);assert.equal(o.status,0);assert.equal(o.signal,null);assert.equal(o.error,null);
  assert.equal(o.durationMs,31052.666793);assert.equal(o.planningFloorMs,Math.ceil(o.durationMs));assert.equal(o.planningFloorMs,31053);
  assert.deepEqual(o.command.slice(1),['--test','--test-concurrency=1',key]);
  assert.ok(Date.parse(o.finishedAt)>Date.parse(o.startedAt));
  assert.equal(hash(r.stdout),o.stdoutSha256);assert.equal(hash(r.stderr),o.stderrSha256);assert.equal(r.stderr,'');
  for(const [label,n]of [['tests',12],['pass',12],['fail',0],['cancelled',0],['skipped',0],['todo',0]])assert.match(r.stdout,new RegExp('ℹ '+label+' '+n+'(?:\\r?\\n|$)'));
  assert.equal(o.testSha256,hash(read(key)));
  assert.equal(Object.keys(r.sourceFiles).length,13);
  for(const [file,digest]of Object.entries(r.sourceFiles))assert.equal(hash(file.endsWith('.gz')?readFileSync(file):read(file)),digest,file);
  assert.equal(r.beforeTimingsLfSha256,hash(presencePlanningBefore));
 };
 validate(receipt);
 assert.equal(entry.sourceReceipt,receiptPath);assert.equal(entry.sourceReceiptSha256,hash(bytes));assert.equal(entry.environment,'local Linux');assert.equal(entry.durationMs,31053);
 const expected=JSON.parse(presencePlanningBefore);assert.equal(Object.keys(expected.jsPlanning.localLowerBounds).length,9);
 expected.jsPlanning.localLowerBounds[key]=entry;
 assert.equal(JSON.stringify(expected,null,2)+'\n',read(path),'only one floor is added; every old timing, floor and policy byte is retained');
 assert.equal(Object.keys(currentTimings.jsPlanning.localLowerBounds).length,10);
 for(const platform of ['win32','linux']){assert.equal(currentTimings.js[platform][key],undefined);assert.equal(currentJsPlanningWeights([key],platform)[key],31053);}
 for(const mutate of [r=>r.observation.status=1,r=>r.observation.signal='SIGTERM',r=>r.observation.error='timeout',r=>r.observation.planningFloorMs=31052,r=>r.notHostedCiMeasurement=false,r=>r.observation.command.push('--test-name-pattern=partial'),r=>r.sourceHeadSha='0'.repeat(40),r=>r.sourceFiles[key]='0'.repeat(64),r=>{r.stdout=r.stdout.replace('ℹ pass 12','ℹ pass 11');r.observation.stdoutSha256=hash(r.stdout);},r=>r.beforeTimingsLfSha256='0'.repeat(64)]){
  const mutant=structuredClone(receipt);mutate(mutant);assert.throws(()=>validate(mutant),'bad observation must be rejected');
 }
});

test('presence planning exact full-source inverse rejects timing drift and preserves all prior source epochs',()=>{
 const {read}=ciEpoch('actor');
 const source=read(path),before=presencePlanningBefore;
 for(const value of [source,source.replaceAll('\n','\r\n')]){
  assert.equal(prePresencePlanningSource(path,value),before);
  assert.equal(project(path,value),project(path,before));
  assert.equal(preIntegrationSource(path,value),preIntegrationSource(path,before));
 }
 for(const value of [null,undefined,{},before,source+'\n',source.slice(1),source.replace('"durationMs": 31053','"durationMs": 10000'),source.replace('"unknownJsMs": 10000','"unknownJsMs": 9999'),source.replace('local Linux','hosted Linux')]){
  assert.equal(prePresencePlanningSource(path,value),value);
  if(typeof value==='string'&&value!==before)assert.equal(project(path,value),value);
 }
 assert.equal(prePresencePlanningSource('foreign',source),source);
});

test('original Actor placement forecast retains its exact complete slice and unchanged budgets',()=>{
 const e=ciEpoch('actor'),js=e.discoverJs(),lua=e.lua,t=e.timings;
 for(const [platform,count,budget,exact]of [['linux',13,1200000,1194287],['win32',17,1800000,1714151]]){
  const loads=e.jsShard(js,`1/${count}`,platform).loads;
  let maximum=Math.max(...loads)+60000;
  if(platform==='win32'){
   const bins=Array.from({length:count},(_,i)=>shardLuaScripts(lua,`${i+1}/${count}`,{...t,windowsJsShardMs:loads},2));
   const cost=f=>t.luaShard[f]??t.lua[f]??t.unknownLuaMs,safety=f=>t.lua[f]??t.unknownLuaMs;
   maximum=Math.max(...bins.map((bin,i)=>{const pool=[0,0];for(const f of bin.filter(f=>safety(f)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(f);return loads[i]+bin.filter(f=>safety(f)>=10000).reduce((n,f)=>n+cost(f),0)+Math.max(...pool);}))+60000;
  }
  assert.equal(maximum,exact);assert.ok(maximum<budget);
 }
});
test('original reward-query whole-file provenance retains its measured source identity and costs',()=>{assertRewardQueryPlanningReceipt({epoch:ciEpoch('reward')});});
test('original reward-query timing pure projection rejects every byte drift',()=>{assertRewardQueryPlanningProjection({project,preCurrentCiPlacementSource,preIntegrationSource,epoch:ciEpoch('reward')});});

test('only exact POSIX14 source enters the frozen 17/13 epoch without accepting drift or cross-file sources',()=>{
 const path='scripts/ci-quality-shape.mjs',source=preRelicEquipCiSource(path,preSilentFinalCiSource(path,readFileSync(path,'utf8'))).replaceAll('\r\n','\n');
 assert.equal(source,frozenShapeSource.replace('length:13','length:14'));
 for(const input of [source,source.replaceAll('\n','\r\n')]){
  assert.equal(prePosix14ShapeSource(path,input),frozenShapeSource);
  assert.equal(preCurrentCiPlacementSource(path,input),proof.files[path].afterSource);
  assert.equal(project(path,input),proof.files[path].beforeSource);
 }
 for(const input of [undefined,null,{},42,frozenShapeSource,source+'\n',source.slice(1),source.replace('length:14','length:15'),source.replace('length:17','length:18')])
  assert.equal(prePosix14ShapeSource(path,input),input);
 for(const wrongPath of ['foreign','scripts/ci-test-timings.json'])assert.equal(prePosix14ShapeSource(wrongPath,source),source);
});

test('Enemy AI planning layer authenticates complete current bytes and rejects unrelated drift',()=>{
 const source=enemyOnlyPlanningSource(path,preDefectIntegrationPlanningSource(path,originalPlanningSource(path,preRelicEquipCiSource(path,preSilentFinalCiSource(path,readFileSync(path,'utf8'))).replaceAll('\r\n','\n'),'seven'))),prior=preEnemyAiPlanningSource(path,source);
 assert.equal(hash(source),enemyAiPlanningProof.afterSha256);
 assert.equal(hash(prior),enemyAiPlanningProof.beforeSha256);
 assert.notEqual(source,prior);
 for(const input of [source,source.replaceAll('\n','\r\n')]){
  assert.equal(preEnemyAiPlanningSource(path,input),prior);
  assert.equal(preCurrentCiPlacementSource(path,input),binding.afterSource);
 }
 for(const changed of [source+'\n',source.replace('"durationMs": 30000','"durationMs": 29999'),source.replace('"unknownJsMs": 10000','"unknownJsMs": 9999')]){
  assert.notEqual(changed,source);assert.equal(preEnemyAiPlanningSource(path,changed),changed);
  assert.equal(preCurrentCiPlacementSource(path,changed),changed);
 }
});

test('Defect utility planning layer authenticates complete current bytes and rejects unrelated drift',()=>{
 const source=defectOnlyPlanningSource(path,originalPlanningSource(path,preRelicEquipCiSource(path,preSilentFinalCiSource(path,readFileSync(path,'utf8'))).replaceAll('\r\n','\n'),'seven')),prior=preDefectUtilityPlanningSource(path,source);
 assert.equal(hash(source),defectUtilityPlanningProof.afterSha256);
 assert.equal(hash(prior),defectUtilityPlanningProof.beforeSha256);
 assert.notEqual(source,prior);
 for(const input of [source,source.replaceAll('\n','\r\n')]){
  assert.equal(preDefectUtilityPlanningSource(path,input),prior);
  assert.equal(preCurrentCiPlacementSource(path,input),binding.afterSource);
 }
 for(const changed of [source+'\n',source.replace('"durationMs": 20000','"durationMs": 19999'),source.replace('"unknownJsMs": 10000','"unknownJsMs": 9999')]){
  assert.notEqual(changed,source);assert.equal(preDefectUtilityPlanningSource(path,changed),changed);
  assert.equal(preCurrentCiPlacementSource(path,changed),changed);
 }
});


test('merged planning source authenticates both complete original epochs without masking drift',()=>{
 const source=preRelicEquipCiSource(path,preSilentFinalCiSource(path,readFileSync(path,'utf8'))).replaceAll('\r\n','\n');
 for(const epoch of ['develop','seven']){
  const original=originalPlanningSource(path,source,epoch);
  assert.notEqual(original,source);
  assert.equal(originalPlanningSource(path,source.replaceAll('\n','\r\n'),epoch),original);
  const current=JSON.parse(source),prior=JSON.parse(original);
  for(const key of Object.keys(prior).filter(key=>key!=='jsPlanning'))assert.deepEqual(current[key],prior[key]);
  for(const [key,value]of Object.entries(prior.jsPlanning.localLowerBounds))assert.deepEqual(current.jsPlanning.localLowerBounds[key],value);
  for(const mutant of [source+'\n',source.slice(1),source.replace('"durationMs": 180000','"durationMs": 179999'),source.replace('"durationMs": 68586','"durationMs": 68585'),source.replace('"unknownJsMs": 10000','"unknownJsMs": 9999'),null,undefined,{},42,original]){
   assert.equal(originalPlanningSource(path,mutant,epoch),mutant);
   if(typeof mutant==='string'&&mutant!==original)assert.equal(project(path,mutant),mutant);
  }
  assert.equal(originalPlanningSource('foreign/'+path,source,epoch),source);
 }
});


test('Watcher Flow saved complete local run supplies only one authenticated planning floor',()=>{
 const source=preCombinedPlanningSource(path,preRelicEquipCiSource(path,preSilentFinalCiSource(path,readFileSync(path,'utf8'))),'flow'),prior=preWatcherFlowPlanningSource(path,source);
 assert.notEqual(source,prior);
 assert.equal(hash(prior),'54d5380ac20148b37866cb5a01e16bee76f6d9df5b013af9a29459d841969f56');
 const floor=savedWatcherFlowPlanningFloor,bytes=readFileSync(floor.sourceLog),log=gunzipSync(bytes).toString('utf8');
 assert.equal(hash(bytes),floor.sourceLogSha256);assert.equal(hash(log),floor.sourceLogUncompressedSha256);
 const receiptBytes=readFileSync(floor.sourceReceipt),receipt=JSON.parse(receiptBytes);
 assert.equal(hash(receiptBytes),floor.sourceReceiptSha256);
 assert.deepEqual(receipt.targeted,{tests:11,passed:11,failed:0,skipped:0,durationMs:51775.185427,semanticMutationsKilled:6,realCombatCasesEachVm:28});
 for(const line of ['tests 11','pass 11','fail 0','cancelled 0','skipped 0','duration_ms 51775.185427'])assert.ok(log.includes('ℹ '+line));
 assert.equal(floor.durationMs,Math.ceil(receipt.targeted.durationMs));
 const current=JSON.parse(source),previous=JSON.parse(prior);delete current.jsPlanning.localLowerBounds[watcherFlowPlanningKey];
 assert.deepEqual(current,previous,'no changes outside the single additional planning floor');
 for(const input of [source,source.replaceAll('\n','\r\n')])assert.equal(preWatcherFlowPlanningSource(path,input),prior);
 for(const input of [source+'\n',source.slice(1),source.replace('"durationMs": 55668','"durationMs": 55667'),source.replace('"unknownJsMs": 10000','"unknownJsMs": 9999'),prior,null,undefined,{},42])assert.equal(preWatcherFlowPlanningSource(path,input),input);
 assert.equal(preWatcherFlowPlanningSource('foreign',source),source);
});


test('pre-Flow current-integration inventory and planning forecasts remain reproducible without new files',()=>{
 const historical=JSON.parse(preCombinedPlanningSource(path,preRelicEquipCiSource(path,preSilentFinalCiSource(path,readFileSync(path,'utf8')))));
 const js=discoverJs().filter(file=>!encounterFormationJs.includes(file)).filter(file=>!defectFinalJs.includes(file)).filter(file=>!silentFinalJs.includes(file)).filter(file=>!relicEquipJs.includes(file)).filter(file=>![watcherFlowPlanningKey,'tests/watcher-flow-source-epoch.test.mjs',silentTacticsPlanningKey,'tests/silent-tactics-source-epoch.test.mjs',effectsTargetGroupPlanningKey,'tests/effects-target-group-source-epoch.test.mjs'].includes(file));
 const lua=currentLua().filter(file=>!['tests/lua/watcher_flow_planning.lua','tests/lua/silent_tactics_planning.lua'].includes(file));
 assert.equal(js.length,782);assert.equal(lua.length,1408);
 for(const [platform,count,expected,budget]of [['win32',17,1771239,1800000],['linux',14,1179021,1200000]]){
  const weights=Object.fromEntries(js.map(file=>[file,Math.max(historical.js[platform][file]??historical.unknownJsMs,historical.jsPlanning.localLowerBounds[file]?.durationMs??0)]));
  const loads=partition(js,`1/${count}`,weights,historical.unknownJsMs,Array.from({length:count},(_,i)=>i===0?historical.initialMs[platform][0]:0)).loads;
  let maximum=Math.max(...loads);
  if(platform==='win32'){
   const bins=Array.from({length:count},(_,i)=>shardLuaScripts(lua,`${i+1}/${count}`,{...historical,windowsJsShardMs:loads},2));
   const cost=file=>historical.luaShard[file]??historical.lua[file]??historical.unknownLuaMs,safety=file=>historical.lua[file]??historical.unknownLuaMs;
   maximum=Math.max(...bins.map((bin,i)=>{const pool=[0,0];for(const file of bin.filter(file=>safety(file)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(file);return loads[i]+bin.filter(file=>safety(file)>=10000).reduce((sum,file)=>sum+cost(file),0)+Math.max(...pool);}));
  }
  assert.equal(maximum+60000,expected);assert.ok(expected<budget);
 }
});


test('current complete Flow integration run monotonically raises the saved planning floor',()=>{
 const floor=watcherFlowPlanningFloor,bytes=readFileSync(floor.sourceLog),log=gunzipSync(bytes).toString('utf8');
 assert.equal(hash(bytes),floor.sourceLogSha256);assert.equal(hash(log),floor.sourceLogUncompressedSha256);
 const receiptBytes=readFileSync(floor.sourceReceipt),receipt=JSON.parse(receiptBytes);assert.equal(hash(receiptBytes),floor.sourceReceiptSha256);
 assert.deepEqual(receipt.previousSavedFloor,savedWatcherFlowPlanningFloor);
 assert.deepEqual(receipt.summary,{tests:11,passed:11,failed:0,cancelled:0,skipped:0,durationMs:55667.073989});
 for(const line of ['tests 11','pass 11','fail 0','cancelled 0','skipped 0','duration_ms 55667.073989'])assert.ok(log.includes('ℹ '+line));
 for(const [file,digest]of Object.entries(receipt.sourceFiles))assert.equal(hash(preCombinedGateSource(file,readFileSync(file,'utf8'),'flow')),digest);
 assert.equal(floor.durationMs,Math.ceil(receipt.summary.durationMs));assert.equal(floor.durationMs,55668);assert.ok(floor.durationMs>savedWatcherFlowPlanningFloor.durationMs);
 const current=preCombinedPlanningSource(path,preRelicEquipCiSource(path,preSilentFinalCiSource(path,readFileSync(path,'utf8'))),'flow'),previous=JSON.parse(current);previous.jsPlanning.localLowerBounds[watcherFlowPlanningKey]=savedWatcherFlowPlanningFloor;
 const savedSource=JSON.stringify(previous,null,2)+'\n';assert.equal(hash(savedSource),'fa041e8a3ed7b10e0498491eb5ba1aba18af019db76ffa746fe85268ae562e34');
 assert.equal(preWatcherFlowPlanningSource(path,savedSource),preWatcherFlowPlanningSource(path,current));
});

test('Silent tactics complete local run contributes only an authenticated planning floor',()=>{
 const source=preCombinedPlanningSource(path,preRelicEquipCiSource(path,preSilentFinalCiSource(path,readFileSync(path,'utf8'))),'silent'),prior=preSilentTacticsPlanningSource(path,source),floor=silentTacticsPlanningFloor;
 assert.notEqual(source,prior);assert.equal(hash(prior),'54d5380ac20148b37866cb5a01e16bee76f6d9df5b013af9a29459d841969f56');
 const bytes=readFileSync(floor.sourceLog),log=gunzipSync(bytes).toString('utf8');
 assert.equal(hash(bytes),floor.sourceLogSha256);assert.equal(hash(log),floor.sourceLogUncompressedSha256);
 const receiptBytes=readFileSync(floor.sourceReceipt),receipt=JSON.parse(receiptBytes);assert.equal(hash(receiptBytes),floor.sourceReceiptSha256);
 assert.deepEqual(receipt.targeted,{tests:12,passed:12,failed:0,skipped:0,cancelled:0,durationMs:21635.944135,casesPerVm:585,graphsPerVm:1170,semanticMutationsKilled:16,realCombatCasesEachVm:60});
 for(const line of ['tests 12','pass 12','fail 0','cancelled 0','skipped 0','duration_ms 21635.944135'])assert.ok(log.includes('ℹ '+line));
 assert.equal(floor.durationMs,Math.ceil(receipt.targeted.durationMs));
 const current=JSON.parse(source),previous=JSON.parse(prior);delete current.jsPlanning.localLowerBounds[silentTacticsPlanningKey];assert.deepEqual(current,previous);
 for(const input of [source,source.replaceAll('\n','\r\n')])assert.equal(preSilentTacticsPlanningSource(path,input),prior);
 for(const input of [source+'\n',source.slice(1),source.replace('"durationMs": 21636','"durationMs": 21635'),source.replace('"unknownJsMs": 10000','"unknownJsMs": 9999'),prior,null,undefined,{},42])assert.equal(preSilentTacticsPlanningSource(path,input),input);
 assert.equal(preSilentTacticsPlanningSource('foreign',source),source);
});

test('Effects target group complete local run adds only an authenticated conservative planning floor',()=>{
 const source=preCombinedPlanningSource(path,preRelicEquipCiSource(path,preSilentFinalCiSource(path,readFileSync(path,'utf8'))),'effects'),prior=preEffectsTargetGroupPlanningSource(path,source),floor=effectsTargetGroupPlanningFloor;
 assert.notEqual(source,prior);assert.equal(hash(prior),'54d5380ac20148b37866cb5a01e16bee76f6d9df5b013af9a29459d841969f56');
 const bytes=readFileSync(floor.sourceLog),log=gunzipSync(bytes).toString('utf8');
 assert.equal(hash(bytes),floor.sourceLogSha256);assert.equal(hash(log),floor.sourceLogUncompressedSha256);
 const receiptBytes=readFileSync(floor.sourceReceipt),receipt=JSON.parse(receiptBytes);assert.equal(hash(receiptBytes),floor.sourceReceiptSha256);
 assert.deepEqual(receipt.targeted,{tests:5,passed:5,failed:0,skipped:0,cancelled:0,durationMs:7661.276801,scenarios:51,entryPoints:3,checkpoints:2,snapshotsPerVm:306,semanticMutationsKilled:11});
 for(const line of ['tests 5','pass 5','fail 0','cancelled 0','skipped 0','duration_ms 7661.276801'])assert.ok(log.includes('ℹ '+line));
 for(const [file,sha]of Object.entries(receipt.sourceIdentity.files))assert.equal(hash(preCombinedGateSource(file,readFileSync(file,'utf8').replaceAll('\r\n','\n'),'effects')),sha,file);
 assert.equal(floor.durationMs,Math.ceil(receipt.targeted.durationMs));
 for(const platform of ['win32','linux'])assert.equal(currentJsPlanningWeights([effectsTargetGroupPlanningKey],platform)[effectsTargetGroupPlanningKey],10000);
 const current=JSON.parse(source),previous=JSON.parse(prior);delete current.jsPlanning.localLowerBounds[effectsTargetGroupPlanningKey];assert.deepEqual(current,previous);
 for(const input of [source,source.replaceAll('\n','\r\n')])assert.equal(preEffectsTargetGroupPlanningSource(path,input),prior);
 for(const input of [source+'\n',source.slice(1),source.replace('"durationMs": 7662','"durationMs": 7661'),source.replace('"unknownJsMs": 10000','"unknownJsMs": 9999'),prior,null,undefined,{},42])assert.equal(preEffectsTargetGroupPlanningSource(path,input),input);
 assert.equal(preEffectsTargetGroupPlanningSource('foreign',source),source);
});


test('combined planning projection authenticates exact sibling bytes and rejects partial or foreign drift',()=>{
 const source=preRelicEquipCiSource(path,preSilentFinalCiSource(path,readFileSync(path,'utf8'))),base=preCombinedPlanningSource(path,source);
 assert.equal(hash(source.replaceAll('\r\n','\n')),'db3b3dbb80f68d57c655f30efc2fb851fc83a61c5ce682b726a5369dc34ad9ba');
 for(const [epoch,key,floor,inverse]of [['flow',watcherFlowPlanningKey,watcherFlowPlanningFloor,preWatcherFlowPlanningSource],['silent',silentTacticsPlanningKey,silentTacticsPlanningFloor,preSilentTacticsPlanningSource],['effects',effectsTargetGroupPlanningKey,effectsTargetGroupPlanningFloor,preEffectsTargetGroupPlanningSource]]){
  const isolated=preCombinedPlanningSource(path,source,epoch);
  assert.equal(inverse(path,isolated),base);
  assert.deepEqual(JSON.parse(isolated).jsPlanning.localLowerBounds[key],floor);
  for(const input of [source,source.replaceAll('\n','\r\n')])assert.equal(preCombinedPlanningSource(path,input,epoch),isolated);
  const partial=JSON.parse(source);delete partial.jsPlanning.localLowerBounds[key];
  for(const input of [source+'\n',source.slice(1),JSON.stringify(partial,null,2)+'\n',source.replace('"durationMs": '+floor.durationMs,'"durationMs": '+(floor.durationMs-1)),source.replace('"unknownJsMs": 10000','"unknownJsMs": 9999'),isolated,base,null,undefined,{},42])assert.equal(preCombinedPlanningSource(path,input,epoch),input);
  assert.equal(preCombinedPlanningSource('foreign',source,epoch),source);
 }
 assert.throws(()=>preCombinedPlanningSource(path,source,'unknown'),/known frozen sibling/);
});

test('isolated published sibling inventories and forecasts remain independently reproducible',()=>{
 for(const [epoch,ownJs,ownLua,windows,posix]of [['flow',[watcherFlowPlanningKey,'tests/watcher-flow-source-epoch.test.mjs'],['tests/lua/watcher_flow_planning.lua'],1775788,1183709],['silent',[silentTacticsPlanningKey,'tests/silent-tactics-source-epoch.test.mjs'],['tests/lua/silent_tactics_planning.lua'],1773802,1181278],['effects',[effectsTargetGroupPlanningKey,'tests/effects-target-group-source-epoch.test.mjs'],[],1772722,1180447]]){
 const historical=JSON.parse(preCombinedPlanningSource(path,preRelicEquipCiSource(path,preSilentFinalCiSource(path,readFileSync(path,'utf8'))),epoch));
 const js=discoverJs().filter(file=>!encounterFormationJs.includes(file)).filter(file=>!defectFinalJs.includes(file)).filter(file=>!silentFinalJs.includes(file)).filter(file=>!relicEquipJs.includes(file)).filter(file=>![watcherFlowPlanningKey,'tests/watcher-flow-source-epoch.test.mjs',silentTacticsPlanningKey,'tests/silent-tactics-source-epoch.test.mjs',effectsTargetGroupPlanningKey,'tests/effects-target-group-source-epoch.test.mjs'].includes(file)||ownJs.includes(file));
 const lua=currentLua().filter(file=>!['tests/lua/watcher_flow_planning.lua','tests/lua/silent_tactics_planning.lua'].includes(file)||ownLua.includes(file));
 assert.equal(js.length,784);assert.equal(lua.length,1408+ownLua.length);
 for(const [platform,count,expected,budget]of [['win32',17,windows,1800000],['linux',14,posix,1200000]]){
  const weights=Object.fromEntries(js.map(file=>[file,Math.max(historical.js[platform][file]??historical.unknownJsMs,historical.jsPlanning.localLowerBounds[file]?.durationMs??0)]));
  const loads=partition(js,`1/${count}`,weights,historical.unknownJsMs,Array.from({length:count},(_,i)=>i===0?historical.initialMs[platform][0]:0)).loads;
  let maximum=Math.max(...loads);
  if(platform==='win32'){
   const bins=Array.from({length:count},(_,i)=>shardLuaScripts(lua,`${i+1}/${count}`,{...historical,windowsJsShardMs:loads},2));
   const cost=file=>historical.luaShard[file]??historical.lua[file]??historical.unknownLuaMs,safety=file=>historical.lua[file]??historical.unknownLuaMs;
   maximum=Math.max(...bins.map((bin,i)=>{const pool=[0,0];for(const file of bin.filter(file=>safety(file)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(file);return loads[i]+bin.filter(file=>safety(file)>=10000).reduce((sum,file)=>sum+cost(file),0)+Math.max(...pool);}));
  }
  assert.equal(maximum+60000,expected);assert.ok(expected<budget);
 }
 }
});

test('combined gate receipt projection rejects drift and authenticates all three published siblings',()=>{
 const file='scripts/check-lua-static.mjs',source=preRelicEquipCiSource(file,readFileSync(file,'utf8'));
 for(const epoch of ['flow','silent','effects']){
  const prior=preCombinedGateSource(file,source,epoch);assert.notEqual(prior,source);
  assert.equal(preCombinedGateSource(file,source.replaceAll('\n','\r\n'),epoch),prior);
  for(const input of [source+'\n',source.slice(1),source.replace('visitTargetGroup','foreignHelper'),prior,null,undefined,{},42])assert.equal(preCombinedGateSource(file,input,epoch),input);
  assert.equal(preCombinedGateSource('foreign',source,epoch),source);
 }
 assert.throws(()=>preCombinedGateSource(file,source,'unknown'),/known frozen sibling/);
});

test('Relic equip CI outer epoch preserves all old costs and exact gate bytes while rejecting partial drift',()=>{
 const source=preSilentFinalCiSource(path,readFileSync(path,'utf8')),prior=preRelicEquipCiSource(path,source);
 assert.notEqual(source,prior);assert.equal(hash(prior),'db3b3dbb80f68d57c655f30efc2fb851fc83a61c5ce682b726a5369dc34ad9ba');
 const current=JSON.parse(source),previous=JSON.parse(prior);
 assert.deepEqual(current.jsPlanning.localLowerBounds[relicEquipPlanningKey],relicEquipPlanningFloor);
 delete current.jsPlanning.localLowerBounds[relicEquipPlanningKey];assert.deepEqual(current,previous);
 for(const file of [path,'scripts/check-lua-static.mjs']){
  const source=preSilentFinalCiSource(file,readFileSync(file,'utf8')),before=preRelicEquipCiSource(file,source);assert.notEqual(before,source);
  for(const input of [source,source.replaceAll('\n','\r\n')])assert.equal(preRelicEquipCiSource(file,input),before);
  for(const input of [source+'\n',source.slice(1),source.replace('"unknownJsMs": 10000','"unknownJsMs": 9999').replace("'RelicHooks.onEquip'","'foreign.onEquip'"),before,null,undefined,{},17]){
   if(input!==source)assert.equal(preRelicEquipCiSource(file,input),input);
  }
  assert.equal(preRelicEquipCiSource('foreign',source),source);
 }
 const partial=JSON.parse(source);delete partial.jsPlanning.localLowerBounds[watcherFlowPlanningKey];
 assert.equal(preRelicEquipCiSource(path,JSON.stringify(partial,null,2)+'\n'),JSON.stringify(partial,null,2)+'\n');
});

test('Relic equip floor authenticates a complete saved local file without fabricating hosted observations',()=>{
 const floor=relicEquipPlanningFloor,bytes=readFileSync(floor.sourceLog),log=gunzipSync(bytes).toString('utf8');
 assert.equal(hash(bytes),floor.sourceLogSha256);assert.equal(hash(log),floor.sourceLogUncompressedSha256);
 const receiptBytes=readFileSync(floor.sourceReceipt),receipt=JSON.parse(receiptBytes);assert.equal(hash(receiptBytes),floor.sourceReceiptSha256);
 assert.equal(floor.durationMs,Math.ceil(floor.nodeReportedDurationMs));
 for(const line of ['tests 15','pass 15','fail 0','cancelled 0','skipped 0','duration_ms '+floor.nodeReportedDurationMs])assert.ok(log.includes('ℹ '+line),line);
 assert.match(floor.kind,/not .*hosted/);assert.match(floor.coverage,/15\/15/);
 for(const platform of ['win32','linux']){assert.equal(actualCurrentTimings.js[platform][relicEquipPlanningKey],undefined);assert.equal(currentJsPlanningWeights([relicEquipPlanningKey],platform)[relicEquipPlanningKey],Math.max(10000,floor.durationMs));}
 assert.equal(receipt.testFile,relicEquipPlanningKey);
 assert.deepEqual([receipt.tests,receipt.pass,receipt.fail,receipt.cancelled,receipt.skipped],[15,15,0,0,0]);
 assert.equal(receipt.durationMs,floor.nodeReportedDurationMs);assert.equal(receipt.logSha256,floor.sourceLogUncompressedSha256);assert.equal(receipt.compressedLogSha256,floor.sourceLogSha256);
 assert.equal(hash(readFileSync(receipt.sourcePath,'utf8').replaceAll('\r\n','\n')),receipt.sourceSha256);
 assert.equal(hash(readFileSync(receipt.testFile,'utf8').replaceAll('\r\n','\n')),receipt.testSha256);
});

test('pre-Relic equip published Full36 inventory and forecasts remain independently reproducible',()=>{
 const historical=JSON.parse(preRelicEquipCiSource(path,preSilentFinalCiSource(path,readFileSync(path,'utf8')))),js=discoverJs().filter(file=>!encounterFormationJs.includes(file)).filter(file=>!defectFinalJs.includes(file)).filter(file=>!silentFinalJs.includes(file)).filter(file=>!relicEquipJs.includes(file)),lua=currentLua();
 assert.equal(js.length,788);assert.equal(lua.length,1410);
 for(const [platform,count,expected]of [['win32',17,1779486],['linux',14,1187400]]){
  const weights=Object.fromEntries(js.map(file=>[file,Math.max(historical.js[platform][file]??historical.unknownJsMs,historical.jsPlanning.localLowerBounds[file]?.durationMs??0)]));
  const loads=partition(js,`1/${count}`,weights,historical.unknownJsMs,Array.from({length:count},(_,i)=>i===0?historical.initialMs[platform][0]:0)).loads;
  let maximum=Math.max(...loads);
  if(platform==='win32'){
   const bins=Array.from({length:count},(_,i)=>shardLuaScripts(lua,`${i+1}/${count}`,{...historical,windowsJsShardMs:loads},2));
   const cost=file=>historical.luaShard[file]??historical.lua[file]??historical.unknownLuaMs,safety=file=>historical.lua[file]??historical.unknownLuaMs;
   maximum=Math.max(...bins.map((bin,i)=>{const pool=[0,0];for(const file of bin.filter(file=>safety(file)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(file);return loads[i]+bin.filter(file=>safety(file)>=10000).reduce((sum,file)=>sum+cost(file),0)+Math.max(...pool);}));
  }
  assert.equal(maximum+60000,expected);
 }
});

test('Silent final CI outer epoch preserves exact predecessor costs and gate bytes and rejects drift',()=>{
 const source=readFileSync(path,'utf8'),prior=preSilentFinalCiSource(path,source),current=JSON.parse(source),previous=JSON.parse(prior);
 assert.notEqual(source,prior);
 assert.deepEqual(current.jsPlanning.localLowerBounds[silentFinalPlanningKey],silentFinalPlanningFloor);
 assert.deepEqual(current.jsPlanning.localLowerBounds[silentFinalSourcePlanningKey],silentFinalSourcePlanningFloor);
 delete current.jsPlanning.localLowerBounds[silentFinalSourcePlanningKey];delete current.jsPlanning.localLowerBounds[silentFinalPlanningKey];assert.deepEqual(current,previous);
 for(const file of [path,'scripts/check-lua-static.mjs']){
  const source=readFileSync(file,'utf8'),before=preSilentFinalCiSource(file,source);assert.notEqual(before,source);
  for(const input of [source,source.replaceAll('\n','\r\n')])assert.equal(preSilentFinalCiSource(file,input),before);
  for(const input of [source+'\n',source.slice(1),before,null,undefined,{},17])assert.equal(preSilentFinalCiSource(file,input),input);
  assert.equal(preSilentFinalCiSource('foreign',source),source);
 }
 const partial=JSON.parse(source);delete partial.jsPlanning.localLowerBounds[relicEquipPlanningKey];
 const text=JSON.stringify(partial,null,2)+'\n';assert.equal(preSilentFinalCiSource(path,text),text);
});

test('Silent final planning floor authenticates the complete saved local file without hosted observations',()=>{
 const floor=silentFinalPlanningFloor,bytes=readFileSync(floor.sourceLog),log=gunzipSync(bytes).toString('utf8');
 assert.equal(hash(bytes),floor.sourceLogSha256);assert.equal(hash(log),floor.sourceLogUncompressedSha256);
 const receiptBytes=readFileSync(floor.sourceReceipt),receipt=JSON.parse(receiptBytes);assert.equal(hash(receiptBytes),floor.sourceReceiptSha256);
 assert.equal(floor.durationMs,Math.ceil(Math.max(floor.nodeReportedDurationMs,floor.priorCompleteRun.nodeReportedDurationMs)));
 const priorLog=readFileSync(floor.priorCompleteRun.sourceLog);assert.equal(hash(priorLog),floor.priorCompleteRun.sourceLogSha256);
 for(const line of ['tests 16','pass 16','fail 0','cancelled 0','skipped 0','duration_ms '+floor.priorCompleteRun.nodeReportedDurationMs])assert.ok(gunzipSync(priorLog).toString().includes('ℹ '+line));
 for(const line of ['tests '+receipt.tests,'pass '+receipt.tests,'fail 0','cancelled 0','skipped 0','duration_ms '+floor.nodeReportedDurationMs])assert.ok(log.includes('ℹ '+line),line);
 assert.ok(receipt.tests>0);assert.match(floor.kind,/not .*hosted/);
 for(const platform of ['win32','linux']){assert.equal(actualCurrentTimings.js[platform][silentFinalPlanningKey],undefined);assert.equal(currentJsPlanningWeights([silentFinalPlanningKey],platform)[silentFinalPlanningKey],Math.max(10000,floor.durationMs));}
 assert.equal(receipt.testFile,silentFinalPlanningKey);assert.deepEqual([receipt.pass,receipt.fail,receipt.cancelled,receipt.skipped],[receipt.tests,0,0,0]);
 assert.equal(receipt.durationMs,floor.nodeReportedDurationMs);assert.equal(receipt.logSha256,floor.sourceLogUncompressedSha256);assert.equal(receipt.compressedLogSha256,floor.sourceLogSha256);
 assert.equal(hash(readFileSync(receipt.sourcePath,'utf8').replaceAll('\r\n','\n')),receipt.sourceSha256);
 assert.equal(hash(readFileSync(receipt.testFile,'utf8').replaceAll('\r\n','\n')),receipt.testSha256);
 assert.equal(Object.keys(receipt.inputSha256).length,9);
 for(const [file,sha]of Object.entries(receipt.inputSha256))assert.equal(hash(readFileSync(file,'utf8').replaceAll('\r\n','\n')),sha,file);
});


test('pre-Silent final published Full36 inventory and forecasts remain independently reproducible',()=>{
 const historical=JSON.parse(preSilentFinalCiSource(path,readFileSync(path,'utf8'))),js=discoverJs().filter(file=>!encounterFormationJs.includes(file)).filter(file=>!defectFinalJs.includes(file)).filter(file=>!silentFinalJs.includes(file)),lua=currentLua();
 assert.equal(js.length,791);assert.equal(lua.length,1410);
 for(const [platform,count,expected]of [['win32',17,1781066],['linux',14,1189539]]){
  const weights=Object.fromEntries(js.map(file=>[file,Math.max(historical.js[platform][file]??historical.unknownJsMs,historical.jsPlanning.localLowerBounds[file]?.durationMs??0)]));
  const loads=partition(js,`1/${count}`,weights,historical.unknownJsMs,Array.from({length:count},(_,i)=>i===0?historical.initialMs[platform][0]:0)).loads;
  let maximum=Math.max(...loads);
  if(platform==='win32'){
   const bins=Array.from({length:count},(_,i)=>shardLuaScripts(lua,`${i+1}/${count}`,{...historical,windowsJsShardMs:loads},2));
   const cost=file=>historical.luaShard[file]??historical.lua[file]??historical.unknownLuaMs,safety=file=>historical.lua[file]??historical.unknownLuaMs;
   maximum=Math.max(...bins.map((bin,i)=>{const pool=[0,0];for(const file of bin.filter(file=>safety(file)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(file);return loads[i]+bin.filter(file=>safety(file)>=10000).reduce((sum,file)=>sum+cost(file),0)+Math.max(...pool);}));
  }
  assert.equal(maximum+60000,expected);
 }
});

test('Silent final source-contract floor preserves the observed complete file cost above the unknown minimum',()=>{
 const floor=silentFinalSourcePlanningFloor,bytes=readFileSync(floor.sourceLog),log=gunzipSync(bytes).toString('utf8');
 assert.equal(hash(bytes),floor.sourceLogSha256);assert.equal(hash(log),floor.sourceLogUncompressedSha256);
 assert.equal(hash(readFileSync(silentFinalSourcePlanningKey,'utf8').replaceAll('\r\n','\n')),floor.testSha256);
 assert.equal(Object.keys(floor.inputSha256).length,6);
 for(const [file,sha]of Object.entries(floor.inputSha256)){const raw=readFileSync(file);assert.equal(hash(file.endsWith('.gz')?raw:raw.toString('utf8').replaceAll('\r\n','\n')),sha,file);}
 assert.match(floor.measurementScope,/not an isolated or hosted benchmark/);
 assert.equal(floor.durationMs,Math.ceil(floor.nodeReportedDurationMs));
 for(const line of ['tests 9','pass 9','fail 0','cancelled 0','skipped 0','duration_ms '+floor.nodeReportedDurationMs])assert.ok(log.includes('ℹ '+line),line);
 assert.match(floor.kind,/not .*hosted/);
 for(const platform of ['win32','linux']){assert.equal(actualCurrentTimings.js[platform][silentFinalSourcePlanningKey],undefined);assert.equal(currentJsPlanningWeights([silentFinalSourcePlanningKey],platform)[silentFinalSourcePlanningKey],Math.max(10000,floor.durationMs));}
});

test('Defect final CI outer epoch preserves complete predecessor costs and exact source receipt inputs',()=>{
 const source=rawReadFileSync(path,'utf8'),prior=preDefectFinalCiSource(path,source),current=JSON.parse(source),previous=JSON.parse(prior);
 for(const [key,floor]of Object.entries(defectFinalPlanningFloors)){
  assert.deepEqual(current.jsPlanning.localLowerBounds[key],floor);delete current.jsPlanning.localLowerBounds[key];
 }
 assert.deepEqual(current,previous,'all old costs, provenance and planning settings remain unchanged');
 for(const file of [path,'scripts/check-lua-static.mjs','tests/helpers/combined-epoch/source-epoch.mjs','tests/helpers/copy-integration-source-closure.mjs','tests/silent-final-source-epoch.test.mjs']){
  const source=rawReadFileSync(file,'utf8'),before=preDefectFinalCiSource(file,source);assert.notEqual(before,source,file);
  assert.equal(preDefectFinalCiSource(file,source.replaceAll('\r\n','\n').replaceAll('\n','\r\n')),before);
  for(const input of [source+'\n',source.slice(1),before,null,undefined,{},17])assert.equal(preDefectFinalCiSource(file,input),input);
  assert.equal(preDefectFinalCiSource('foreign',source),source);
 }
 const partial=JSON.parse(source);delete partial.jsPlanning.localLowerBounds[silentFinalPlanningKey];
 const text=JSON.stringify(partial,null,2)+'\n';assert.equal(preDefectFinalCiSource(path,text),text);
});

test('Defect final floors authenticate complete fresh local files without inventing hosted observations',()=>{
 assert.ok(Object.keys(defectFinalPlanningFloors).length>0);
 for(const [key,floor]of Object.entries(defectFinalPlanningFloors)){
  const bytes=rawReadFileSync(floor.sourceLog),log=gunzipSync(bytes).toString('utf8');
  assert.equal(hash(bytes),floor.sourceLogSha256);assert.equal(hash(log),floor.sourceLogUncompressedSha256);
  const receiptBytes=rawReadFileSync(floor.sourceReceipt),receipt=JSON.parse(receiptBytes);assert.equal(hash(receiptBytes),floor.sourceReceiptSha256);
  assert.equal(receipt.testFile,key);assert.deepEqual([receipt.tests,receipt.pass,receipt.fail,receipt.cancelled,receipt.skipped],[floor.tests,floor.tests,0,0,0]);assert.equal(receipt.durationMs,floor.nodeReportedDurationMs);assert.equal(receipt.testSha256,floor.testSha256);assert.deepEqual(receipt.inputSha256,floor.inputSha256);assert.equal(receipt.logSha256,floor.sourceLogUncompressedSha256);assert.equal(receipt.compressedLogSha256,floor.sourceLogSha256);assert.equal(receipt.beforeAfterHashesMatched,true);
  assert.equal(hash(rawReadFileSync(key,'utf8').replaceAll('\r\n','\n')),floor.testSha256);
  if(receipt.earlierHarnessReceipt){
   const prior=receipt.earlierHarnessReceipt,priorBytes=rawReadFileSync(prior.path);assert.equal(hash(priorBytes),prior.sha256);const old=JSON.parse(priorBytes);assert.equal(old.durationMs,prior.durationMs);
   const oldLog=rawReadFileSync(old.sourceLog);assert.equal(hash(oldLog),old.sourceLogSha256);assert.equal(hash(gunzipSync(oldLog)),old.sourceLogUncompressedSha256);assert.ok(gunzipSync(oldLog).toString().includes('ℹ duration_ms '+old.durationMs));
   const earlier=receipt.earlierHarnessSource,oldVm=rawReadFileSync(earlier.path);assert.equal(hash(oldVm),earlier.sha256);assert.equal(hash(gunzipSync(oldVm)),earlier.uncompressedSha256);assert.equal(earlier.uncompressedSha256,old.beforeAfterInputHashes['tests/helpers/defect-final-execute-vm.mjs']);
   const eq=receipt.serializationEquivalence,stream=rawReadFileSync(eq.graphArchive),decoded=gunzipSync(stream);assert.equal(hash(stream),eq.graphArchiveSha256);assert.equal(hash(decoded),eq.beforeSha256);assert.equal(eq.beforeSha256,eq.afterSha256);assert.equal(decoded.length,eq.bytes);
  }
  assert.ok(floor.tests>0);assert.equal(floor.durationMs,Math.ceil(Math.max(floor.nodeReportedDurationMs,floor.priorCompleteRun?.nodeReportedDurationMs??0)));
  if(floor.priorCompleteRun){const prior=floor.priorCompleteRun,bytes=rawReadFileSync(prior.sourceLog),log=gunzipSync(bytes).toString('utf8');assert.equal(hash(bytes),prior.sourceLogSha256);assert.equal(hash(log),prior.sourceLogUncompressedSha256);assert.equal(hash(rawReadFileSync(prior.sourceReceipt)),prior.sourceReceiptSha256);for(const line of ['tests '+floor.tests,'pass '+floor.tests,'fail 0','cancelled 0','skipped 0','duration_ms '+prior.nodeReportedDurationMs])assert.ok(log.includes('ℹ '+line),line);}
  for(const line of ['tests '+floor.tests,'pass '+floor.tests,'fail 0','cancelled 0','skipped 0','duration_ms '+floor.nodeReportedDurationMs])assert.ok(log.includes('ℹ '+line),line);
  assert.match(floor.kind,/not .*hosted/);assert.match(floor.measurementScope,/not an isolated or hosted benchmark/);
  assert.ok(Object.keys(floor.inputSha256).length>0);
  for(const [file,sha]of Object.entries(floor.inputSha256)){const raw=rawReadFileSync(file);assert.equal(hash(file.endsWith('.gz')?raw:raw.toString('utf8').replaceAll('\r\n','\n')),sha,file);}
  for(const platform of ['win32','linux']){assert.equal(actualCurrentTimings.js[platform][key],undefined);assert.equal(currentJsPlanningWeights([key],platform)[key],Math.max(10000,floor.durationMs));}
 }
});

test('pre-Defect final published Full36 inventory and forecasts remain independently reproducible',()=>{
 const historical=JSON.parse(preDefectFinalCiSource(path,rawReadFileSync(path,'utf8'))),js=discoverJs().filter(file=>!encounterFormationJs.includes(file)).filter(file=>!defectFinalJs.includes(file)),lua=currentLua();
 assert.equal(js.length,794);assert.equal(lua.length,1410);
 for(const [platform,count,expected]of [['win32',17,1785094],['linux',14,1194369]]){
  const weights=Object.fromEntries(js.map(file=>[file,Math.max(historical.js[platform][file]??historical.unknownJsMs,historical.jsPlanning.localLowerBounds[file]?.durationMs??0)]));
  const loads=partition(js,`1/${count}`,weights,historical.unknownJsMs,Array.from({length:count},(_,i)=>i===0?historical.initialMs[platform][0]:0)).loads;
  let maximum=Math.max(...loads);
  if(platform==='win32'){
   const bins=Array.from({length:count},(_,i)=>shardLuaScripts(lua,`${i+1}/${count}`,{...historical,windowsJsShardMs:loads},2));
   const cost=file=>historical.luaShard[file]??historical.lua[file]??historical.unknownLuaMs,safety=file=>historical.lua[file]??historical.unknownLuaMs;
   maximum=Math.max(...bins.map((bin,i)=>{const pool=[0,0];for(const file of bin.filter(file=>safety(file)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(file);return loads[i]+bin.filter(file=>safety(file)>=10000).reduce((sum,file)=>sum+cost(file),0)+Math.max(...pool);}));
  }
  assert.equal(maximum+60000,expected);
 }
});

test('Encounter formation CI outer epoch preserves every prior cost and admits only complete current input identities',()=>{
 const source=diskReadFileSync(path,'utf8'),prior=preEncounterFormationCiSource(path,source),current=JSON.parse(source),previous=JSON.parse(prior);
 for(const [key,floor]of Object.entries(encounterFormationPlanningFloors)){
  assert.deepEqual(current.jsPlanning.localLowerBounds[key],floor);delete current.jsPlanning.localLowerBounds[key];
 }
 assert.deepEqual(current,previous,'all old costs, provenance and planning settings remain unchanged');
 for(const file of [path,'scripts/check-lua-static.mjs','src/lua/abyss_encounter_formation.lua','tests/helpers/combined-epoch/source-epoch.mjs','tests/helpers/copy-integration-source-closure.mjs','tests/defect-final-source-epoch.test.mjs']){
  const source=diskReadFileSync(file,'utf8'),before=preEncounterFormationCiSource(file,source);assert.notEqual(before,source,file);
  assert.equal(preEncounterFormationCiSource(file,source.replaceAll('\r\n','\n').replaceAll('\n','\r\n')),before);
  for(const input of [source+'\n',source.slice(1),before,null,undefined,{},17])assert.equal(preEncounterFormationCiSource(file,input),input);
  for(const unknown of ['foreign','__proto__','constructor'])assert.equal(preEncounterFormationCiSource(unknown,source),source);
 }
 const partial=JSON.parse(source);delete partial.jsPlanning.localLowerBounds[Object.keys(defectFinalPlanningFloors)[0]];
 const text=JSON.stringify(partial,null,2)+'\n';assert.equal(preEncounterFormationCiSource(path,text),text);
 for(const [from,to]of [['"durationMs": 17342','"durationMs": 17341'],['"unknownJsMs": 10000','"unknownJsMs": 9999']]){
  const changed=source.replace(from,to);assert.notEqual(changed,source);assert.equal(preEncounterFormationCiSource(path,changed),changed);
 }
});

test('Encounter formation floors authenticate complete recurring files without fabricating hosted or repeated retained-scenario costs',()=>{
 assert.deepEqual(Object.keys(encounterFormationPlanningFloors).sort(),['tests/encounter-formation-responsibilities.test.mjs','tests/encounter-formation-source-epoch.test.mjs']);
 for(const [key,floor]of Object.entries(encounterFormationPlanningFloors)){
  const bytes=diskReadFileSync(floor.sourceLog),log=gunzipSync(bytes).toString('utf8');
  assert.equal(hash(bytes),floor.sourceLogSha256);assert.equal(hash(log),floor.sourceLogUncompressedSha256);
  const receiptBytes=diskReadFileSync(floor.sourceReceipt),receipt=JSON.parse(receiptBytes);assert.equal(hash(receiptBytes),floor.sourceReceiptSha256);
  assert.equal(receipt.testFile,key);assert.deepEqual([receipt.tests,receipt.pass,receipt.fail,receipt.cancelled,receipt.skipped],[floor.tests,floor.tests,0,0,0]);
  assert.equal(receipt.durationMs,floor.nodeReportedDurationMs);assert.equal(receipt.testSha256,floor.testSha256);assert.deepEqual(receipt.inputSha256,floor.inputSha256);
  assert.equal(receipt.logSha256,floor.sourceLogUncompressedSha256);assert.equal(receipt.compressedLogSha256,floor.sourceLogSha256);assert.equal(receipt.beforeAfterHashesMatched,true);
  assert.equal(hash(diskReadFileSync(key,'utf8').replaceAll('\r\n','\n')),floor.testSha256);
  assert.equal(floor.durationMs,Math.ceil(floor.nodeReportedDurationMs));
  for(const line of ['tests '+floor.tests,'pass '+floor.tests,'fail 0','cancelled 0','skipped 0','duration_ms '+floor.nodeReportedDurationMs])assert.ok(log.includes('ℹ '+line),line);
  assert.match(floor.kind,/not .*hosted/);assert.match(floor.measurementScope,/not an isolated or hosted benchmark/);
  assert.ok(Object.keys(floor.inputSha256).length>0);
  for(const [file,sha]of Object.entries(floor.inputSha256)){const raw=diskReadFileSync(file);assert.equal(hash(file.endsWith('.gz')?raw:raw.toString('utf8').replaceAll('\r\n','\n')),sha,file);}
  for(const platform of ['win32','linux']){assert.equal(actualCurrentTimings.js[platform][key],undefined);assert.equal(currentJsPlanningWeights([key],platform)[key],Math.max(10000,floor.durationMs));}
 }
 assert.equal(encounterFormationPlanningFloors['tests/encounter-formation-responsibilities.test.mjs'].durationMs,7322);
 assert.equal(currentJsPlanningWeights(['tests/encounter-formation-responsibilities.test.mjs'],'linux')['tests/encounter-formation-responsibilities.test.mjs'],10000,'retain the complete unknown-file planning floor');
 assert.equal(actualCurrentTimings.jsPlanning.localLowerBounds['docs/evidence/m7-formation-20261109/retained-double-vm.mjs'],undefined,'one-time additional old/new evidence is not a recurring discovered file');
 assert.equal(actualCurrentTimings.jsPlanning.localLowerBounds['tests/encounter-formation-complexity.test.mjs'],undefined);
});

test('pre-Formation Full36 inventory and forecasts remain independently reproducible and all 1410 original Lua files stay unchanged',()=>{
 const historical=JSON.parse(preEncounterFormationCiSource(path,diskReadFileSync(path,'utf8'))),js=discoverJs().filter(file=>!encounterFormationJs.includes(file)),lua=currentLua();
 assert.equal(js.length,797);assert.equal(lua.length,1410);
 assert.deepEqual([...js].sort(),encounterFormationCiInventory.js);
 assert.deepEqual(lua,Object.keys(encounterFormationCiInventory.luaSha256));
 for(const [file,sha]of Object.entries(encounterFormationCiInventory.luaSha256))assert.equal(hash(diskReadFileSync(file,'utf8').replaceAll('\r\n','\n')),sha,file);
 assert.equal(discoverJs().length,800);assert.deepEqual(discoverJs().filter(file=>encounterFormationJs.includes(file)).sort(),[...encounterFormationJs].sort());
 for(const [platform,count,expected]of [['win32',17,1791774],['linux',14,1202485]]){
  const weights=Object.fromEntries(js.map(file=>[file,Math.max(historical.js[platform][file]??historical.unknownJsMs,historical.jsPlanning.localLowerBounds[file]?.durationMs??0)]));
  const loads=partition(js,`1/${count}`,weights,historical.unknownJsMs,Array.from({length:count},(_,i)=>i===0?historical.initialMs[platform][0]:0)).loads;
  let maximum=Math.max(...loads);
  if(platform==='win32'){
   const bins=Array.from({length:count},(_,i)=>shardLuaScripts(lua,`${i+1}/${count}`,{...historical,windowsJsShardMs:loads},2));
   const cost=file=>historical.luaShard[file]??historical.lua[file]??historical.unknownLuaMs,safety=file=>historical.lua[file]??historical.unknownLuaMs;
   maximum=Math.max(...bins.map((bin,i)=>{const pool=[0,0];for(const file of bin.filter(file=>safety(file)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(file);return loads[i]+bin.filter(file=>safety(file)>=10000).reduce((sum,file)=>sum+cost(file),0)+Math.max(...pool);}));
  }
  assert.equal(maximum+60000,expected);
 }
});

test('POSIX15 accepts only its complete approved source and preserves the exact published POSIX14 epoch',()=>{
 const {path,beforeSource,afterSource,beforeSha256,afterSha256}=posix15ShapeProof;
 assert.equal(rawReadFileSync(path,'utf8').replaceAll('\r\n','\n'),afterSource);
 assert.equal(afterSource,beforeSource.replace('length:14','length:15'),'only capacity allocation changes');
 assert.equal(hash(beforeSource),beforeSha256);assert.equal(hash(afterSource),afterSha256);
 for(const source of [afterSource,afterSource.replaceAll('\n','\r\n')])assert.equal(prePosix15ShapeSource(path,source),beforeSource);
 for(const source of [beforeSource,afterSource+'\n',afterSource.slice(1),afterSource.replace('length:17','length:18'),afterSource.replace('length:15','length:16'),null,undefined,{},42])assert.equal(prePosix15ShapeSource(path,source),source);
 for(const other of ['foreign','scripts/ci-test-timings.json'])assert.equal(prePosix15ShapeSource(other,afterSource),afterSource);
 assert.equal(prePosix14ShapeSource(path,beforeSource),frozenShapeSource);
 assert.equal(prePosix14ShapeSource(path,afterSource),afterSource,'the original POSIX14 projector still rejects POSIX15 directly');
});

test('pre-Formation unchanged complete weights reproduce the blocked POSIX14 forecast and the POSIX15 capacity allocation',()=>{
 const historical=JSON.parse(preEncounterFormationCiSource(path,diskReadFileSync(path,'utf8')));
 const js=discoverJs().filter(file=>!encounterFormationJs.includes(file)),lua=currentLua();assert.equal(js.length,797);assert.equal(lua.length,1410);
 assert.deepEqual([...js].sort(),encounterFormationCiInventory.js);
 const weights=Object.fromEntries(js.map(file=>[file,Math.max(historical.js.linux[file]??historical.unknownJsMs,historical.jsPlanning.localLowerBounds[file]?.durationMs??0)]));
 const totals=[];
 for(const [count,forecast]of [[14,1202485],[15,1126323]]){
  const bins=Array.from({length:count},(_,i)=>partition(js,`${i+1}/${count}`,weights,historical.unknownJsMs,Array.from({length:count},(_,i)=>i===0?historical.initialMs.linux[0]:0)));
  assert.deepEqual(bins.flatMap(bin=>bin.files).sort(),[...js].sort());assert.equal(new Set(bins.flatMap(bin=>bin.files)).size,797);
  const loads=bins[0].loads;totals.push(loads.reduce((sum,load)=>sum+load,0));
  assert.equal(Math.max(...loads)+60000,forecast);
  assert.equal(forecast<1200000,count===15,'the original budget is unchanged; old capacity remains blocked');
 }
 assert.deepEqual(totals,[15994730,15994730],'redistribution does not claim a runtime or modeled-work reduction');
 assert.ok(totals[0]>14*(1200000-60000),'even ideal balancing cannot fit the complete unchanged work into fourteen original budgets');
 assert.equal(historical.jsPlanning.localLowerBounds['tests/defect-final-execute.test.mjs'].durationMs,89852);
 assert.equal(historical.jsPlanning.localLowerBounds['tests/defect-final-source-epoch.test.mjs'].durationMs,13784);
 assert.equal(Object.keys(historical.jsPlanning.localLowerBounds).length,30);
 const workflow=rawReadFileSync('.github/workflows/quality.yml','utf8').replaceAll('\r\n','\n');
 assert.match(workflow,/max-parallel: 12/);assert.ok(workflow.includes("--workers ${{ inputs.runner_pool == 'local-special' && 1 || 2 }}"));
});


test('combined Formation800 inventory preserves both blocked POSIX14 and feasible POSIX15 forecasts without reducing work or floors',()=>{
 const js=discoverJs(),lua=currentLua();assert.equal(js.length,800);assert.equal(lua.length,1410);
 const totals=[];
 for(const [count,forecast]of [[14,1205156],[15,1128812]]){
  const bins=Array.from({length:count},(_,i)=>currentJsShard(js,`${i+1}/${count}`,'linux'));
  assert.deepEqual(bins.flatMap(bin=>bin.files).sort(),[...js].sort());assert.equal(new Set(bins.flatMap(bin=>bin.files)).size,800);
  const loads=bins[0].loads;totals.push(loads.reduce((sum,load)=>sum+load,0));
  assert.equal(Math.max(...loads)+60000,forecast);
  assert.equal(forecast<1200000,count===15,'the original budget is unchanged; complete old capacity remains blocked');
 }
 assert.deepEqual(totals,[16032072,16032072],'redistribution does not claim a runtime or modeled-work reduction');
 assert.equal(totals[0]-15994730,37342,'only the three Formation files add planned work at their unchanged effective costs');
 assert.ok(totals[0]>14*(1200000-60000),'even ideal balancing cannot fit all complete work into fourteen original budgets');
 assert.equal(currentTimings.unknownJsMs,10000);assert.equal(Object.keys(currentTimings.jsPlanning.localLowerBounds).length,32);
 for(const [key,floor]of Object.entries(encounterFormationPlanningFloors))assert.deepEqual(currentTimings.jsPlanning.localLowerBounds[key],floor);
 const workflow=diskReadFileSync('.github/workflows/quality.yml','utf8').replaceAll('\r\n','\n');
 assert.match(workflow,/max-parallel: 12/);assert.ok(workflow.includes("--workers ${{ inputs.runner_pool == 'local-special' && 1 || 2 }}"));
});
