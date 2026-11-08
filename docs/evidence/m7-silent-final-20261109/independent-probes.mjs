import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {luaString} from '../../../scripts/build-lua-data.mjs';
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=createRequire(import.meta.url)('fengari');
const path='src/lua/abyss_silent_final_cards.lua',base='d2ed1bbfdb1bc9e000870f38037592cc60ab4068';
const before=execFileSync('git',['show',`${base}:${path}`],{encoding:'utf8'}),after=readFileSync(path,'utf8');
const probe=`
local traces={};local function note(x)traces[#traces+1]=x end
local sentinel={};local fake={}
require=function(name)note('require:'..name);return fake[name]end
local M=assert(load(SOURCE,'@module'))()
assert(#traces==0,'module load must remain lazy')
local function run(label,kind)
 local reads=0;local e=setmetatable({},{__index=function(_,key)note('effect:'..key);reads=reads+1;return kind end})
 local result=table.pack(pcall(M.apply,{}, {},{effect=e}));assert(not result[1]);assert(reads==1)
 local err=result[2];if type(err)=='string'then err=err:gsub('module:%d+: ','')else assert(err==sentinel);err='sentinel'end
 note(label..':'..result.n..':'..tostring(err))
end
run('nil',nil);run('false',false);run('true',true);run('zero',0);run('nan',0/0);run('inf',math.huge);run('empty','');run('unsupported','unsupported')
run('table',setmetatable({},{__tostring=function()note('tostring');return 'key'end}))
run('table-error',setmetatable({},{__tostring=function()note('tostring-error');error(sentinel,0)end}))
local public=M.apply
for _,kind in ipairs({'setup','nightmare'})do local r=table.pack(M.apply({}, {hand={}}, {effect={kind=kind}}));assert(r.n==0);note(kind..':no-return')end
for _,status in ipairs({'nightmare','phantasmal'})do
 local s={nightmareTemplate={cardId='a'},player={statuses={nightmare=3}}}
 fake.abyss_power_schedule={remove=function(_,_,id)note('remove:'..id)end}
 local e=setmetatable({kind='startPower',value=2},{__index=function(_,k)
  assert(k=='status');M.apply=function(_,same,item)assert(same==s);note('recurse:'..item.effect.kind);return 1,2 end;return status end})
 assert(table.pack(public({},s,{effect=e})).n==0);M.apply=public
end
-- The kind is captured once even if later effect fields change it.
fake.abyss_silent_potions={shivs=function(_,value)note('shivs:'..value);return 'ignored'end}
local n=0;local e=setmetatable({},{__index=function(_,key)n=n+1;if key=='kind'then return n==1 and 'potionShivs'or 'unsupported'end;assert(key=='value');return 5 end})
assert(table.pack(M.apply({}, {}, {effect=e})).n==0);assert(n==2)
for _,v in ipairs(traces)do print(v)end
`;
function run(source){const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);const out=[];lua.lua_pushcfunction(L,L=>{out.push(to_jsstring(lauxlib.luaL_tolstring(L,1)));return 0});lua.lua_setglobal(L,to_luastring('print'));const status=lauxlib.luaL_dostring(L,to_luastring('local SOURCE='+luaString(source)+'\n'+probe));const error=status===0?null:to_jsstring(lua.lua_tostring(L,-1));lua.lua_close(L);assert.equal(status,0,error);return out}
const old=run(before),current=run(after);assert.deepEqual(current,old);console.log(JSON.stringify({status:'PASS',base,observations:current.length,trace:current},null,2));
