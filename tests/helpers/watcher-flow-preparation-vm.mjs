import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';
import {luaString} from '../../scripts/build-lua-data.mjs';
const require=createRequire(import.meta.url);
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
export function flowPreparationVm(source) {
 const before=readFileSync('tests/fixtures/watcher-flow-preparation-before.lua','utf8').split('\n'),lines=source.split('\n');
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);const graphs=[],logs=[];
 installLuaGraphObserver(L,'FLOW_PREPARATION_GRAPH',(label,graph)=>graphs.push({label,graph}));
 lua.lua_pushcfunction(L,L=>{logs.push(to_jsstring(lauxlib.luaL_tolstring(L,1)));return 0;});lua.lua_setglobal(L,to_luastring('print'));
 lua.lua_pushcfunction(L,L=>{
  const error=to_jsstring(lauxlib.luaL_checkstring(L,1));
  const match=/^watcher-flow\.lua:(\d+): (.*)$/s.exec(error);let canonical=error;
  if(match){
   const statement=lines[Number(match[1])-1]?.trim();
   const sites=before.flatMap((line,index)=>line.trim()===statement?[index+1]:[]);
   if(sites.length===1)canonical=`watcher-flow.lua:${sites[0]}: ${match[2]}`;
  }
  lua.lua_pushstring(L,to_luastring(canonical));return 1;
 });lua.lua_setglobal(L,to_luastring('FLOW_PREPARATION_ERROR'));
 try{
  const program=`package.path='tests/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
package.preload.abyss_watcher_flow_cards=assert(load(${luaString(source)},'@watcher-flow.lua'))
${readFileSync('tests/helpers/watcher-flow-preparation-cases.lua','utf8')}`;
  const status=lauxlib.luaL_dostring(L,to_luastring(program));
  return {status,error:status===lua.LUA_OK?null:to_jsstring(lua.lua_tostring(L,-1)),graphs,logs};
 }finally{lua.lua_close(L);}
}
