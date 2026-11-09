import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {discoverJs,partition,timings} from '../../../scripts/ci-shards.mjs';
import {shardLuaScripts} from '../../../scripts/test-lua.mjs';
import {qualityShardMatrices,qualityShardJobs} from '../../../scripts/ci-quality-shape.mjs';
import {currentFullQualityJobs} from '../../../scripts/verify-delivery.mjs';
import {preEncounterFormationCiSource,encounterFormationPlanningFloors,encounterFormationCiInventory} from '../../../tests/helpers/encounter-formation-ci-source-inverse.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),raw=p=>readFileSync(p),read=p=>raw(p).toString('utf8');
const formation='d21be2fb2d84f68767c3b1ef827b61a2b63aa323',posix='841510b78172b923b1a613216b5c3dcb2c3e062e';
const path='scripts/ci-test-timings.json',source=read(path),prior=preEncounterFormationCiSource(path,source),previous=JSON.parse(prior);
assert.equal(source,execFileSync('git',['show',formation+':'+path],{encoding:'utf8'}),'all current timings retain published Formation bytes');
assert.equal(prior,execFileSync('git',['show',posix+':'+path],{encoding:'utf8'}),'prior planning epoch retains published POSIX15 bytes');
const js=discoverJs(),lua=readdirSync('tests/lua').filter(n=>n.endsWith('.lua')).map(n=>'tests/lua/'+n).sort();
assert.equal(js.length,800);assert.equal(lua.length,1410);
const oldJs=js.filter(p=>!['tests/encounter-formation-responsibilities.test.mjs','tests/encounter-formation-source-epoch.test.mjs','tests/encounter-formation-complexity.test.mjs'].includes(p));assert.deepEqual(oldJs,encounterFormationCiInventory.js);
function plan(epoch,inventory,platform,count){
 const weights=Object.fromEntries(inventory.map(p=>[p,Math.max(epoch.js[platform][p]??epoch.unknownJsMs,epoch.jsPlanning.localLowerBounds[p]?.durationMs??0)]));
 const bins=Array.from({length:count},(_,i)=>partition(inventory,`${i+1}/${count}`,weights,epoch.unknownJsMs,Array.from({length:count},(_,j)=>j===0?epoch.initialMs[platform][0]:0)));
 assert.deepEqual(bins.flatMap(b=>b.files).sort(),[...inventory].sort());assert.equal(new Set(bins.flatMap(b=>b.files)).size,inventory.length);
 const loads=bins[0].loads,result={platform,count,jsCount:inventory.length,luaCount:lua.length,weights,jsAssignments:bins.map(b=>b.files),jsLoads:loads,totalPlannedJsMs:loads.reduce((a,b)=>a+b,0)};
 let combined=loads;
 if(platform==='win32'){
  const luaBins=Array.from({length:count},(_,i)=>shardLuaScripts(lua,`${i+1}/${count}`,{...epoch,windowsJsShardMs:loads},2));
  assert.deepEqual(luaBins.flat().sort(),lua);assert.equal(new Set(luaBins.flat()).size,lua.length);
  const cost=p=>epoch.luaShard[p]??epoch.lua[p]??epoch.unknownLuaMs,safety=p=>epoch.lua[p]??epoch.unknownLuaMs;
  combined=luaBins.map((bin,i)=>{const pool=[0,0];for(const p of bin.filter(p=>safety(p)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(p);return loads[i]+bin.filter(p=>safety(p)>=10000).reduce((sum,p)=>sum+cost(p),0)+Math.max(...pool);});
  Object.assign(result,{luaAssignments:luaBins,luaSafetyWorkers:2});
 }
 Object.assign(result,{combinedLoads:combined,reserveMs:60000,forecastMs:Math.max(...combined)+60000,budgetMs:platform==='linux'?1200000:1800000,executionGuardMs:platform==='linux'?1800000:2700000});result.headroomMs=result.budgetMs-result.forecastMs;return result;
}
const oldPlans=[plan(previous,oldJs,'win32',17),plan(previous,oldJs,'linux',14),plan(previous,oldJs,'linux',15)];
const newPlans=[plan(timings,js,'win32',17),plan(timings,js,'linux',14),plan(timings,js,'linux',15)];
assert.deepEqual(oldPlans.map(p=>p.forecastMs),[1791774,1202485,1126323]);assert.deepEqual(newPlans.map(p=>p.forecastMs),[1794163,1205156,1128812]);
assert.deepEqual(oldPlans.slice(1).map(p=>p.totalPlannedJsMs),[15994730,15994730]);assert.deepEqual(newPlans.slice(1).map(p=>p.totalPlannedJsMs),[16032072,16032072]);
assert.equal(qualityShardJobs.length,32);assert.equal(currentFullQualityJobs.length,37);assert.equal(qualityShardMatrices.windows.length,17);assert.equal(qualityShardMatrices.posix.length,15);
const guards=['scripts/ci-shards.mjs','scripts/test-lua.mjs',path,'.github/workflows/quality.yml','scripts/verify-delivery.mjs','scripts/publish-full-quality.mjs','scripts/publish-merge-group.mjs'];
for(const p of guards)assert.equal(read(p),execFileSync('git',['show',formation+':'+p],{encoding:'utf8'}),'unchanged Formation runtime '+p);
const authenticatedFloors={};
for(const [p,floor]of Object.entries(encounterFormationPlanningFloors)){
 assert.deepEqual(timings.jsPlanning.localLowerBounds[p],floor);
 for(const [input,sha]of Object.entries(floor.inputSha256))assert.equal(hash(input.endsWith('.gz')?raw(input):read(input).replaceAll('\r\n','\n')),sha,input);
 assert.equal(hash(raw(floor.sourceLog)),floor.sourceLogSha256);assert.equal(hash(raw(floor.sourceReceipt)),floor.sourceReceiptSha256);
 authenticatedFloors[p]={durationMs:floor.durationMs,inputCount:Object.keys(floor.inputSha256).length,sourceLog:floor.sourceLog,sourceLogSha256:floor.sourceLogSha256,sourceReceipt:floor.sourceReceipt,sourceReceiptSha256:floor.sourceReceiptSha256,scope:'Exact original complete-run inputs authenticated, not a current rerun or hosted measurement'};
}
const output=process.argv[2]??`build/formation-posix15-planning-${Date.now()}.json.gz`;assert.ok(process.argv.length<=3,'Usage: node ci-planning.mjs [new-output.json.gz]');assert.ok(!existsSync(output));
const receipt={scope:'Complete deterministic assignment and forecast, not measured hosted runtime or Full pass. Old797/1410 and combined800/1410 inventories each reproduce Windows17 and POSIX14/15 with full membership and duplicate checks.',parents:{formation,posix},qualityShardMatrices,qualityShardJobs,currentFullQualityJobs,priorTimingsSha256:hash(prior),currentTimingsSha256:hash(source),original797:oldPlans,combined800:newPlans,unchangedRuntimeSha256:Object.fromEntries(guards.map(p=>[p,hash(raw(p))])),authenticatedFloors,notRun:['Hosted Full37','Expensive Formation or Defect behavior/source VMs','Broad91 transitive source suite'],actualFullPassClaim:false};
writeFileSync(output,gzipSync(JSON.stringify(receipt,null,2)+'\n',{mtime:0}),{flag:'wx'});console.log(JSON.stringify({pass:true,output,forecasts:[...oldPlans,...newPlans].map(({platform,count,jsCount,forecastMs,budgetMs,headroomMs,totalPlannedJsMs})=>({platform,count,jsCount,forecastMs,budgetMs,headroomMs,totalPlannedJsMs})),authenticatedFloors},null,2));
