import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {preEncounterFormationCiSource,encounterFormationCiInventory,encounterFormationPlanningFloors} from '../../../tests/helpers/encounter-formation-ci-source-inverse.mjs';
import {discoverJs,jsShard,jsPlanningWeights,timings,partition} from '../../../scripts/ci-shards.mjs';
import {shardLuaScripts} from '../../../scripts/test-lua.mjs';
import {qualityShardMatrices} from '../../../scripts/ci-quality-shape.mjs';
const directory='docs/evidence/m7-formation-20261109',base='fb04fd36ab4fbdba71c0da08bf71d2899143f69b';
const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n'),hash=b=>createHash('sha256').update(b).digest('hex');
const fileHash=p=>hash(p.endsWith('.gz')?readFileSync(p):read(p));
const git=(...args)=>{const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:8*1024**2});assert.equal(r.status,0,r.stderr);return r.stdout;};
const archive=JSON.parse(gunzipSync(readFileSync('tests/helpers/encounter-formation-ci-source-epoch.json.gz')));
assert.equal(archive.sourceHead,base);
let negativeCases=0;
for(const [path,binding]of Object.entries(archive.files)){
 assert.equal(binding.beforeSource,git('show',base+':'+path),path+' complete original');
 assert.equal(hash(read(path)),binding.afterSha256,path+' current');
 assert.equal(preEncounterFormationCiSource(path,read(path)),binding.beforeSource);
 assert.equal(preEncounterFormationCiSource(path,read(path).replaceAll('\n','\r\n')),binding.beforeSource);
 for(const input of [binding.beforeSource,read(path)+'\n',read(path).slice(1),null,undefined,{},17]){assert.equal(preEncounterFormationCiSource(path,input),input);negativeCases++;}
 for(const wrong of ['__proto__','constructor','foreign']){assert.equal(preEncounterFormationCiSource(wrong,read(path)),read(path));negativeCases++;}
}
const prior=JSON.parse(archive.files['scripts/ci-test-timings.json'].beforeSource),withoutNew=structuredClone(timings);
for(const [key,floor]of Object.entries(encounterFormationPlanningFloors)){
 assert.deepEqual(timings.jsPlanning.localLowerBounds[key],floor);delete withoutNew.jsPlanning.localLowerBounds[key];
 const receipt=JSON.parse(read(floor.sourceReceipt)),raw=readFileSync(floor.sourceLog),log=gunzipSync(raw);
 assert.equal(fileHash(floor.sourceReceipt),floor.sourceReceiptSha256);assert.equal(hash(raw),floor.sourceLogSha256);assert.equal(hash(log),floor.sourceLogUncompressedSha256);
 assert.equal(floor.durationMs,Math.ceil(receipt.durationMs));assert.equal(receipt.tests,receipt.pass);assert.equal(receipt.fail,0);assert.equal(receipt.skipped,0);assert.equal(receipt.cancelled,0);
 assert.equal(fileHash(key),floor.testSha256);assert.deepEqual(floor.inputSha256,receipt.inputSha256);
 for(const platform of ['win32','linux']){assert.equal(timings.js[platform][key],undefined);assert.equal(jsPlanningWeights([key],platform)[key],Math.max(10000,floor.durationMs));}
}
assert.deepEqual(withoutNew,prior,'all previous timing evidence and execution/planning knobs unchanged');
const priorPaths=git('ls-tree','-r','--name-only',base,'tests').trim().split('\n');
assert.deepEqual(encounterFormationCiInventory.js,priorPaths.filter(p=>/^tests\/[^/]+\.test\.mjs$/.test(p)).sort());
const lua=readdirSync('tests/lua').filter(p=>p.endsWith('.lua')).map(p=>'tests/lua/'+p).sort(),js=discoverJs().sort();
assert.equal(js.length,800);assert.equal(lua.length,1410);
assert.deepEqual(lua,Object.keys(encounterFormationCiInventory.luaSha256));
for(const file of lua)assert.equal(fileHash(file),encounterFormationCiInventory.luaSha256[file],file);
for(const path of ['scripts/ci-quality-shape.mjs','scripts/ci-shards.mjs','scripts/test-lua.mjs','.github/workflows/quality.yml','scripts/lua-workers.mjs','scripts/ci-timeout-policy.mjs'])assert.equal(read(path),git('show',base+':'+path),path+' unchanged');
assert.equal(qualityShardMatrices.windows.length,17);assert.equal(qualityShardMatrices.posix.length,14);
const forecasts={};
for(const [platform,count]of [['win32',17],['linux',14]]){
 const {loads}=jsShard(js,'1/'+count,platform);
 const jsBins=Array.from({length:count},(_,i)=>jsShard(js,`${i+1}/${count}`,platform).files);
 assert.deepEqual(jsBins.flat().sort(),js);
 let combined=loads;
 if(platform==='win32'){
  const bins=Array.from({length:count},(_,i)=>shardLuaScripts(lua,`${i+1}/${count}`,{...timings,windowsJsShardMs:loads},2));
  assert.deepEqual(bins.flat().sort(),lua);
  const cost=file=>timings.luaShard[file]??timings.lua[file]??timings.unknownLuaMs,safety=file=>timings.lua[file]??timings.unknownLuaMs;
  combined=bins.map((bin,i)=>{const pool=[0,0];for(const file of bin.filter(f=>safety(f)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(file);return loads[i]+bin.filter(f=>safety(f)>=10000).reduce((n,f)=>n+cost(f),0)+Math.max(...pool);});
 }
 forecasts[platform]={count,maximumPlusReserveMs:Math.max(...combined)+60000,budgetMs:platform==='win32'?1800000:1200000};
 forecasts[platform].overrunMs=Math.max(0,forecasts[platform].maximumPlusReserveMs-forecasts[platform].budgetMs);
}
assert.equal(forecasts.win32.maximumPlusReserveMs,1794163);assert.equal(forecasts.linux.maximumPlusReserveMs,1205156);assert.equal(forecasts.linux.overrunMs,5156);
const receipts=[];
for(const name of ['ci-runtime','ci-calibration']){
 const r=JSON.parse(read(`${directory}/${name}-receipt.json`)),bytes=readFileSync(r.sourceLog),log=gunzipSync(bytes).toString();
 assert.equal(hash(bytes),r.sourceLogSha256);assert.equal(hash(log),r.sourceLogUncompressedSha256);assert.deepEqual(r.beforeInputSha256,r.afterInputSha256);assert.equal(r.beforeAfterHashesMatched,true);
 for(const key of ['tests','pass','fail','skipped','cancelled','duration_ms'])assert(log.includes(`${key} ${r[key]}`));
 const drift=Object.entries(r.afterInputSha256).filter(([p,sha])=>fileHash(p)!==sha).map(([p])=>p);
 assert(!r.actualFullPassClaim);assert.equal(r.exitCode,name==='ci-calibration'?1:0);
 if(name==='ci-calibration'){assert.equal(r.tests,39);assert.equal(r.pass,38);assert.equal(r.fail,1);assert.match(log,/complete POSIX inventory fits the unchanged performance target including reserve/);}
 receipts.push({name,tests:r.tests,pass:r.pass,fail:r.fail,exitCode:r.exitCode,currentInputDrift:drift,receiptSha256:fileHash(`${directory}/${name}-receipt.json`)});
}
const equivalence=JSON.parse(read(`${directory}/ci-boundary-equivalence.json`)),equivalenceReceipt=JSON.parse(read(`${directory}/ci-boundary-equivalence-receipt.json`));
assert.equal(fileHash(`${directory}/ci-boundary-equivalence.mjs`),equivalenceReceipt.scriptSha256);
assert.equal(fileHash(`${directory}/ci-boundary-equivalence.json`),equivalenceReceipt.resultSha256);
assert.equal(equivalence.originalModuleSha256,hash(git('show',base+':tests/helpers/ci-complete-calibration-source-inverse.mjs')));
assert.equal(equivalence.currentModuleSha256,fileHash('tests/helpers/ci-complete-calibration-source-inverse.mjs'));
assert.deepEqual(equivalence.beforeInputSha256,equivalence.afterInputSha256);
for(const [p,sha]of Object.entries(equivalence.afterInputSha256))assert.equal(hash(readFileSync(p)),sha,p);
assert.equal(equivalence.equivalent,true);assert.equal(equivalence.comparisons,4255);assert.equal(equivalence.completeSourceInputs.length,27);assert.equal(equivalence.downstreamTestFiles.length,91);
assert.equal(equivalence.actualFullPassClaim,false);assert.match(equivalence.staticParsing,/computed imports are outside/);
const consumer=JSON.parse(read(`${directory}/ci-live-consumers-receipt.json`));
assert.deepEqual(consumer.beforeInputSha256,consumer.afterInputSha256);assert.equal(consumer.beforeAfterHashesMatched,true);
for(const [p,sha]of Object.entries(consumer.afterInputSha256))assert.equal(fileHash(p),sha,p);
assert.equal(consumer.exitCode,0);assert.equal(consumer.tests,87);assert.equal(consumer.pass,87);assert.equal(consumer.fail,0);assert.equal(consumer.cancelled,0);assert.equal(consumer.skipped,0);assert.equal(consumer.testFiles.length,6);
for(const r of [equivalenceReceipt,consumer]){
 const bytes=readFileSync(r.sourceLog),plain=gunzipSync(bytes);assert.equal(hash(bytes),r.sourceLogSha256);assert.equal(hash(plain),r.sourceLogUncompressedSha256);
 if(r===consumer)for(const key of ['tests','pass','fail','cancelled','skipped','duration_ms'])assert(plain.toString().includes(`${key} ${r[key]}`));
 assert.equal(r.actualFullPassClaim,false);
}
console.log('PASS supplemental evidence: 4255 projection outcomes over 27 full inputs (91 statically reachable tests identified, not executed); six real consumers 87/87, all 127 recorded inputs unchanged');
const result={reviewer:'EncounterFormation independent reviewer (not the implementer)',reviewedAt:new Date().toISOString(),conclusion:'BLOCKED',scope:'CI source/floor/planning review; not an execution of Full. All supplied local consumer evidence reviewed; exact HEAD admission and Full remain pending.',baseSha:base,exactCiInverseBindings:Object.keys(archive.files).length,negativeCases,inventory:{js:800,lua:1410},floors:Object.fromEntries(Object.entries(encounterFormationPlanningFloors).map(([p,f])=>[p,{observedMs:f.nodeReportedDurationMs,floorMs:f.durationMs,effectiveMs:jsPlanningWeights([p],'linux')[p]}])),forecasts,oldCostsAndExecutionShapeUnchanged:true,supplemental:{staticDownstreamTests:91,staticTestsWereExecuted:false,fullInputs:27,equivalenceComparisons:4255,consumerFiles:consumer.testFiles,consumerTests:87,consumerPass:87,consumerInputCount:Object.keys(consumer.afterInputSha256).length,boundaryReceiptSha256:fileHash(`${directory}/ci-boundary-equivalence-receipt.json`),consumerReceiptSha256:fileHash(`${directory}/ci-live-consumers-receipt.json`)},receipts,inputSha256:Object.fromEntries(['scripts/ci-test-timings.json','tests/helpers/encounter-formation-ci-source-inverse.mjs','tests/helpers/encounter-formation-ci-source-epoch.json.gz','tests/helpers/ci-complete-calibration-source-inverse.mjs','tests/ci-runtime.test.mjs','tests/ci-complete-calibration.test.mjs'].map(p=>[p,fileHash(p)]))};
writeFileSync(`${directory}/independent-ci-review.json`,JSON.stringify(result,null,2)+'\n');
console.log('PASS independent CI source/floor contracts: six exact predecessor bindings, '+negativeCases+' foreign-input checks, unchanged old costs and 17/14 execution shape');
console.log('BLOCKED reproduced: Windows 1794163/1800000 ms; POSIX 1205156/1200000 ms, overrun 5156 ms. No Full pass claimed.');
console.log(JSON.stringify(result,null,2));
