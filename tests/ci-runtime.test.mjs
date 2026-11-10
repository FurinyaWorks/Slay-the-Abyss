import {preEmeraldCostSource,emeraldCostBeforeSource} from './helpers/map-optimized-cost-source-inverse.mjs';
import {preEmeraldMapCiSource as originalPreEmeraldMapCiSource,emeraldMapPlanningKey,emeraldMapPlanningFloor} from './helpers/map-emerald-ci-source-inverse.mjs';
import {encounterFormationPlanningFloors} from './helpers/encounter-formation-ci-source-inverse.mjs';
import {defectFinalPlanningFloors} from './helpers/defect-final-ci-source-inverse.mjs';
import {silentFinalPlanningKey,silentFinalPlanningFloor,silentFinalSourcePlanningKey,silentFinalSourcePlanningFloor} from './helpers/silent-final-ci-source-inverse.mjs';
import {relicEquipPlanningKey,relicEquipPlanningFloor} from './helpers/relic-equip-ci-source-inverse.mjs';
import {preCombinedPlanningSource,preSilentTacticsPlanningSource,silentTacticsPlanningKey,silentTacticsPlanningFloor,preEffectsTargetGroupPlanningSource,effectsTargetGroupPlanningKey,effectsTargetGroupPlanningFloor} from './helpers/ci-complete-calibration-source-inverse.mjs';
import {preWatcherFlowPlanningSource,watcherFlowPlanningKey,watcherFlowPlanningFloor,prePartialCasePlanningSource,partialCasePlanningFloors,originalPlanningSource,preGameUiLocalPlanningSource,gameUiLocalPlanningKey,gameUiLocalPlanningFloor} from './helpers/ci-complete-calibration-source-inverse.mjs';
import {ciEpoch} from './helpers/integration-ci-epochs.mjs';
import {potionCallbackFloorKey,verifiedPotionCallbackFloor,prePotionCallbackPlanningSource} from './helpers/potion-callback-planning.mjs';
import {endTurnFloorKey,verifiedEndTurnFloor} from './helpers/end-turn-planning.mjs';
import {prePresencePlanningSource,presencePlanningBefore} from './helpers/actor-presence-planning-source-inverse.mjs';
import {rewardQueryPlanningProof,preRewardQueryPlanningSource} from './helpers/reward-query-planning-source-inverse.mjs';
import {assertRewardQueryPlanningReceipt,assertRewardQueryPlanningProjection} from './helpers/reward-query-planning-contract.mjs';
import {runCatalogFloorKey,verifiedRunCatalogFloor} from './helpers/run-catalog-planning.mjs';
import {preDefectIntegrationPlanningSource} from './helpers/defect-integration-planning-source-inverse.mjs';
import {defectUtilityPlanningKey,defectUtilityPlanningFloor} from './helpers/defect-utility-planning-source-inverse.mjs';
import {preEnemyIntegrationPlanningSource,enemyOnlyPlanningSource,enemyIntegrationPlanningProof} from './helpers/enemy-integration-planning-source-inverse.mjs';
import {enemyAiPlanningKey,enemyAiPlanningFloor,enemyAiPlanningProof,preEnemyAiPlanningSource} from './helpers/enemy-ai-planning-source-inverse.mjs';
import {watcherPlanningKey,watcherPlanningFloor} from './helpers/watcher-planning-source-inverse.mjs';
import {classPotionPlanningKey,classPotionPlanningFloor} from './helpers/class-potion-planning-source-inverse.mjs';
import {preIntegrationSource} from './helpers/pr372-integration-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync as diskReadFileSync, mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { originalLuaRunner } from './helpers/ci-lua-runner-inverse.mjs';
import {readBeforeMobileQaSource} from './helpers/mobile-qa-source-inverse.mjs';
import { partition, discoverJs } from '../scripts/ci-shards.mjs';
import { shardLuaScripts } from '../scripts/test-lua.mjs';
import {historicalTest,readHistoricalBaselineSource} from './helpers/historical-baseline-inputs.mjs';
import {qualityShardMatrices} from '../scripts/ci-quality-shape.mjs';
// Keep the original 33-floor assertions on their complete authenticated Emerald source.
// The unprojected 40-floor planner is checked by map-emerald-cost-contract.mjs.
const originalPlannerSource=diskReadFileSync('scripts/ci-shards.mjs','utf8').replaceAll('\r\n','\n')
 .replace("readFileSync(new URL('./ci-test-timings.json', import.meta.url), 'utf8')",JSON.stringify(emeraldCostBeforeSource))
 .replace("'./ci-reviewed-lfs.mjs'",JSON.stringify(new URL('../scripts/ci-reviewed-lfs.mjs',import.meta.url).href));
const {jsShard,jsPlanningWeights,timings}=await import('data:text/javascript,'+encodeURIComponent(originalPlannerSource));


historicalTest('scheduler inverse preserves the frozen runner for LF/CRLF and rejects unrelated changes', () => {
  const source = readBeforeMobileQaSource('scripts/test-lua.mjs').replaceAll('\r\n', '\n');
  const sha = text => createHash('sha256').update(text).digest('hex');
  const original = '63ec149511d52b9e362f2c9210d092e4d97bd815c5b8c16e7009ade146d5d55b';
  for (const text of [source, source.replaceAll('\n', '\r\n')]) assert.equal(sha(originalLuaRunner(text)), original);
  const epoch=readFileSync('scripts/test-lua.mjs','utf8').replaceAll('\r\n','\n');
  assert.equal(sha(originalLuaRunner(epoch)),original,'the complete original runner traverses the exact historical layer');
  const defaultDrift=epoch.includes('luaTimeoutMs.heavy : luaTimeoutMs.default')
    ? epoch.replace('luaTimeoutMs.heavy : luaTimeoutMs.default','luaTimeoutMs.heavy : luaTimeoutMs.heavy')
    : epoch.replace('60000 : 30000','60000 : 60000');
  for(const drift of [epoch+'\n-- unrelated drift\n',defaultDrift]){
    assert.notEqual(drift,epoch);
    assert.throws(()=>originalLuaRunner(drift),/exact original-deadline historical fixture dispatch/);
  }
  const changedDeadline = source.replace('60000 : 30000', '60000 : 60000');
  assert.notEqual(changedDeadline, source);
  assert.notEqual(sha(originalLuaRunner(changedDeadline)), original);
  const changedProcess = source.replace('maxBuffer: 1024 * 1024', 'maxBuffer: 1');
  assert.notEqual(changedProcess, source);
  assert.notEqual(sha(originalLuaRunner(changedProcess)), original);
  const changedSchedule = source.replace('return partition(scripts, value, weights, luaSchedulingWeight(timings.unknownLuaMs, workers), initial?.map(load => load * workers)).files;', 'return [];');
  assert.notEqual(changedSchedule, source);
  assert.throws(() => originalLuaRunner(changedSchedule), /exact reviewed scheduler/);
  const changedWorkers = source.replace('workers === 2 && scripts.length', 'workers === 3 && scripts.length');
  assert.notEqual(changedWorkers, source);
  assert.throws(() => originalLuaRunner(changedWorkers), /exact reviewed worker wiring/);
});

test('weighted scheduling balances unequal files deterministically and rejects unsafe inputs', () => {
  const files = ['a', 'b', 'c', 'd'], weights = { a: 100, b: 80, c: 20, d: 10 };
  assert.deepEqual(partition(files, '1/2', weights, 1).loads, [110, 100]);
  assert.deepEqual(partition(files, '1/2', weights, 1), partition([...files].reverse(), '1/2', weights, 1));
  for (const shard of ['', '0/2', '3/2', '01/2', '1/65', '1/2/3']) assert.throws(() => partition(files, shard, weights, 1));
  assert.throws(() => partition(['a', 'a'], '1/2', weights, 1));
  for (const weight of [0, -1, NaN, Infinity]) assert.throws(() => partition(['a'], '1/2', { a: weight }, 1));
  assert.throws(() => partition(files, '1/2', weights, 1, [NaN, 0]));
});

test('platform gates reserve their measured first-shard cost for every valid shard count', () => {
  for (const [platform, measuredCount] of [['win32', 8], ['linux', 4]]) {
    const initial = timings.initialMs[platform];
    assert.equal(initial.length, measuredCount);
    assert.ok(initial[0] > 0);
    assert.ok(initial.slice(1).every(value => value === 0));
    for(const count of [1,2,4,6,8,64])assert.deepEqual(jsShard([],`1/${count}`,platform).loads,
      [initial[0],...Array(count-1).fill(0)],'a changed matrix must not erase the measured gate');
  }
  assert.equal(jsShard([],'1/6','linux').loads[0],44000);
});

test('all current JS and Lua files are scheduled exactly once; new unmeasured files cannot disappear', () => {
  const js = discoverJs(), lua = readdirSync('tests/lua').filter(f => f.endsWith('.lua')).map(f => `tests/lua/${f}`);
  for (const [files, count, select] of [
    [js, qualityShardMatrices.windows.length, (files, value) => jsShard(files, value, 'win32').files],
    [js, qualityShardMatrices.posix.length, (files, value) => jsShard(files, value, 'linux').files],
    [lua, qualityShardMatrices.windows.length, shardLuaScripts], [lua, 1, shardLuaScripts],
  ]) {
    const input = [...files, 'tests/unmeasured-new-file'];
    const slices = Array.from({ length: count }, (_, i) => select(input, `${i + 1}/${count}`));
    const union = slices.flat();
    assert.equal(new Set(union).size, union.length);
    assert.deepEqual(union.sort(), input.sort());
  }
  for (const [platform, count] of [['win32', qualityShardMatrices.windows.length], ['linux', qualityShardMatrices.posix.length]]) {
    const loads = jsShard(js, `1/${count}`, platform).loads;
    const weights = jsPlanningWeights(js,platform);
    const old = Array(count).fill(0);
    [...js].sort().forEach((file, i) => old[i % count] += weights[file] ?? timings.unknownJsMs);
    assert.ok(Math.max(...loads) < Math.max(...old), `${platform}: weighted schedule must improve measured critical path`);
  }
});

test('platform-native placement covers every current file once and unknown platforms retain the conservative fallback',()=>{
 const files=discoverJs();
 const asymmetric=files.find(file=>{
  const floor=timings.jsPlanning?.localLowerBounds?.[file]?.durationMs??0;
  return Math.max(timings.js.win32[file]??timings.unknownJsMs,floor)!==Math.max(timings.js.linux[file]??timings.unknownJsMs,floor);
 });
 assert.ok(asymmetric,'the observed platform maps contain distinct costs');
 for(const platform of ['win32','linux']){
  const native=jsPlanningWeights(files,platform);
  for(const file of files)assert.equal(native[file],Math.max(timings.js[platform][file]??timings.unknownJsMs,timings.jsPlanning?.localLowerBounds?.[file]?.durationMs??0));
  const count=platform==='win32'?qualityShardMatrices.windows.length:qualityShardMatrices.posix.length;
  const bins=Array.from({length:count},(_,i)=>jsShard(files,`${i+1}/${count}`,platform).files),all=bins.flat();
  assert.equal(new Set(all).size,all.length,platform+' must not duplicate files');
  assert.deepEqual(all.sort(),[...files].sort(),platform+' must retain the complete current inventory');
 }
 assert.notEqual(jsPlanningWeights([asymmetric],'win32')[asymmetric],jsPlanningWeights([asymmetric],'linux')[asymmetric],'known platforms must not inherit the other platform cost');
 for(const platform of ['unknown-platform','toString']){
  const fallback=jsPlanningWeights(files,platform);
  for(const file of files)assert.equal(fallback[file],Math.max(...Object.values(timings.js).map(map=>map[file]??timings.unknownJsMs),timings.jsPlanning?.localLowerBounds?.[file]?.durationMs??0));
 }
 assert.deepEqual(jsPlanningWeights(files),jsPlanningWeights(files,process.platform));
});

test('workflow uses the same balanced plan for materialization and execution without changing concurrency', () => {
  const workflow = readFileSync('.github/workflows/quality.yml', 'utf8');
  assert.ok(workflow.includes("--workers ${{ inputs.runner_pool == 'local-special' && 1 || 2 }}"));
  assert.equal((workflow.match(/node scripts\/ci-shards.mjs --prepare=/g) ?? []).length, 2);
  assert.equal((workflow.match(/node scripts\/ci-shards.mjs --shard=/g) ?? []).length, 2);
  const source = readFileSync('scripts/ci-shards.mjs', 'utf8');
  assert.match(source, /plan.files.includes\('tests\/reviewed-traveler-geo-assets.test.mjs'\)/);
  assert.match(source, /--test-concurrency=1/);
  assert.doesNotMatch(source, /--test-name-pattern|--test-skip-pattern|--test-timeout/);
});

test('real executor preserves test failure, continues later files, reports timings and includes added files', t => {
  const root = mkdtempSync(join(tmpdir(), 'abyss-ci-runtime-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ['tests', 'scripts', 'build']) mkdirSync(join(root, dir));
  copyFileSync('scripts/ci-timing-reporter.mjs', join(root, 'scripts/ci-timing-reporter.mjs'));
  for (const [file, body] of [['a', "throw new Error('expected failure')"], ['b', "console.log('later-file-ran')"]]) {
    writeFileSync(join(root, `tests/${file}.test.mjs`), `import test from 'node:test';test('${file}',()=>{${body}});`);
  }
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, [resolve('scripts/ci-shards.mjs'), '--shard=1/1'], {
    cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 30000,
  });
  assert.ifError(result.error);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /expected failure/);
  assert.match(result.stdout, /later-file-ran/);
  const records = readFileSync(join(root, 'build/ci-js-timings.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(records.map(record => record.file).sort(), ['tests/a.test.mjs', 'tests/b.test.mjs']);
  assert.ok(records.every(record => Number.isFinite(record.durationMs) && record.durationMs > 0));
});


test('current timing records preserve all measured corrections without duplicate JSON keys',()=>{
 const raw=diskReadFileSync('scripts/ci-test-timings.json','utf8');
 assert.equal((raw.match(/^  "jsCorrections":/gm)||[]).length,1,'one unambiguous correction inventory');
 assert.equal(timings.jsCorrections.length,3);
 for(const entry of timings.jsCorrections){
  assert.ok(timings.js[entry.platform][entry.file]>=Math.ceil(entry.durationMs),'measured conservative floor: '+entry.file);
  assert.ok(Number.isSafeInteger(entry.runId)&&Number.isSafeInteger(entry.jobId));
  assert.match(entry.headSha,/^[a-f0-9]{40}$/);
 }
 const previous=JSON.parse(readHistoricalBaselineSource('scripts/ci-test-timings.json'));
 assert.equal(createHash('sha256').update(JSON.stringify(previous.js.linux)).digest('hex'),'3fdcb1aa1e50352a164eb3ebde77f0a01ac4b0ad76b1302939021ae7d76d8755','the prior observed map remains an immutable source');
 for(const platform of ['win32','linux']){
  assert.equal(timings.jsCalibration.previousMapSha256[platform],createHash('sha256').update(JSON.stringify(previous.js[platform])).digest('hex'));
  for(const [file,weight]of Object.entries(previous.js[platform]))assert.ok(timings.js[platform][file]>=weight,'no observed weight may decrease: '+file);
  for(const [file,row]of Object.entries(timings.jsCalibration.raised[platform])){
   assert.equal(row.beforeMs,previous.js[platform][file]??previous.unknownJsMs);
   assert.ok(row.observedMs>row.beforeMs);
   assert.ok(timings.js[platform][file]>=row.observedMs,'later complete successful observations may only raise this floor');
  }
 }
 assert.equal(timings.jsCalibration.runId,41097231681);assert.equal(timings.jsCalibration.runAttempt,1);
 assert.equal(timings.jsCalibration.headSha,'568d47a8f51164ed9e3cfb0656f57f2d832ed546');
 let localFloorCount=0;
 for(const [file,entry]of Object.entries(timings.jsPlanning.localLowerBounds)){
  if(file==='tests/run-max-hp-config-inverse.test.mjs'){
   assert.equal(entry.environment,'hosted Windows');assert.equal(entry.durationMs,889638);
   assert.equal(entry.kind,'Planning-only cross-platform floor from a complete successful hosted Windows same-file observation; not a Linux measurement or censored elapsed-time sample.');
   assert.equal(entry.sourceReceipt,'docs/evidence/pr521-run-max-planning-floor-20261106.json');
   const bytes=readFileSync(entry.sourceReceipt,'utf8').replaceAll('\r\n','\n'),receipt=JSON.parse(bytes);
   assert.equal(createHash('sha256').update(bytes).digest('hex'),'503e94c83632f032d6b160ae24ec6b3d33f8d91c4c0f734d91056f4371a750b0');assert.equal(entry.sourceReceiptSha256,createHash('sha256').update(bytes).digest('hex'));
   const {observation,sourceRecord}=receipt.completedWindowsSource;
   assert.equal(observation.file,file);assert.equal(observation.platform,'win32');assert.equal(observation.success,true);assert.equal(observation.durationMs,889637.0668);assert.equal(Math.ceil(observation.durationMs),entry.durationMs);
   assert.equal(sourceRecord.step.status,'completed');assert.equal(sourceRecord.step.conclusion,'success');assert.equal(sourceRecord.conclusion,'cancelled');
   assert.equal(entry.sourceLog,observation.logPath);assert.equal(entry.sourceLogSha256,observation.logSha256);assert.equal(entry.sourceJobId,observation.jobId);assert.equal(entry.sourceRunId,sourceRecord.runId);assert.equal(entry.sourceHeadSha,sourceRecord.headSha);
   assert.equal(receipt.censoredLinuxSource.measurementImported,false);assert.equal(timings.js.linux[file],254137,'retain the actual Linux observation independently of the cross-platform planning floor');
  }else if(file==='tests/power-shop-boundaries.test.mjs'){
   // This candidate's complete local observation is additional to the eight
   // frozen local floors and the independently sourced hosted planning floor.
   assert.equal(entry.environment,'local Windows');assert.equal(entry.durationMs,68586);
   assert.equal(entry.sourceReceipt,'docs/evidence/power-shop-planning-20261107.json');
   const bytes=readFileSync(entry.sourceReceipt,'utf8').replaceAll('\r\n','\n');
   assert.equal(createHash('sha256').update(bytes).digest('hex'),'52570c893c538ac0c5ab592e3b6d89afe883495ea6624fa4f35abaad3053f8f7');
   assert.equal(entry.sourceReceiptSha256,createHash('sha256').update(bytes).digest('hex'));
   const receipt=JSON.parse(bytes),run=receipt.completedRun;
   assert.equal(receipt.file,file);assert.equal(Math.ceil(run.durationMs),entry.durationMs);
   assert.equal(run.tests,8);assert.equal(run.passed,8);assert.equal(run.failed,0);assert.equal(run.skipped,0);
   assert.equal(entry.sourceLogSha256,createHash('sha256').update(run.rawTap).digest('hex'));
   assert.match(entry.kind,/not hosted or Linux measurement/);
  }else if(Object.hasOwn(partialCasePlanningFloors,file)){
   assert.deepEqual(entry,partialCasePlanningFloors[file]);
  }else if(file===gameUiLocalPlanningKey){
   assert.deepEqual(entry,gameUiLocalPlanningFloor);
  }else if(file===runCatalogFloorKey){
   assert.deepEqual(entry,verifiedRunCatalogFloor());
  }else if(file===potionCallbackFloorKey){
   assert.deepEqual(entry,verifiedPotionCallbackFloor());
  }else if(file===endTurnFloorKey){
   assert.deepEqual(entry,verifiedEndTurnFloor());
  }else if(file==='tests/actor-presence.test.mjs'){
   assert.deepEqual(entry,ciEpoch('actor').timings.jsPlanning.localLowerBounds['tests/actor-presence.test.mjs']);
  }else if(file==='tests/reward-query-boundary.test.mjs'){
   assert.deepEqual(entry,JSON.parse(rewardQueryPlanningProof.afterSource).jsPlanning.localLowerBounds['tests/reward-query-boundary.test.mjs']);
  }else if(file===defectUtilityPlanningKey){
   assert.deepEqual(entry,defectUtilityPlanningFloor);
   const evidence=readFileSync(entry.sourceLog,'utf8').replaceAll('\r\n','\n');
   assert.equal(createHash('sha256').update(evidence).digest('hex'),entry.sourceLogSha256);
   assert.match(evidence,/tests 11/);assert.match(evidence,/pass 11/);assert.match(evidence,/fail 0/);assert.match(evidence,/skipped 0/);
   assert.equal(Number(evidence.match(/duration_ms ([\d.]+)/)?.[1]),entry.nodeReportedDurationMs);
   assert.ok(entry.durationMs>=entry.nodeReportedDurationMs);
  }else if(file===enemyAiPlanningKey){
   assert.deepEqual(entry,enemyAiPlanningFloor);
  }else if(file===classPotionPlanningKey){
   assert.deepEqual(entry,classPotionPlanningFloor);assert.equal(entry.durationMs,180000);
   assert.ok(entry.durationMs>=162004.675552,'retain conservative full-file local planning floor');
  }else if(file===emeraldMapPlanningKey){
   assert.deepEqual(entry,emeraldMapPlanningFloor);
  }else if(Object.hasOwn(encounterFormationPlanningFloors,file)){
   assert.deepEqual(entry,encounterFormationPlanningFloors[file]);
  }else if(Object.hasOwn(defectFinalPlanningFloors,file)){
   assert.deepEqual(entry,defectFinalPlanningFloors[file]);
  }else if(file===silentFinalSourcePlanningKey){
   assert.deepEqual(entry,silentFinalSourcePlanningFloor);
  }else if(file===silentFinalPlanningKey){
   assert.deepEqual(entry,silentFinalPlanningFloor);
  }else if(file===relicEquipPlanningKey){
   assert.deepEqual(entry,relicEquipPlanningFloor);
  }else if(file===silentTacticsPlanningKey){
   assert.deepEqual(entry,silentTacticsPlanningFloor);
  }else if(file===effectsTargetGroupPlanningKey){
   assert.deepEqual(entry,effectsTargetGroupPlanningFloor);
  }else if(file===watcherFlowPlanningKey){
   assert.deepEqual(entry,watcherFlowPlanningFloor);assert.equal(entry.durationMs,55668);
  }else if(file===watcherPlanningKey){
   assert.deepEqual(entry,watcherPlanningFloor);assert.equal(entry.durationMs,30000);
   assert.ok(entry.durationMs>=21763.220989+1218.265678);
  }else{
   assert.match(entry.environment,/local/);assert.match(entry.kind,/not .*hosted/);localFloorCount++;
  }
  for(const platform of ['win32','linux'])assert.equal(jsPlanningWeights([file],platform)[file],Math.max(timings.js[platform][file]??timings.unknownJsMs,entry.durationMs));
 }
 assert.equal(localFloorCount,8,'all eight original local floor contracts remain checked');assert.equal(Object.keys(timings.jsPlanning.localLowerBounds).length,29+Object.keys(defectFinalPlanningFloors).length+Object.keys(encounterFormationPlanningFloors).length);
 assert.ok(jsPlanningWeights(['tests/task77-current-source-layers.test.mjs'],'win32')['tests/task77-current-source-layers.test.mjs']>=394262,'retain the first complete successful hosted floor');
});

historicalTest('fresh relic base retains its complete accepted scheduling measurements', () => {
  assert.equal(createHash('sha256').update(preIntegrationSource('scripts/ci-test-timings.json',readFileSync('scripts/ci-test-timings.json','utf8')).replaceAll('\r\n','\n')).digest('hex'),
    '4039efc1bc954f541bcacac619550daa1231a4b3894ebe6568697d2f10af7ad8', 'exact acb09e46 scheduling contract; no obsolete PR366 correction reapplied');
});

test('Enemy AI local planning floor is exact, conservatively rounded and cannot rewrite hosted or safety evidence',()=>{
 const path=enemyAiPlanningProof.path,source=enemyOnlyPlanningSource(path,preDefectIntegrationPlanningSource(path,originalPlanningSource(path,readFileSync(path,'utf8').replaceAll('\r\n','\n'),'seven')));
 const previous=preEnemyAiPlanningSource(path,source),old=JSON.parse(previous);
 assert.equal(createHash('sha256').update(source).digest('hex'),enemyAiPlanningProof.afterSha256);
 assert.equal(createHash('sha256').update(previous).digest('hex'),enemyAiPlanningProof.beforeSha256);
 assert.equal(preEnemyAiPlanningSource(path,source.replaceAll('\n','\r\n')),previous);
 const expected=structuredClone(old);expected.jsPlanning.localLowerBounds[enemyAiPlanningKey]=enemyAiPlanningFloor;
 assert.equal(JSON.stringify(expected,null,2)+'\n',source,'only one local planning entry changes; all maps, safety values and old floors retain exact bytes');
 assert.equal(enemyAiPlanningFloor.environment,'cloud Linux local');
 assert.equal(enemyAiPlanningFloor.nodeReportedDurationMs,27916.657737);
 assert.equal(enemyAiPlanningFloor.durationMs,30000);
 assert.equal(enemyAiPlanningFloor.durationMs,Math.ceil(enemyAiPlanningFloor.nodeReportedDurationMs/5000)*5000);
 assert.equal(enemyAiPlanningFloor.sourceLogSha256,'64d2062d9dad8b5443bddeab4165c2a74e58a08196c7bfb2fb6ccc4c0cd9bf0e');
 assert.equal(enemyAiPlanningFloor.coverage,'11/11 complete file passed; no selected or skipped groups');
 for(const platform of ['win32','linux','unknown']){
  assert.equal(timings.js[platform]?.[enemyAiPlanningKey],undefined,'local estimate never fabricates hosted data');
  assert.equal(jsPlanningWeights([enemyAiPlanningKey],platform)[enemyAiPlanningKey],30000);
 }
 for(const input of [previous,null,undefined,{},source+'\n',source.slice(1),
  source.replace('"durationMs": 30000','"durationMs": 30001'),
  source.replace('"durationMs": 30000','"durationMs": 30000.0'),
  source.replace('"cloud Linux local"','"hosted Windows"'),
  source.replace('"unknownJsMs": 10000','"unknownJsMs": 9999'),
  source.replace('"durationMs": 30000','"durationMs": 30000, "durationMs": 30000')])
  assert.equal(preEnemyAiPlanningSource(path,input),input,'foreign, partial and old epochs stay visible');
 assert.equal(preEnemyAiPlanningSource('foreign/'+path,source),source);
 assert.ok(Object.isFrozen(enemyAiPlanningFloor)&&Object.isFrozen(enemyAiPlanningProof));
});


test('combined planning epoch preserves both complete input maps and rejects any drift',()=>{
 const path=enemyIntegrationPlanningProof.path,source=preDefectIntegrationPlanningSource(path,originalPlanningSource(path,readFileSync(path,'utf8').replaceAll('\r\n','\n'),'seven'));
 const parent=preEnemyIntegrationPlanningSource(path,source),enemy=enemyOnlyPlanningSource(path,source);
 assert.notEqual(source,parent);assert.notEqual(source,enemy);
 assert.equal(createHash('sha256').update(source).digest('hex'),enemyIntegrationPlanningProof.combinedSha256);
 const expected=JSON.parse(parent);expected.jsPlanning.localLowerBounds[enemyAiPlanningKey]=enemyAiPlanningFloor;
 assert.equal(JSON.stringify(expected,null,2)+'\n',source);
 const fromEnemy=JSON.parse(enemy);fromEnemy.jsPlanning.localLowerBounds[classPotionPlanningKey]=classPotionPlanningFloor;fromEnemy.jsPlanning.localLowerBounds[watcherPlanningKey]=watcherPlanningFloor;
 assert.deepEqual(JSON.parse(source),fromEnemy,'no measured map, cost, floor or safety value is lost');
 for(const project of [preEnemyIntegrationPlanningSource,enemyOnlyPlanningSource]){
  assert.equal(project(path,source.replaceAll('\n','\r\n')),project(path,source));
  assert.equal(project('foreign/'+path,source),source);
  for(const input of [null,undefined,{},42,parent,enemy,source+'\n',source.slice(1),
   source.replace('"unknownJsMs": 10000','"unknownJsMs": 9999'),
   source.replace('"durationMs": 180000','"durationMs": 179999'),
   source.replace('"durationMs": 30000','"durationMs": 29999'),
   source.replace('"cloud Linux local"','"hosted Windows"'),
   source.replace('"durationMs": 180000','"durationMs": 180000, "durationMs": 180000')])
   assert.equal(project(path,input),input,'partial, altered and other epochs stay visible');
 }
});

test('complete local Game UI run raises only its planning floor and preserves every original observation',()=>{
 const key=gameUiLocalPlanningKey,floor=gameUiLocalPlanningFloor;
 const receiptBytes=readFileSync(floor.sourceReceipt),receipt=JSON.parse(receiptBytes);
 const hash=value=>createHash('sha256').update(value).digest('hex');
 assert.equal(hash(receiptBytes),floor.sourceReceiptSha256);
 assert.equal(receipt.kind,'local-complete-file-planning-floor');
 assert.equal(receipt.file,key);
 assert.deepEqual(receipt.command,['timeout','90','node','--test',key]);
 assert.deepEqual([receipt.status,receipt.tests,receipt.passed,receipt.failed,receipt.cancelled,receipt.skipped,receipt.todo],[0,13,13,0,0,0,0]);
 assert.equal(receipt.actualFullPassClaim,false);assert.equal(receipt.hostedMeasurementClaim,false);
 const logBytes=readFileSync(receipt.sourceLog),log=logBytes.toString().replaceAll('\r\n','\n');
 assert.equal(hash(logBytes),receipt.sourceLogSha256);assert.equal(receipt.sourceLogSha256,floor.sourceLogSha256);
 for(const [label,value]of [['tests',13],['pass',13],['fail',0],['cancelled',0],['skipped',0],['todo',0]])
  assert.match(log,new RegExp('ℹ '+label+' '+value+'(?:\\n|$)'));
 assert.equal(Number(log.match(/ℹ duration_ms ([\d.]+)/)[1]),receipt.nodeReportedDurationMs);
 assert.equal(receipt.nodeReportedDurationMs,77214.241194);assert.equal(floor.nodeReportedDurationMs,receipt.nodeReportedDurationMs);
 assert.equal(floor.durationMs,Math.ceil(receipt.nodeReportedDurationMs));assert.equal(receipt.planningFloorMs,floor.durationMs);
 // This receipt measured an uncommitted candidate based on #560, not today's
 // test. Commit 3205985a later retained all 346 recorded input hashes exactly.
 // Keep its complete measured test as data; the current Game UI suite still
 // executes independently, including the combined-retirement regression.
 const archive=readFileSync('tests/fixtures/game-ui-planning-historical-source.json.gz');
 assert.equal(hash(archive),'be2f351b3cf80f6c10928308863b7f4f3bf0d3a729cb892923651995de75bcd5');
 const historical=JSON.parse(gunzipSync(archive));
 const identity={schemaVersion:1,sourceCommit:'3205985a38e0eb88ab6f894e74fe68c3e3789131',sourceTree:'4f11016d4badfa25024645c0a65e49b2a11aa94d',baseCommit:'a0c35db8d3c7242437f4dff0df373749b0d84985',file:key,sourceSha256:'bf6e9f1bb709548f1185f13120512a8c7e8411cfef92bd290982fe1724ef17f0',gitBlob:'05b38520531db07556dde3f1fd3a1ab1deb8b595'};
 const gitBlob=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
 function assertHistoricalSource(binding,observation=receipt){
  const {source,...metadata}=binding;assert.deepEqual(metadata,identity,'exact measured candidate, distinct from its #560 base');
  assert.equal(typeof source,'string');const bytes=Buffer.from(source);
  assert.equal(hash(bytes),identity.sourceSha256,'complete original measured test bytes');
  assert.equal(gitBlob(bytes),identity.gitBlob,'original measured test Git blob');
  assert.equal(observation.file,key);assert.equal(observation.sourceIdentity.baseHead,identity.baseCommit);
  assert.equal(observation.sourceIdentity.files[key],hash(bytes),'receipt authenticates the historical source, never a newer test');
 }
 assertHistoricalSource(historical);
 const caseNames=[...historical.source.matchAll(/^test\('([^']+)'/gm)].map(match=>match[1]);
 assert.equal(caseNames.length,receipt.tests);
 for(const name of caseNames)assert.ok(log.includes('✔ '+name+' ('),'each measured historical case remains in the original log');
 for(const source of [readFileSync(key,'utf8'),historical.source+'\n',historical.source.replace('originalReads,paths.length*paths.length*2','originalReads,0')]){
  assert.notEqual(source,historical.source);
  assert.throws(()=>assertHistoricalSource({...historical,source}),/original measured test bytes/);
  const bytes=Buffer.from(source);
  assert.throws(()=>assertHistoricalSource({...historical,source,sourceSha256:hash(bytes),gitBlob:gitBlob(bytes)}),/exact measured candidate/);
 }
 for(const field of ['sourceCommit','sourceTree','baseCommit','file','sourceSha256','gitBlob'])
  assert.throws(()=>assertHistoricalSource({...historical,[field]:field==='sourceCommit'?identity.baseCommit:'wrong source'}),/exact measured candidate/);
 for(const mutate of [r=>r.file='tests/other.test.mjs',r=>r.sourceIdentity.baseHead=identity.sourceCommit,r=>r.sourceIdentity.files[key]=hash(readFileSync(key))]){
  const wrong=structuredClone(receipt);mutate(wrong);assert.throws(()=>assertHistoricalSource(historical,wrong));
 }
 const path='scripts/ci-test-timings.json',source=prePartialCasePlanningSource(path,preCombinedPlanningSource(path,readFileSync(path,'utf8').replaceAll('\r\n','\n'))),prior=preGameUiLocalPlanningSource(path,source);
 assert.notEqual(source,prior);const old=JSON.parse(prior),expected=structuredClone(old);
 assert.equal(Object.keys(old.jsPlanning.localLowerBounds).length,19);assert.equal(old.jsPlanning.localLowerBounds[key],undefined);
 expected.jsPlanning.localLowerBounds[key]=floor;
 assert.equal(JSON.stringify(expected,null,2)+'\n',source);
 for(const platform of ['win32','linux']){
  assert.equal(timings.js[platform][key],10000,'retain actual old observations separately from the new local planning floor');
  assert.equal(jsPlanningWeights([key],platform)[key],Math.max(timings.js[platform][key],floor.durationMs));
 }
 assert.equal(preGameUiLocalPlanningSource(path,source.replaceAll('\n','\r\n')),prior);
 assert.equal(preGameUiLocalPlanningSource('foreign/'+path,source),source);
 for(const mutant of [prior,null,undefined,{},42,source+'\n',source.slice(1),source.replace('"durationMs": 77215','"durationMs": 77214'),source.replace('"durationMs": 77215','"durationMs": 77215, "durationMs": 77215'),source.replace('"unknownJsMs": 10000','"unknownJsMs": 9999')]){
  assert.equal(preGameUiLocalPlanningSource(path,mutant),mutant);
  if(typeof mutant==='string'&&mutant!==prior)assert.equal(originalPlanningSource(path,mutant),mutant);
 }
});

test('partial successful source cases provide lower bounds without claiming their failed batch or whole files passed',()=>{
 const hash=value=>createHash('sha256').update(value).digest('hex');
 const keys=Object.keys(partialCasePlanningFloors);
 assert.deepEqual(keys,['tests/combat-reactions-architecture-inverse.test.mjs','tests/compendium-source-inverse.test.mjs']);
 for(const [file,floor]of Object.entries(partialCasePlanningFloors)){
  const bytes=readFileSync(floor.sourceReceipt),receipt=JSON.parse(bytes);
  assert.equal(hash(bytes),floor.sourceReceiptSha256);
  assert.equal(receipt.kind,'successful-case-planning-lower-bounds');
  assert.deepEqual(receipt.batchSummary,{tests:79,passed:76,failed:3,skipped:0,cancelled:0,nodeReportedDurationMs:116739.773333});
  assert.equal(receipt.fullFileCompletionClaim,false);assert.equal(receipt.actualFullPassClaim,false);assert.equal(receipt.hostedMeasurementClaim,false);
  const raw=readFileSync(receipt.sourceLog),text=raw.toString().replaceAll('\r\n','\n');
  assert.equal(hash(raw),receipt.sourceLogSha256);assert.equal(hash(raw),floor.sourceLogSha256);
  for(const [label,value]of [['tests',79],['pass',76],['fail',3],['skipped',0]])assert.match(text,new RegExp('ℹ '+label+' '+value+'(?:\n|$)'));
  const observation=receipt.observations.find(row=>row.file===file);
  assert.ok(observation);assert.equal(observation.caseName,floor.sourceCase);
  assert.equal(observation.durationMs,floor.caseDurationMs);
  assert.equal(observation.rawSuccessLine,'✔ '+floor.sourceCase+' ('+floor.caseDurationMs+'ms)');
  assert.ok(text.includes(observation.rawSuccessLine+'\n'));
  assert.ok(readFileSync(file,'utf8').includes("test('"+floor.sourceCase+"'"),'explicit unique named case belongs to the declared file');
  assert.equal(floor.durationMs,Math.ceil(observation.durationMs));assert.equal(observation.planningFloorMs,floor.durationMs);
  for(const platform of ['win32','linux'])assert.equal(jsPlanningWeights([file],platform)[file],Math.max(timings.js[platform][file]??timings.unknownJsMs,floor.durationMs));
 }
 const path='scripts/ci-test-timings.json',source=preCombinedPlanningSource(path,readFileSync(path,'utf8').replaceAll('\r\n','\n')),prior=prePartialCasePlanningSource(path,source);
 assert.notEqual(prior,source);const expected=JSON.parse(prior);
 assert.equal(Object.keys(expected.jsPlanning.localLowerBounds).length,20);
 for(const key of keys)assert.equal(expected.jsPlanning.localLowerBounds[key],undefined);
 Object.assign(expected.jsPlanning.localLowerBounds,partialCasePlanningFloors);
 assert.equal(JSON.stringify(expected,null,2)+'\n',source,'only two explicitly partial lower bounds change; no measured maps, prior floors or policy changes');
 assert.equal(prePartialCasePlanningSource(path,source.replaceAll('\n','\r\n')),prior);
 assert.equal(prePartialCasePlanningSource('foreign',source),source);
 for(const input of [prior,null,undefined,{},42,source+'\n',source.slice(1),source.replace('"durationMs": 80063','"durationMs": 80062'),source.replace('"durationMs": 42675','"durationMs": 42674'),source.replace('"unknownJsMs": 10000','"unknownJsMs": 9999')]){
  assert.equal(prePartialCasePlanningSource(path,input),input);
  if(typeof input==='string'&&input!==prior)assert.equal(originalPlanningSource(path,input),input);
 }
});

// Historical source contracts authenticate the complete new outer epoch first.
function readFileSync(file,encoding){const value=diskReadFileSync(file,encoding),text=typeof value==='string'?value:value.toString('utf8'),prior=preEmeraldMapCiSource(file,text);return typeof value==='string'?prior:prior===text?value:Buffer.from(prior);}

// Preserve the complete original Emerald/historical assertions behind one exact registration boundary.
function preEmeraldMapCiSource(path,source){return originalPreEmeraldMapCiSource(path,preEmeraldCostSource(path,source));}
