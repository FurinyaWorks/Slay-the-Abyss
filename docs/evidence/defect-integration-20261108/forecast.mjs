import {writeFileSync,readdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {discoverJs,jsShard,timings} from '../scripts/ci-shards.mjs';
import {shardLuaScripts} from '../scripts/test-lua.mjs';
import {qualityShardMatrices} from '../scripts/ci-quality-shape.mjs';
const js=discoverJs(),lua=readdirSync('tests/lua').filter(n=>n.endsWith('.lua')).map(n=>'tests/lua/'+n).sort();
const out={kind:'Complete inventory planning only; not hosted or executed job timings.',js:js.length,lua:lua.length,unknownJsMs:timings.unknownJsMs,floors:timings.jsPlanning.localLowerBounds,workers:2,concurrencyCapUnchanged:12,reserveMs:60000,platforms:{},inputs:{}};
for(const path of ['scripts/ci-shards.mjs','scripts/ci-test-timings.json','scripts/test-lua.mjs','scripts/ci-quality-shape.mjs'])out.inputs[path]=createHash('sha256').update(readFileSync(path)).digest('hex');
for(const [platform,count,budgetMs]of [['win32',qualityShardMatrices.windows.length,1800000],['linux',qualityShardMatrices.posix.length,1200000]]){
 const loads=jsShard(js,`1/${count}`,platform).loads;
 const assignments=Array.from({length:count},(_,i)=>jsShard(js,`${i+1}/${count}`,platform).files);
 assert.deepEqual(assignments.flat().sort(),[...js].sort());
 const entry={shards:count,budgetMs,jsLoads:loads,jsAssignments:assignments};
 let combined=loads;
 if(platform==='win32'){
  const plan={...timings,windowsJsShardMs:loads},bins=Array.from({length:count},(_,i)=>shardLuaScripts(lua,`${i+1}/${count}`,plan,2));
  assert.deepEqual(bins.flat().sort(),lua);
  const cost=f=>timings.luaShard[f]??timings.lua[f]??timings.unknownLuaMs,safety=f=>timings.lua[f]??timings.unknownLuaMs;
  combined=bins.map((bin,i)=>{const pool=[0,0];for(const f of bin.filter(f=>safety(f)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(f);return loads[i]+bin.filter(f=>safety(f)>=10000).reduce((s,f)=>s+cost(f),0)+Math.max(...pool);});entry.luaAssignments=bins;
 }else{entry.old13MaxWithReserveMs=Math.max(...jsShard(js,'1/13',platform).loads)+60000;}
 entry.combinedLoads=combined;entry.maxWithReserveMs=Math.max(...combined)+60000;entry.slackMs=budgetMs-entry.maxWithReserveMs;assert(entry.slackMs>0);out.platforms[platform]=entry;
}
writeFileSync('../defect-integration-planning.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({...out,floors:Object.keys(out.floors).length,inputs:undefined,platforms:Object.fromEntries(Object.entries(out.platforms).map(([k,v])=>[k,{shards:v.shards,maxWithReserveMs:v.maxWithReserveMs,budgetMs:v.budgetMs,slackMs:v.slackMs,old13MaxWithReserveMs:v.old13MaxWithReserveMs}]))},null,2));
