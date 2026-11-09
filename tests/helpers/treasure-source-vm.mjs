import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {luaString} from '../../scripts/build-lua-data.mjs';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=createRequire(import.meta.url)('fengari');
const {source,fixture,output}=JSON.parse(readFileSync(0,'utf8'));
const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);const graphs=[],logs=[],labels=[];
installLuaGraphObserver(L,'TREASURE_GRAPH',(label,graph)=>{labels.push(label);graphs.push(JSON.stringify({label,graph:JSON.parse(graph)}));});
lua.lua_pushcfunction(L,L=>{logs.push(to_jsstring(lauxlib.luaL_tolstring(L,1)));return 0;});lua.lua_setglobal(L,to_luastring('print'));
const prelude=`package.path='tests/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
package.preload.abyss_treasure_source=assert(load(${luaString(source)},'@src/lua/abyss_treasure_source.lua'))
local M=require('abyss_treasure_source');local original=M.pair
M.pair=function(reward)
 TREASURE_GRAPH_WRITE({reward=reward},'before',true)
 local result=table.pack(pcall(original,reward))
 TREASURE_GRAPH_WRITE({reward=reward,returned=result},'after',true)
 if not result[1]then error(result[2],0)end
 return table.unpack(result,2,result.n)
end
dofile(${luaString(fixture)})`;
try{
 const status=lauxlib.luaL_dostring(L,to_luastring(prelude)),error=status===lua.LUA_OK?null:to_jsstring(lua.lua_tostring(L,-1));
 writeFileSync(output,graphs.join('\n')+'\n');console.log(JSON.stringify({status,error,logs,checkpoints:graphs.length,labels}));
}finally{lua.lua_close(L);}
