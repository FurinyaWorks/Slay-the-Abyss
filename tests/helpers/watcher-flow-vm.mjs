// Fresh bounded process/VM and the repository's complete graph observer.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {luaString} from '../../scripts/build-lua-data.mjs';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';
const require=createRequire(import.meta.url);
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
const {source}=JSON.parse(readFileSync(0,'utf8'));
const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
const graphs=[],logs=[];let bytes=0;
installLuaGraphObserver(L,'FLOW_GRAPH',(label,graph)=>{
 bytes+=Buffer.byteLength(graph);assert(bytes<=8*1024*1024,'complete Flow graph output budget');
 graphs.push({label,graph:JSON.parse(graph)});
});
lua.lua_pushcfunction(L,L=>{logs.push(to_jsstring(lauxlib.luaL_tolstring(L,1)));return 0;});lua.lua_setglobal(L,to_luastring('print'));
try{
 const script=`package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
 package.preload.abyss_watcher_flow_cards=assert(load(${luaString(source)},'flow-planning-source'))
 dofile('tests/lua/watcher_flow_planning.lua')`;
 const status=lauxlib.luaL_dostring(L,to_luastring(script));
 const error=status===lua.LUA_OK?null:to_jsstring(lua.lua_tostring(L,-1));
 console.log(JSON.stringify({status,error,graphs,bytes,logs}));
}finally{lua.lua_close(L);}
