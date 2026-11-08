// Independent bounded Fengari process; complete graphs preserve alias identities.
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {luaString} from '../../scripts/build-lua-data.mjs';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=createRequire(import.meta.url)('fengari');
const {source,fixture,output}=JSON.parse(readFileSync(0,'utf8'));
const before=readFileSync('tests/fixtures/defect-final-execute-before.lua','utf8');
const path='src/lua/abyss_defect_final_cards.lua';
// Relocate only exact unchanged error-bearing statement text. Unknown locations
// remain visible; no replacement of error bodies or table errors is permitted.
function comparable(value){
 const match=value.match(/^src\/lua\/abyss_defect_final_cards\.lua:(\d+): (.*)$/s);
 if(!match)return value;
 const line=source.split('\n')[Number(match[1])-1]?.trim();
 const sites=before.split('\n').map((text,i)=>({text:text.trim(),line:i+1})).filter(s=>s.text===line);
 if(sites.length===1)return `${path}:${sites[0].line}: ${match[2]}`;
 return value;
}
const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);const graphs=[],logs=[],labels=[];
installLuaGraphObserver(L,'DEFECT_EXECUTE_GRAPH',(label,graph)=>{labels.push(label);graphs.push(`{"label":${JSON.stringify(label)},"graph":${graph}}`);});
lua.lua_pushcfunction(L,L=>{logs.push(to_jsstring(lauxlib.luaL_tolstring(L,1)));return 0;});lua.lua_setglobal(L,to_luastring('print'));
lua.lua_pushcfunction(L,L=>{lua.lua_pushstring(L,to_luastring(comparable(to_jsstring(lauxlib.luaL_checkstring(L,1)))));return 1;});lua.lua_setglobal(L,to_luastring('DEFECT_EXECUTE_ERROR'));
const prelude=`package.path='tests/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
package.preload.abyss_defect_final_cards=assert(load(${luaString(source)},'@${path}'))
local M=require('abyss_defect_final_cards');local original=M.execute
DEFECT_EXECUTE_UNOBSERVED=original
M.execute=function(combat,s,e,q)
 local result=table.pack(pcall(original,combat,s,e,q));local observed=result
 if not result[1]and type(result[2])=='string'then observed=table.pack(table.unpack(result,1,result.n));observed[2]=DEFECT_EXECUTE_ERROR(result[2])end
 DEFECT_EXECUTE_GRAPH_WRITE({state=s,effect=e,returned=observed},'execute:'..tostring(e.action),true)
 if not result[1]then error(result[2],0)end
 return table.unpack(result,2,result.n)
end
local C=require('abyss_combat');local depth=0
for _,name in ipairs({'play','chooseHand','endTurn'})do
 local fn=C[name];if fn then C[name]=function(s,...)
  local outer=depth==0;depth=depth+1;local returned=table.pack(pcall(fn,s,...));depth=depth-1
  if outer then DEFECT_EXECUTE_GRAPH_WRITE({state=s,returned=returned},name,true)end
  if not returned[1]then error(returned[2],0)end
  return table.unpack(returned,2,returned.n)
 end end
end
dofile(${luaString(fixture)})`;
try{
 const status=lauxlib.luaL_dostring(L,to_luastring(prelude)),error=status===lua.LUA_OK?null:to_jsstring(lua.lua_tostring(L,-1));
 writeFileSync(output,graphs.join('\n')+'\n');
 console.log(JSON.stringify({status,error,logs,checkpoints:graphs.length,labels}));
}finally{lua.lua_close(L);}
