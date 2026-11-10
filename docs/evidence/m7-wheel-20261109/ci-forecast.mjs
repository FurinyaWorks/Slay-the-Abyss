import {readFileSync,readdirSync} from 'node:fs';
import {discoverJs,partition} from '../../../scripts/ci-shards.mjs';
import {qualityShardMatrices} from '../../../scripts/ci-quality-shape.mjs';
import {shardLuaScripts} from '../../../scripts/test-lua.mjs';
export function forecast(t,js=discoverJs(),counts={win32:qualityShardMatrices.windows.length,linux:qualityShardMatrices.posix.length}){
 const lua=readdirSync('tests/lua').filter(n=>n.endsWith('.lua')).map(n=>'tests/lua/'+n).sort(),result={inventory:{js:js.length,lua:lua.length},floors:Object.keys(t.jsPlanning.localLowerBounds).length,platforms:{}};
 for(const [platform,count]of Object.entries(counts)){
  const weights=Object.fromEntries(js.map(p=>[p,Math.max(t.js[platform][p]??t.unknownJsMs,t.jsPlanning.localLowerBounds[p]?.durationMs??0)]));
  const loads=partition(js,`1/${count}`,weights,t.unknownJsMs,Array.from({length:count},(_,i)=>i===0?t.initialMs[platform][0]:0)).loads;
  let combined=loads;
  if(platform==='win32')combined=Array.from({length:count},(_,i)=>{const raw=shardLuaScripts(lua,`${i+1}/${count}`,{...t,windowsJsShardMs:loads},2),cost=p=>t.luaShard[p]??t.lua[p]??t.unknownLuaMs,safety=p=>t.lua[p]??t.unknownLuaMs,pool=[0,0];for(const p of raw.filter(p=>safety(p)<10000).sort((a,b)=>safety(b)-safety(a)||a.localeCompare(b)))pool[pool[0]<=pool[1]?0:1]+=cost(p);return loads[i]+raw.filter(p=>safety(p)>=10000).reduce((s,p)=>s+cost(p),0)+Math.max(...pool);});
  result.platforms[platform]={count,loads:combined,forecastMs:Math.max(...combined)+60000,budgetMs:platform==='win32'?1800000:1200000,spareMs:(platform==='win32'?1800000:1200000)-Math.max(...combined)-60000};
 }
 return result;
}
if(process.argv[1]?.endsWith('ci-forecast.mjs'))console.log(JSON.stringify(forecast(JSON.parse(readFileSync('scripts/ci-test-timings.json'))),null,2));
