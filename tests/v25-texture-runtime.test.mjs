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
