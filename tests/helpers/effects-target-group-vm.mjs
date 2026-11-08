import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {luaString} from '../../scripts/build-lua-data.mjs';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';
const require=createRequire(import.meta.url),{lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
// Full original/current module executes in a fresh VM, with unchanged real dependencies.
export function observeTargetGroups(source){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);const observations=[];
 installLuaGraphObserver(L,'GROUP_GRAPH',(label,graph)=>observations.push({label,graph:JSON.parse(graph)}));
 const script=`package.path='src/lua/?.lua;build/lua/?.lua;'..package.path\nlocal E=assert(load(${luaString(source)},'@effects.lua'))()\nGROUP_EFFECTS=E\nfor i=1,20 do local name,value=debug.getupvalue(E.supported,i); if name=='targetGroup' then GROUP_TARGET=value;break end end\nassert(GROUP_TARGET,'private targetGroup upvalue')\n`+readFileSync('tests/helpers/effects-target-group-scenarios.lua','utf8');
 try{const status=lauxlib.luaL_dostring(L,to_luastring(script));assert.equal(status,lua.LUA_OK,status===lua.LUA_OK?'':to_jsstring(lua.lua_tostring(L,-1)));return observations;}
 finally{lua.lua_close(L);}
}
