import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
const old=execFileSync('git',['show','1eb288472d7b33b7450eec97a624ca2ffa526f39:src/lua/abyss_map.lua'],{encoding:'utf8'});
const current=readFileSync('src/lua/abyss_map.lua','utf8');
const probe=`
local Acts=require('abyss_acts')
local calls,log=0,{}
local function emit(s) log[#log+1]=s end
local function make()
 local n={id='a',type='elite',hasEmeraldKey=true,lane=1,floor=1}
 return {seed='42',runSeed='42',mapSeed=Acts.mapSeed('42',1),sourceSignature='s',nodes={n},emeraldSelection={version=1,act=1,x=0,y=0,nodeId='a'}},n
end
local function check(m,id,expected,arity)
 local p=table.pack(pcall(M.__probe,m,id));calls=calls+1
 assert(p[1] and p.n==arity+1 and p[2]==expected,'probe arity/identity case='..calls..' got='..p.n..' expected='..(arity+1)..' actual='..tostring(p[2])..' expectedvalue='..tostring(expected))
 emit(tostring(p.n)..':'..type(p[2]))
end
check(nil,'a',nil,0)
local m,n=make();check(m,'a',n,1)
m,n=make();m.nodes={};check(m,'a',nil,1)
m,n=make();n.type='combat';check(m,'a',nil,0)
m,n=make();m.nodes[2]=n;check(m,'a',nil,0)
-- Valid node proxy mutates unrelated state and preserves repeated field access.
m,n=make();local backing=n;m.nodes[1]=setmetatable({},{__index=function(_,k)emit(k);m.touches=(m.touches or 0)+1;return backing[k]end})
check(m,'a',m.nodes[1],1);emit(tostring(m.touches))
-- Non-string error identity is retained without stringifying/normalizing.
m,n=make();local sentinel={};m.nodes[1]=setmetatable({},{__index=function()error(sentinel)end})
local p=table.pack(pcall(M.__probe,m,'a'));assert(p.n==2 and p[1]==false and p[2]==sentinel);calls=calls+1
-- Seed dependency may return multiple values, false/nil, or throw a table.
local original=Acts.mapSeed
for _,mode in ipairs({'nil','false','multi','throw'}) do
 m,n=make();local count=0
 Acts.mapSeed=function(...)count=count+1;if mode=='throw' then error(sentinel)end;if mode=='nil' then return nil,'extra' end;if mode=='false' then return false,'extra' end;return original(...),'extra' end
 if mode=='nil' then m.mapSeed=nil elseif mode=='false' then m.mapSeed=false end
 if mode=='throw' then check(m,'a',nil,0) else check(m,'a',n,1) end
 assert(count==1);Acts.mapSeed=original
end
return table.concat(log,'|')..' cases='..calls
`;
function run(src){const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);try{src=src.replace(/return M\s*$/,'M.__probe=emeraldNode; return M');const code=`package.path='src/lua/?.lua;'..package.path\nlocal M=assert(load(${JSON.stringify(src)}))()\n${probe}`;const status=lauxlib.luaL_dostring(L,to_luastring(code));assert.equal(status,lua.LUA_OK,to_jsstring(lua.lua_tostring(L,-1)));return to_jsstring(lua.lua_tostring(L,-1));}finally{lua.lua_close(L);}}
assert.equal(run(current),run(old));console.log('PASS independent original-Git/current direct-owner return arity, identity, metatable reads and dependency fault probe');console.log(run(current));
