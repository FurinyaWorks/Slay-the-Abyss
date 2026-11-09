import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {v25CardBindingSource} from '../scripts/v25-card-binding.mjs';
import {compileRgbaRectangles} from '../scripts/v25-private-card-assets.mjs';
const require=createRequire(import.meta.url),{lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
const portrait=readFileSync('src/lua/abyss_traveler_portraits.lua','utf8');
const runtime=readFileSync('src/lua/abyss_v25_texture_runtime.lua','utf8');
const suite=readFileSync('tests/lua/v25_texture_runtime.lua','utf8');
const names=[...suite.matchAll(/^test\('([^']+)'/gm)].map(m=>m[1]);
const packed=compileRgbaRectangles({width:3,height:2,rgba:Uint8Array.from([255,0,0,255,0,255,0,128,10,20,30,0,255,0,0,255,0,0,255,64,0,0,255,64])});
const texture={width:packed.width,height:packed.height,blocks:packed.blocks,count:packed.count,drawCount:packed.drawCount,display:{position:[.5,2],size:[3,2]}};
const binding=v25CardBindingSource({binding:{variants:{attack:{common:'shell'}},manaTemplateId:'mana'},textureData:{shell:texture,mana:texture},sourceManifestSha256:'a'.repeat(64)},
 {shell:101,mana:102},{imageTemplateId:41,groupTemplateId:73});
for(const[name,index]of names.map((name,index)=>[name,index+1]))test(name,()=>{
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 try{
  const source=`CASE=${index}\nGENERATED_BINDING=(function()\n${binding}\nend)()\npackage.preload['abyss_traveler_portraits']=function()\n${portrait}\nend\npackage.preload['abyss_v25_texture_runtime']=function()\n${runtime}\nend\n${suite}`;
  const status=lauxlib.luaL_dostring(L,to_luastring(source));assert.equal(status,lua.LUA_OK,status===lua.LUA_OK?'':to_jsstring(lua.lua_tostring(L,-1)));
 }finally{lua.lua_close(L);}
});
