import {discoverJs,jsShard,timings} from '../../scripts/ci-shards.mjs';
import {readdirSync} from 'node:fs';
import {shardLuaScripts} from '../../scripts/test-lua.mjs';
export function currentSuccessorPlan(){
 const js=discoverJs(),lua=readdirSync('tests/lua').filter(f=>f.endsWith('.lua')).map(f=>'tests/lua/'+f).sort();
 const posix=jsShard(js,'1/15','linux').loads,windows=jsShard(js,'1/17','win32').loads;
 const bins=Array.from({length:17},(_,i)=>shardLuaScripts(lua,`${i+1}/17`,{...timings,windowsJsShardMs:windows},2));
 const cost=f=>timings.luaShard[f]??timings.lua[f]??timings.unknownLuaMs,safety=f=>timings.lua[f]??timings.unknownLuaMs;
 const totals=bins.map((bin,i)=>{const pool=[0,0];for(const f of bin.filter(f=>safety(f)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(f);return windows[i]+bin.filter(f=>safety(f)>=10000).reduce((sum,f)=>sum+cost(f),0)+Math.max(...pool);});
 return {js,lua,bins,unknownJsMs:timings.unknownJsMs,posixMs:Math.max(...posix)+60000,windowsMs:Math.max(...totals)+60000,reserveMs:60000,posixBudgetMs:1200000,windowsBudgetMs:1800000};
}
