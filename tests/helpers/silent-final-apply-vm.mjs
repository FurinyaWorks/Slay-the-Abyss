// Each invocation owns a fresh Lua VM and serializes the complete reachable graph.
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {luaString} from '../../scripts/build-lua-data.mjs';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=createRequire(import.meta.url)('fengari');
const {source,fixture,output,oldPotionSource}=JSON.parse(readFileSync(0,'utf8'));
const before=readFileSync('tests/fixtures/silent-final-apply-before.lua','utf8').replaceAll('\r\n','\n');
const path='src/lua/abyss_silent_final_cards.lua';
// Only identical error-bearing statements, exact module locations and known bodies
// can be relocated. Table errors and all unknown messages remain unchanged.
const sites=[
 ["local c=actions().fresh(combat,s,e.template.cardId,e.template)","attempt to index a nil value (field 'template')"],
 ["for _=1,e.value do","'for' limit must be a number"],
 ...['nil','string'].map(type=>["local n=(e.energyOnUse or (s.pendingPlay and s.pendingPlay.energyOnUse)or 0)+e.value",`attempt to perform arithmetic on a ${type} value (field 'value')`]),
 ["s.player.statuses.phantasmal=s.player.statuses.phantasmal-1","attempt to perform arithmetic on a nil value (field 'phantasmal')"],
 ...['nil','false','7','NaN','table-kind','function-kind'].map(kind=>["error('unknown Silent final action '..tostring(k))",'unknown Silent final action '+kind]),
 ["assert(e.cardId,'uncaptured Distraction')",'uncaptured Distraction'],
 ["assert(e.potionId,'uncaptured Alchemize')",'uncaptured Alchemize'],
 ["error('unknown Silent final action '..tostring(k))",'unknown Silent final action unsupported'],
 ["assert(require('abyss_discard').begin(s,e.value))",'assertion failed!'],
];
function comparable(value){
 for(const [statement,body] of sites){
  const old=before.split('\n').findIndex(l=>l.includes(statement))+1;
  const current=source.split('\n').findIndex(l=>l.includes(statement))+1;
  if(old&&current&&value===`${path}:${current}: ${body}`)return `${path}:${old}: ${body}`;
 }
 return value;
}
const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);const graphs=[],logs=[];
installLuaGraphObserver(L,'SILENT_GRAPH',(label,graph)=>graphs.push(JSON.stringify({label,graph:JSON.parse(graph)})));
lua.lua_pushcfunction(L,L=>{logs.push(to_jsstring(lauxlib.luaL_tolstring(L,1)));return 0;});lua.lua_setglobal(L,to_luastring('print'));
lua.lua_pushcfunction(L,L=>{lua.lua_pushstring(L,to_luastring(comparable(to_jsstring(lauxlib.luaL_checkstring(L,1)))));return 1;});lua.lua_setglobal(L,to_luastring('SILENT_ERROR'));
const prelude=`package.path='tests/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
${oldPotionSource===null||oldPotionSource===undefined?'':`package.preload.abyss_silent_potions=assert(load(${luaString(oldPotionSource)},'@src/lua/abyss_silent_potions.lua'))`}
package.preload.abyss_silent_final_cards=assert(load(${luaString(source)},'@${path}'))
local M=require('abyss_silent_final_cards');local original=M.apply
M.apply=function(combat,s,item)
 local result=table.pack(pcall(original,combat,s,item));local observed=result
 if not result[1] and type(result[2])=='string'then observed=table.pack(table.unpack(result,1,result.n));observed[2]=SILENT_ERROR(result[2])end
 SILENT_GRAPH_WRITE({state=s,item=item,returned=observed},'apply:'..tostring(item.effect.kind))
 if not result[1]then error(result[2],0)end
 return table.unpack(result,2,result.n)
end
local C=require('abyss_combat');local depth=0
for _,name in ipairs({'play','chooseCard','chooseDiscard','endTurn'})do
 local fn=assert(C[name]);C[name]=function(s,...)
  local outer=depth==0;depth=depth+1;local returned=table.pack(pcall(fn,s,...));depth=depth-1
  if outer then SILENT_GRAPH_WRITE({state=s,returned=returned},name)end
  if not returned[1]then error(returned[2],0)end
  return table.unpack(returned,2,returned.n)
 end
end
dofile(${luaString(fixture)})`;
try{
 const status=lauxlib.luaL_dostring(L,to_luastring(prelude));
 const error=status===lua.LUA_OK?null:to_jsstring(lua.lua_tostring(L,-1));
 writeFileSync(output,graphs.join('\n')+'\n');
 console.log(JSON.stringify({status,error,logs,checkpoints:graphs.length,labels:graphs.map(g=>JSON.parse(g).label)}));
}finally{lua.lua_close(L);}
