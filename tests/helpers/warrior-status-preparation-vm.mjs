import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';
import {luaString} from '../../scripts/build-lua-data.mjs';
const require=createRequire(import.meta.url);
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
export function preparationVm(source,fixture='tests/helpers/warrior-status-preparation-cases.lua') {
 const before=readFileSync('tests/fixtures/warrior-status-before.lua','utf8').split('\n');
 const lines=source.split('\n');
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);const graphs=[],logs=[];
 installLuaGraphObserver(L,'STATUS_GRAPH',(label,graph)=>graphs.push({label,graph}));
 lua.lua_pushcfunction(L,L=>{logs.push(to_jsstring(lauxlib.luaL_tolstring(L,1)));return 0;});
 lua.lua_setglobal(L,to_luastring('print'));
 lua.lua_pushcfunction(L,L=>{
  const error=to_jsstring(lauxlib.luaL_checkstring(L,1));
  const match=/^warrior-status\.lua:(\d+): (.*)$/s.exec(error);
  let canonical=error;
  if(match){
   let statement=lines[Number(match[1])-1]?.trim();
   const movedAppend={
    'else out.cards.cards[#out.cards.cards+1]=replacement end':'else out.cards.cards[#out.cards.cards+1]=d end',
    'else out.statuses.statuses[#out.statuses.statuses+1]=replacement end':'else out.statuses.statuses[#out.statuses.statuses+1]=c end',
   };
   statement=movedAppend[statement]??statement;
   const sites=before.flatMap((line,index)=>line.trim()===statement?[index+1]:[]);
   if(sites.length===1)canonical=`warrior-status.lua:${sites[0]}: ${match[2]}`;
  }
  lua.lua_pushstring(L,to_luastring(canonical));return 1;
 });lua.lua_setglobal(L,to_luastring('STATUS_ERROR'));

 const program=`package.path='tests/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
 package.preload.abyss_warrior_status_cards=assert(load(${luaString(source)},'@warrior-status.lua'))
 ${readFileSync(fixture,'utf8')}`;
 const status=lauxlib.luaL_dostring(L,to_luastring(program));
 const error=status===lua.LUA_OK?null:to_jsstring(lua.lua_tostring(L,-1));lua.lua_close(L);
 return {status,error,graphs,logs};
}
