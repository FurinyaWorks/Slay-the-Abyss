import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const root=process.cwd();
const require=createRequire(root+'/package.json');const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
const {sourceEpoch}=await import(root+'/tests/helpers/combined-epoch/source-epoch.mjs');
const proof=sourceEpoch.proof,path='src/lua/abyss_relic_hooks.lua';let checks=0;
for(const newline of ['\n','\r\n'])for(const target of Object.keys(proof.targets)){
 const source=proof.current[path].source.replaceAll('\n',newline);let bad=null;
 const reader=p=>proof.current[p]?.source.replaceAll('\n',newline)+(bad===p?'\n':'');
 for(const owner of proof.owners){bad=null;assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource:reader}),proof.targets[target].files[path].source);bad=owner;
 assert.throws(()=>sourceEpoch.preCombinedSource(path,source,{target,readSource:reader}),/linked owner identity/);checks++;}
}
const prelude=`
local trace={};local function log(x)trace[#trace+1]=x end
local Q={localId=function(x)log('id:'..type(x));return x end}
local rules={gainGold=function(r,n)log('gold:'..n);r.gold=(r.gold or 0)+n end,previewCardReward=function(r,reward)log('preview:'..reward.name);reward.visited=true;if reward.fail then error('preview failed',0)end end}
package.loaded.abyss_relic_potion_hooks={};package.loaded.abyss_sts_random={};package.loaded.abyss_relic_queries={hooks=Q};package.loaded.abyss_relic_combat_hooks={};package.loaded.abyss_relic_family_combat={common=rules}
local phases={'uncommon','rare','boss','shop'}
for _,phase in ipairs(phases)do package.loaded['abyss_'..phase..'_relics']={onEquip=function(r,id)log(phase);if r.stop==phase then r.partial=true;error(phase..' failed',0)end;return true end,bottleCandidates=function(r)return r.candidates end}end
package.loaded.abyss_act2_event_relics={onEquip=function(r,id,api)log('necro');return false,nil,{},'fourth',nil end}
package.loaded.abyss_lizard_tail={onObtain=function(r)log('tail');r.tail=true;return false,'ignored'end}
`;
const cases=`
local function call(id,r)
 local result=table.pack(pcall(H.onEquip,r,id));log('arity:'..result.n)
 for i=1,result.n do log('return:'..type(result[i])..':'..(type(result[i])=='string'and result[i]or(type(result[i])=='boolean'and tostring(result[i])or '')))end
end
for _,id in ipairs({'omamori','nloths_mask','circlet','tiny_chest','potion_belt','old_coin','necronomicon','lizard_tail','unknown',false,3,{}})do
 for _,stop in ipairs({'none','uncommon','rare','boss','shop'})do
 local storage={stop=stop,unknown={chances={}},data={rules={player={potionSlots=3}}}};local writes=0
 local r=setmetatable({}, {__index=function(_,k)log('read:'..k);return storage[k]end,__newindex=function(_,k,v)log('write:'..k);writes=writes+1;storage[k]=v end})
 call(id,r)
 if storage.relicCounters then for _,k in ipairs({'omamori','nloths_mask','circlet'})do log(k..':'..tostring(storage.relicCounters[k]))end end
 log('writes:'..writes)
 end
end
for _,failAt in ipairs({'relicCounters','omamori','potionSlots','tinyChestCount'})do
 local counters=setmetatable({}, {__newindex=function(_,k,v)log('counter-write:'..k);if k==failAt then error('counter write failed',0)end end})
 local r=setmetatable({relicCounters=counters,unknown={chances=setmetatable({}, {__newindex=function(_,k,v)log('chance-write:'..k);if k==failAt then error('chance write failed',0)end end})},data={rules={player={potionSlots=3}}}}, {__newindex=function(_,k,v)log('run-write:'..k);if k==failAt then error('run write failed',0)end end})
 call('omamori',r);call('potion_belt',r);call('tiny_chest',r)
end
for _,fail in ipairs({false,true})do
 local r={phase='reward',rewards={name='combat'},nodeFlow={event={id='sensory_stone',rewardScreenOpen=true,rewards={{name='one',fail=fail},{name='skip',claimed=true},{name='three'}}}}}
 call('toxic_egg',r)
end
call(nil,{})
return table.concat(trace,'\\n')
`;
function run(source){const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);let n=0;lua.lua_sethook(L,()=>{if(++n>3000)throw Error('bound')},lua.LUA_MASKCOUNT,10000);const code=prelude+'\nlocal H=(function()\n'+source+'\nend)()\n'+cases;const status=lauxlib.luaL_dostring(L,to_luastring(code));const result=to_jsstring(lua.lua_tostring(L,-1));lua.lua_close(L);assert.equal(status,0,result);return result;}
const old=readFileSync('tests/fixtures/relic-equip-before.lua','utf8'),current=readFileSync(path,'utf8');const oldTrace=run(old),trace=run(current);assert.equal(trace,oldTrace);
console.log(JSON.stringify({ownerDriftChecks:checks,targets:Object.keys(proof.targets).length,ownerCount:proof.owners.length,newlineForms:2,traceLines:trace.split('\n').length,metatableDifferential:'pass'}));
