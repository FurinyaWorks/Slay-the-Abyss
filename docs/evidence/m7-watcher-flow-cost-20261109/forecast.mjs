import {readdirSync,writeFileSync,readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {discoverJs,jsShard,timings} from '../../../scripts/ci-shards.mjs';
import {shardLuaScripts} from '../../../scripts/test-lua.mjs';
const js=discoverJs(),lua=readdirSync('tests/lua').filter(f=>f.endsWith('.lua')).map(f=>'tests/lua/'+f).sort();
const rows=[];
for(const[platform,count,budget]of [['win32',17,1800000],['win32',18,1800000],['linux',15,1200000]]){
 const jsBins=Array.from({length:count},(_,i)=>jsShard(js,`${i+1}/${count}`,platform));
 assert.deepEqual(jsBins.flatMap(b=>b.files).sort(),[...js].sort());const jsLoads=jsBins[0].loads;
 let loads=jsLoads;
 if(platform==='win32'){
  const bins=Array.from({length:count},(_,i)=>shardLuaScripts(lua,`${i+1}/${count}`,{...timings,windowsJsShardMs:jsLoads},2));
  assert.deepEqual(bins.flat().sort(),lua);const cost=f=>timings.luaShard[f]??timings.lua[f]??timings.unknownLuaMs,safety=f=>timings.lua[f]??timings.unknownLuaMs;
  loads=bins.map((bin,i)=>{const workers=[0,0];for(const f of bin.filter(f=>safety(f)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))workers[workers[0]<=workers[1]?0:1]+=cost(f);return jsLoads[i]+bin.filter(f=>safety(f)>=10000).reduce((s,f)=>s+cost(f),0)+Math.max(...workers);});
 }
 const forecast=Math.max(...loads)+60000;rows.push({platform,count,budget,forecast,margin:budget-forecast,loads});
}
const result={js:js.length,lua:lua.length,floors:Object.keys(timings.jsPlanning.localLowerBounds).length,rows};mkdirSync('build',{recursive:true});writeFileSync('build/watcher-flow-cost-replay.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,rows:rows.map(({loads,...r})=>r)},null,2));
