// Reproduce from any working directory. Planning only; never executes tests.
// node docs/evidence/m7-published-combination-20261109/forecast.mjs
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {discoverJs,jsShard,jsPlanningWeights,timings} from '../../../scripts/ci-shards.mjs';
import {shardLuaScripts} from '../../../scripts/test-lua.mjs';
import {qualityShardMatrices} from '../../../scripts/ci-quality-shape.mjs';

const root=new URL('../../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root));
const hash=value=>createHash('sha256').update(value).digest('hex');
const js=discoverJs(fileURLToPath(root)).sort();
const lua=readdirSync(new URL('tests/lua/',root)).filter(n=>n.endsWith('.lua')).map(n=>'tests/lua/'+n).sort();
assert.equal(js.length,788);
assert.equal(lua.length,1410);

// Exact current timings identity is recorded below; original costs are tested independently.
assert.equal(qualityShardMatrices.windows.length,17);
assert.equal(qualityShardMatrices.posix.length,14);
const workflow=read('.github/workflows/quality.yml').toString().replaceAll('\r\n','\n');
assert.match(workflow,/timeout-minutes: \$\{\{ inputs.runner_pool == 'local-special' && 75 \|\| 45 \}\}/);
assert.match(workflow,/runs-on: ubuntu-24.04\n    timeout-minutes: 30/);
assert.match(workflow,/max-parallel: 12/);
const reserveMs=60000,workers=2,plans={};
for(const [platform,count,targetMs,executionGuardMs]of [
 ['win32',17,1800000,2700000],
 ['linux',14,1200000,1800000],
]){
 const weights=jsPlanningWeights(js,platform);
 for(const file of js)assert.equal(weights[file],Math.max(timings.js[platform][file]??timings.unknownJsMs,timings.jsPlanning.localLowerBounds[file]?.durationMs??0));
 const selections=Array.from({length:count},(_,i)=>jsShard(js,`${i+1}/${count}`,platform));
 const loads=selections[0].loads,jsBins=selections.map(s=>s.files);
 assert.deepEqual(jsBins.flat().sort(),js);
 assert.equal(new Set(jsBins.flat()).size,js.length);
 let combined=loads,luaBins=[];
 if(platform==='win32'){
  luaBins=Array.from({length:count},(_,i)=>shardLuaScripts(lua,`${i+1}/${count}`,{...timings,windowsJsShardMs:loads},workers));
  assert.deepEqual(luaBins.flat().sort(),lua);
  assert.equal(new Set(luaBins.flat()).size,lua.length);
  const cost=file=>timings.luaShard[file]??timings.lua[file]??timings.unknownLuaMs;
  const safety=file=>timings.lua[file]??timings.unknownLuaMs;
  combined=luaBins.map((bin,i)=>{
   const pool=[0,0];
   for(const file of bin.filter(f=>safety(f)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(file);
   return loads[i]+bin.filter(f=>safety(f)>=10000).reduce((sum,file)=>sum+cost(file),0)+Math.max(...pool);
  });
 }
 const maxPlusReserveMs=Math.max(...combined)+reserveMs;
 // Forecast is measured from the complete current inventory, never adjusted to fit.
 assert.ok(maxPlusReserveMs<targetMs);
 assert.ok(maxPlusReserveMs<executionGuardMs);
 plans[platform]={shards:count,performanceTargetMs:targetMs,executionGuardMs,
  initialGateReserveMs:timings.initialMs[platform][0],jsLoadsMs:loads,combinedLoadsMs:combined,
  jsFilesPerShard:jsBins.map(bin=>bin.length),luaFilesPerShard:luaBins.map(bin=>bin.length),
  assignmentSha256:hash(JSON.stringify({js:jsBins,lua:luaBins})),maxPlusReserveMs,
  performanceTargetHeadroomMs:targetMs-maxPlusReserveMs,executionGuardHeadroomMs:executionGuardMs-maxPlusReserveMs};
}
const sources=['scripts/ci-test-timings.json','scripts/ci-shards.mjs','scripts/test-lua.mjs',
 'scripts/lua-workers.mjs','scripts/ci-quality-shape.mjs','.github/workflows/quality.yml',
 'docs/evidence/m7-published-combination-20261109/forecast.mjs'];
console.log(JSON.stringify({
 schemaVersion:1,kind:'complete-inventory-planning-forecast',
 command:'node docs/evidence/m7-published-combination-20261109/forecast.mjs',
 actualFullPassClaim:false,hostedMeasurementClaim:false,
 semantics:'Placement-only estimate using per-file maximum of native hosted observations or unknown fallback and explicit local floors. Original timing evidence and raw Lua worker-safety weights are unchanged. Unknown and unmeasured files are included, not skipped. No tests are executed. Forecasts do not prove actual hosted completion or device acceptance.',
 inventory:{js:js.length,lua:lua.length,jsPathsSha256:hash(JSON.stringify(js)),luaPathsSha256:hash(JSON.stringify(lua))},
 localPlanningFloors:Object.keys(timings.jsPlanning.localLowerBounds).length,reserveMs,luaWorkers:workers,posixConcurrencyCap:12,
 performanceTargetsUnchanged:true,executionGuardsUnchanged:true,
 sourceSha256:Object.fromEntries(sources.map(path=>[path,hash(read(path))])),plans,
},null,2));
