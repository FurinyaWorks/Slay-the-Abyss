// Read-only planning diagnostic. Imports planner definitions, never their CLIs or node:test.
// Usage: node /tmp/map-cost-capacity-proof.mjs [absolute-checkout-root]
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]??'/workspace/scratch/c1a4970a76e0/m7-map-emerald-cost');process.chdir(root);
const hash=value=>createHash('sha256').update(value).digest('hex');
const read=p=>readFileSync(resolve(root,p));
const original=JSON.parse(read('scripts/ci-test-timings.json'));
const measuredPath='docs/evidence/m7-map-emerald-cost-20261110/complete-file-observations.json';
const previousPath='docs/evidence/m7-map-emerald-20261109/ci-cost-observations.json';
const measurements=JSON.parse(read(measuredPath)),previous=JSON.parse(read(previousPath));
const floors={};
for(const row of measurements)floors[row.testFile]=Math.max(floors[row.testFile]??0,Math.ceil(Math.max(row.processWallMs,row.nodeTotalDurationMs)));
for(const [file,row]of Object.entries(previous.completeStandaloneObservations))floors[file]=Math.max(floors[file]??0,Math.ceil(row.durationMs));
for(const row of previous.pairedWholeProcessObservations)floors[row.testFile]=Math.max(floors[row.testFile]??0,Math.ceil(Math.max(row.processWallMs,row.nodeTotalDurationMs)));
const timing=structuredClone(original);
for(const [file,durationMs]of Object.entries(floors))timing.jsPlanning.localLowerBounds[file]={...timing.jsPlanning.localLowerBounds[file],durationMs:Math.max(durationMs,timing.jsPlanning.localLowerBounds[file]?.durationMs??0)};
const {partition,discoverJs}=await import(pathToFileURL(resolve(root,'scripts/ci-shards.mjs')));
const {shardLuaScripts}=await import(pathToFileURL(resolve(root,'scripts/test-lua.mjs')));
const js=discoverJs().sort(),lua=readdirSync('tests/lua').filter(f=>f.endsWith('.lua')).map(f=>'tests/lua/'+f).sort();
const cost=f=>timing.luaShard[f]??timing.lua[f]??timing.unknownLuaMs,safety=f=>timing.lua[f]??timing.unknownLuaMs,short=f=>safety(f)<10000;
const order=(a,b)=>safety(b)-safety(a)||(a<b?-1:a>b?1:0);
const serialLuaMs=lua.filter(f=>!short(f)).reduce((s,f)=>s+cost(f),0),shortLuaMs=lua.filter(short).reduce((s,f)=>s+cost(f),0),reserveMs=60000;
const plans=[];
for(const [platform,count,budgetMs]of [['win32',17,1800000],['linux',15,1200000]]){
 const weights=Object.fromEntries(js.map(f=>[f,Math.max(timing.js[platform][f]??timing.unknownJsMs,timing.jsPlanning.localLowerBounds[f]?.durationMs??0)]));
 const binsJs=Array.from({length:count},(_,i)=>partition(js,`${i+1}/${count}`,weights,timing.unknownJsMs,Array.from({length:count},(_,j)=>j===0?timing.initialMs[platform][0]:0)));
 const loads=binsJs[0].loads,totalJsIncludingGateMs=loads.reduce((s,v)=>s+v,0);
 let rows=loads.map((jsMs,i)=>({shard:i+1,jsMs,totalMs:jsMs})),luaCoverage=null;
 if(platform==='win32'){
  const bins=Array.from({length:count},(_,i)=>shardLuaScripts(lua,`${i+1}/${count}`,{...timing,windowsJsShardMs:loads},2));
  luaCoverage=bins.flat().length===lua.length&&JSON.stringify(bins.flat().sort())===JSON.stringify(lua);
  rows=bins.map((bin,i)=>{const pool=[0,0];for(const f of bin.filter(short).sort(order))pool[pool[0]<=pool[1]?0:1]+=cost(f);
   const serialMs=bin.filter(f=>!short(f)).reduce((s,f)=>s+cost(f),0);
   return {shard:i+1,jsMs:loads[i],exclusiveLuaMs:serialMs,shortWorkerMs:pool,shortCount:bin.filter(short).length,exclusiveCount:bin.filter(f=>!short(f)).length,totalMs:loads[i]+serialMs+Math.max(...pool)};});
 }
 const normalizedWorkMs=totalJsIncludingGateMs+(platform==='win32'?serialLuaMs+shortLuaMs/2:0);
 const lowerBoundMs=normalizedWorkMs/count+reserveMs;
 plans.push({platform,count,budgetMs,reserveMs,forecastMs:Math.max(...rows.map(r=>r.totalMs))+reserveMs,
  totalJsIncludingGateMs,normalizedWorkMs,availableNormalizedWorkMs:count*(budgetMs-reserveMs),workDeficitMs:normalizedWorkMs-count*(budgetMs-reserveMs),
  lowerBoundExact:`${normalizedWorkMs}/${count}+${reserveMs}`,lowerBoundMs,integerLowerBoundMs:Math.ceil(lowerBoundMs),
  jsCoverage:binsJs.flatMap(b=>b.files).length===js.length&&JSON.stringify(binsJs.flatMap(b=>b.files).sort())===JSON.stringify(js),luaCoverage,rows});
}
const paths=['scripts/ci-test-timings.json','scripts/ci-shards.mjs','scripts/test-lua.mjs','scripts/lua-workers.mjs','scripts/ci-quality-shape.mjs',measuredPath,previousPath,'docs/evidence/m7-map-emerald-cost-20261110/forecast.json'];
console.log(JSON.stringify({kind:'read-only capacity lower-bound diagnostic, not a test execution or hosted timing proof',root,
 inputSha256:Object.fromEntries(paths.map(p=>[p,hash(read(p))])),
 floors:Object.fromEntries(Object.entries(floors).sort(([a],[b])=>a.localeCompare(b)).map(([p,v])=>[p,{durationMs:v,currentSourceSha256:hash(read(p)),previousSavedFloorMs:original.jsPlanning.localLowerBounds[p]?.durationMs??null}])),
 inventory:{js:js.length,lua:lua.length,jsNamesSha256:hash(JSON.stringify(js)),luaNamesSha256:hash(JSON.stringify(lua)),shortLua:lua.filter(short).length,exclusiveLua:lua.filter(f=>!short(f)).length},
 originalFloorCount:Object.keys(original.jsPlanning.localLowerBounds).length,projectedFloorCount:Object.keys(timing.jsPlanning.localLowerBounds).length,
 preservedOriginalFloors:Object.entries(original.jsPlanning.localLowerBounds).every(([p,v])=>JSON.stringify(timing.jsPlanning.localLowerBounds[p])===JSON.stringify(v)),
 serialLuaMs,shortLuaMs,plans,
 proof:['For shard i, completion C_i >= J_i + E_i + S_i/2 because JS and exclusive Lua remain serial and precede a short Lua pool of at most two workers.',
 'Summing over every shard and retaining complete unique coverage gives max(C_i) >= (sum J_i + sum E_i + sum S_i/2)/N. Assignment, order and perfect short-pool balancing cannot reduce this bound.',
 `Add the unchanged ${reserveMs} ms reserve. Windows lower bound is ${plans[0].lowerBoundMs} ms and the integer-millisecond lower bound is ${plans[0].integerLowerBoundMs} ms against target ${plans[0].budgetMs} ms. Assignment cannot change the ${plans[0].workDeficitMs} ms normalized workload deficit.`],
 caveats:['Local measurements remain planning estimates, not hosted elapsed-time guarantees.','No test suite, Full run, configuration change, repository write, or upload performed.','Historical standalone observations keep their existing provenance limitations; their conservative costs are not weakened.']},null,2));
