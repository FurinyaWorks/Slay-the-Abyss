import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {v25TextureBindingPrelude} from './helpers/v25-texture-binding-fixture.mjs';
const require=createRequire(import.meta.url),{lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
const portrait=readFileSync('src/lua/abyss_traveler_portraits.lua','utf8');
const runtime=readFileSync('src/lua/abyss_v25_texture_runtime.lua','utf8');
const suite=readFileSync('tests/lua/v25_texture_runtime.lua','utf8');
const names=[...suite.matchAll(/^test\('([^']+)'/gm)].map(m=>m[1]);
const bindingPrelude=v25TextureBindingPrelude('tests/lua/v25_texture_runtime.lua');
test('legacy raw portrait callers omit idle while approved drawing requires its real module',()=>{
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 try{
  const source=`
local idleLoads=0
require=function(name)
 assert(name=='abyss_lumine_idle','unexpected dependency '..name)
 idleLoads=idleLoads+1;error('approved idle module unavailable')
end
local Portraits=(function()\n${portrait}\nend)()
assert(idleLoads==0,'loading the portrait owner eagerly loaded idle')
local legacy=Portraits.createController({}, {renderProfile='compact-v1',rows={}},133,{})
assert(legacy:status().phase=='idle' and idleLoads==0,'legacy controller loaded an unused idle module')
local ok,err=pcall(function()Portraits.createController({}, {renderProfile='approved-idle-v1'},210,{})end)
assert(not ok and tostring(err):find('approved idle module unavailable',1,true) and idleLoads==1,'approved drawing silently fell back when its real module was absent')
`;
  const status=lauxlib.luaL_dostring(L,to_luastring(source));assert.equal(status,lua.LUA_OK,status===lua.LUA_OK?'':to_jsstring(lua.lua_tostring(L,-1)));
 }finally{lua.lua_close(L);}
});
for(const[name,index]of names.map((name,index)=>[name,index+1]))test(name,()=>{
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 try{
  if(name==='real JavaScript binding serialization reaches the default production controller'){
   for(const path of ['tests/lua/other.lua','other/v25_texture_runtime.lua','tests/lua/v25_texture_runtime.lua.extra'])assert.equal(v25TextureBindingPrelude(path),'');
   assert.equal(v25TextureBindingPrelude('tests/lua/v25_texture_runtime.lua',{cwd:process.cwd()+'/unrelated-workspace'}),'');
  }
  const source=`CASE=${index}\n${bindingPrelude}package.preload['abyss_traveler_portraits']=function()\n${portrait}\nend\npackage.preload['abyss_v25_texture_runtime']=function()\n${runtime}\nend\n${suite}`;
  const status=lauxlib.luaL_dostring(L,to_luastring(source));assert.equal(status,lua.LUA_OK,status===lua.LUA_OK?'':to_jsstring(lua.lua_tostring(L,-1)));
 }finally{lua.lua_close(L);}
});
