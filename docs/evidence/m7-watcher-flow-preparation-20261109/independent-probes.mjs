import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {installLuaGraphObserver} from '../../../tests/helpers/lua-graph-observer.mjs';
const require=createRequire(import.meta.url),{lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
const probe=String.raw`
local function empty()return {cards={cards={}},statuses={statuses={}}}end
local function run(label,d)
 local before=OBS(d)
 local budget=0
 debug.sethook(function()budget=budget+1;if budget>100 then error('bounded cycle')end end,'',1000)
 local ok,out=pcall(T.withCards,d)
 debug.sethook()
 if not ok then out=tostring(out):gsub('^[^:]+:%d+: ','') end
 assert(OBS(d)==before,'input changed '..label)
 OBS_WRITE({ok=ok,out=out,input=d},label)
end
local d=empty();local key={id='key'};d[key]={a=key};d.reference=key;run('table key alias',d)
d=empty();local fn=function()end;d.fn=fn;d.cards.cards={{id=false,fn=fn}};run('false ID and function reuse',d)
d=empty();local shared={};d.cards=shared;d.statuses=shared;shared.cards={};shared.statuses=shared.cards;run('shared containers',d)
d=empty();d.cards.cards={{id={}}};d.statuses.statuses={{id={}}};run('table identifiers',d)
d=empty();d.cycle=d;run('cycle fails bounded',d)
for _,slot in ipairs({'cards','statuses'})do
 for _,id in ipairs({'battle_hymn','vigor','through_violence','arbitrary'})do
  for _,idx in ipairs({0,-1,2,3,10,'x'})do
   local t=empty();t[slot][slot][idx]={id=id};run(slot..id..tostring(idx),t)
  end
 end
end
for _,slot in ipairs({'cards','statuses'})do
 for _,v in ipairs({false,3,'x',true})do
  local t=empty();t[slot]=v;run('container '..slot..tostring(v),t)
 end
end
local t=empty();t.cards.cards={{id=0/0}};run('NaN ID',t)
local t=empty();t.cards.cards={{id=false},{id=false}};run('duplicate false ID',t)
local t=empty();t.statuses.statuses={{id=false},{id=false}};run('duplicate false power',t)
`;
function execute(source){const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);const outputs=[];installLuaGraphObserver(L,'OBS',(label,graph)=>outputs.push({label,graph}));const program=`package.path='tests/lua/?.lua;src/lua/?.lua;'..package.path\nlocal T=assert(load(${JSON.stringify(source)},'@flow.lua'))()\n${probe}`;const rc=lauxlib.luaL_dostring(L,to_luastring(program));assert.equal(rc,lua.LUA_OK,rc?to_jsstring(lua.lua_tostring(L,-1)):undefined);lua.lua_close(L);return outputs;}
const before=execute(readFileSync('tests/fixtures/watcher-flow-preparation-before.lua','utf8')),after=execute(readFileSync('src/lua/abyss_watcher_flow_cards.lua','utf8'));assert.deepEqual(after,before);console.log(`PASS ${after.length} independent graph probes`);
