import {readFileSync,readdirSync} from 'node:fs';import {pathToFileURL} from 'node:url';
const root=process.cwd();const {partition,discoverJs,timings}=await import(pathToFileURL(root+'/scripts/ci-shards.mjs'));
const {shardLuaScripts}=await import(pathToFileURL(root+'/scripts/test-lua.mjs'));
const observations=JSON.parse(readFileSync('.artifacts/emerald-cost/complete-file-observations.json'));
const prior=JSON.parse(readFileSync('docs/evidence/m7-map-emerald-20261109/ci-cost-observations.json'));
const floors=Object.fromEntries(observations.map(r=>[r.testFile,Math.ceil(Math.max(r.processWallMs,r.nodeTotalDurationMs))]));
for(const [file,row]of Object.entries(prior.completeStandaloneObservations))floors[file]=Math.max(floors[file]??0,Math.ceil(row.durationMs));
for(const row of prior.pairedWholeProcessObservations)floors[row.testFile]=Math.max(floors[row.testFile]??0,Math.ceil(Math.max(row.processWallMs,row.nodeTotalDurationMs)));
const cost=structuredClone(timings);for(const [file,durationMs]of Object.entries(floors))cost.jsPlanning.localLowerBounds[file]={durationMs};
const js=discoverJs(),lua=readdirSync('tests/lua').filter(f=>f.endsWith('.lua')).map(f=>'tests/lua/'+f).sort(),plans=[];
for(const [platform,count,budget]of [['win32',17,1800000],['linux',15,1200000]]){
 const weights=Object.fromEntries(js.map(f=>[f,Math.max(cost.js[platform][f]??cost.unknownJsMs,cost.jsPlanning.localLowerBounds[f]?.durationMs??0)]));
 const plansJs=Array.from({length:count},(_,i)=>partition(js,`${i+1}/${count}`,weights,cost.unknownJsMs,Array.from({length:count},(_,j)=>j===0?cost.initialMs[platform][0]:0))),loads=plansJs[0].loads;
 let maximum=Math.max(...loads);
 if(platform==='win32'){
  const bins=Array.from({length:count},(_,i)=>shardLuaScripts(lua,`${i+1}/${count}`,{...cost,windowsJsShardMs:loads},2));
  const effective=f=>cost.luaShard[f]??cost.lua[f]??cost.unknownLuaMs,safety=f=>cost.lua[f]??cost.unknownLuaMs;
  maximum=Math.max(...bins.map((bin,i)=>{const pool=[0,0];for(const f of bin.filter(f=>safety(f)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=effective(f);return loads[i]+bin.filter(f=>safety(f)>=10000).reduce((s,f)=>s+effective(f),0)+Math.max(...pool);}));
 }
 plans.push({platform,count,files:js.length,luaFiles:lua.length,forecastMs:maximum+60000,budgetMs:budget,headroomMs:budget-maximum-60000,jsCostTotalMs:loads.reduce((s,x)=>s+x,0),uniqueCoverage:new Set(plansJs.flatMap(p=>p.files)).size===js.length});
}
const result={kind:'diagnostic only; in-memory exact existing planner with conservative observed complete-file costs; no configuration change or Hosted proof',floors,plans};console.log(JSON.stringify(result,null,2));
