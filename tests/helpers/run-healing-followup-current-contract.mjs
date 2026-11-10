import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {successorProof as proof,preSuccessorSource,timings as historicalTimings,jsPlanningWeights as historicalWeights,jsShard as historicalShard} from './run-healing-followup-predecessor.mjs';
import {runHealingCiProof as published} from './run-healing-ci-source-inverse.mjs';
import {timings,jsPlanningWeights} from '../../scripts/ci-shards.mjs';
import {currentSuccessorPlan} from './run-healing-followup-plan.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),root='docs/evidence/m7-run-healing-contracts-20261110/ci-successor';
test('successor authenticates da1c predecessor bytes and preserves all published RunHealing files',()=>{
 assert.equal(proof.baseCommit,'da1c045af8508274565527857ac3eec874f201b2');
 const timingBinding=proof.files['scripts/ci-test-timings.json'],originalBefore=timingBinding.beforeSource;
 for(const [object,key]of [[proof,'baseCommit'],[proof,'files'],[proof.files,'scripts/ci-test-timings.json'],[timingBinding,'beforeSource'],[timingBinding,'afterSha256'],[proof.publishedSha256,'tests/helpers/run-healing-ci-contract.mjs']]){
  assert(Object.isFrozen(object),'validated metadata must be frozen');
  assert.equal(Reflect.set(object,key,'tampered historical output'),false);
  assert.equal(Reflect.deleteProperty(object,key),false);
  assert.throws(()=>Object.defineProperty(object,key,{value:'tampered historical output'}),TypeError);
  assert.throws(()=>Object.setPrototypeOf(object,{injected:true}),TypeError);
  assert.equal(preSuccessorSource('scripts/ci-test-timings.json',timingBinding.afterSource),originalBefore,'metadata mutation cannot change authenticated inverse output');
 }
 const plannedFiles=['tests/watcher-actor-boundary.test.mjs','tests/watcher-potion-integration-source.test.mjs'];
 const originalPlan=historicalShard(plannedFiles,'1/17','win32'),originalWeights=historicalWeights(plannedFiles,'win32');
 for(const [object,key]of [[historicalTimings,'unknownJsMs'],[historicalTimings.js,'win32'],[historicalTimings.js.win32,Object.keys(historicalTimings.js.win32)[0]],[historicalTimings.jsPlanning,'localLowerBounds'],[historicalTimings.jsPlanning.localLowerBounds,plannedFiles[0]],[historicalTimings.jsPlanning.localLowerBounds[plannedFiles[0]],'durationMs'],[historicalTimings.initialMs.win32,'0']]){
  assert(Object.isFrozen(object),'historical planner metadata must be recursively frozen');assert.equal(Reflect.set(object,key,1),false);assert.equal(Reflect.deleteProperty(object,key),false);
  assert.throws(()=>Object.defineProperty(object,key,{value:1}),TypeError);assert.throws(()=>Object.setPrototypeOf(object,{}),TypeError);
  assert.deepEqual(historicalWeights(plannedFiles,'win32'),originalWeights);assert.deepEqual(historicalShard(plannedFiles,'1/17','win32'),originalPlan,'metadata mutation cannot corrupt frozen historical planning');
 }
 for(const [file,sha]of Object.entries(proof.publishedSha256))assert.equal(hash(file.endsWith('.gz')?readFileSync(file):readFileSync(file,'utf8').replaceAll('\r\n','\n')),sha,file);
 for(const [file,binding]of Object.entries(proof.files)){
  const source=readFileSync(file,'utf8').replaceAll('\r\n','\n');assert.equal(source,binding.afterSource,file);
  for(const value of [source,source.replaceAll('\n','\r\n')])assert.equal(preSuccessorSource(file,value),binding.beforeSource,file);
  for(const value of [source+'\n',source.slice(1),null,undefined,{},17])assert.equal(preSuccessorSource(file,value),value,file);
  for(const path of ['unknown','__proto__','constructor'])assert.equal(preSuccessorSource(path,source),source,path);
 }
});
test('successor costs use complete stable observations and do not rewrite hosted costs or planning guards',()=>{
 const previous=JSON.parse(proof.files['scripts/ci-test-timings.json'].beforeSource),current=structuredClone(timings),report=JSON.parse(readFileSync(`${root}/cost-observations.json`));
 assert.deepEqual(report.observations.map(row=>row.file).sort(),['tests/watcher-actor-boundary.test.mjs','tests/watcher-potion-integration-source.test.mjs']);
 for(const row of report.observations){
  assert.equal(row.exitCode,0);assert.equal(row.pass,row.tests);assert.equal(row.fail+row.skipped+row.cancelled,0);assert.equal(row.inputFilesUnchanged,true);
  const inputs=readFileSync(row.inputPath),log=readFileSync(row.logPath);assert.equal(hash(inputs),row.inputSha256);assert.equal(hash(log),row.logSha256);assert.equal(hash(gunzipSync(log)),row.logUncompressedSha256);
  const manifest=JSON.parse(gunzipSync(inputs));assert.deepEqual(manifest.before.files,manifest.after.files);assert.equal(manifest.before.files[row.file].sha256,row.testSha256);assert.equal(hash(readFileSync(row.file,'utf8').replaceAll('\r\n','\n')),manifest.before.files[row.file].lfSha256);
  const floor=timings.jsPlanning.localLowerBounds[row.file];assert.equal(floor.durationMs,Math.ceil(Math.max(previous.jsPlanning.localLowerBounds[row.file]?.durationMs??0,row.wallMs,row.nodeReportedDurationMs)));
  assert.equal(hash(readFileSync(floor.sourceReceipt)),floor.sourceReceiptSha256);assert.equal(floor.inputReceiptSha256,row.inputSha256);
  for(const platform of ['linux','win32'])assert(jsPlanningWeights([row.file],platform)[row.file]>=Math.ceil(Math.max(row.wallMs,row.nodeReportedDurationMs)));
  if(Object.hasOwn(previous.jsPlanning.localLowerBounds,row.file))current.jsPlanning.localLowerBounds[row.file]=previous.jsPlanning.localLowerBounds[row.file];else delete current.jsPlanning.localLowerBounds[row.file];
 }
 assert.deepEqual(current,previous,'only the two complete local cost records change; hosted costs, unknown10s, timeouts, workers and budgets retain their predecessor values');
});
test('successor current802/1412 inventory independently enforces unchanged POSIX15 and Windows17 budgets',()=>{
 const plan=currentSuccessorPlan();assert.deepEqual(plan.js.toSorted(),published.inventory.js);assert.equal(plan.js.length,802);assert.equal(plan.lua.length,1412);assert.deepEqual(plan.lua,Object.keys(published.inventory.luaSha256));
 for(const file of plan.lua)assert.equal(hash(readFileSync(file,'utf8').replaceAll('\r\n','\n')),published.inventory.luaSha256[file]);
 assert.deepEqual(plan.bins.flat().sort(),plan.lua);assert.equal(plan.unknownJsMs,10000);
 assert(plan.posixMs<plan.posixBudgetMs,`Current POSIX forecast ${plan.posixMs} exceeds unchanged ${plan.posixBudgetMs}`);
 assert(plan.windowsMs<plan.windowsBudgetMs,`BLOCKED: current Windows17 forecast ${plan.windowsMs} exceeds unchanged ${plan.windowsBudgetMs} by ${plan.windowsMs-plan.windowsBudgetMs} ms; historical pass is not a current budget pass`);
});
