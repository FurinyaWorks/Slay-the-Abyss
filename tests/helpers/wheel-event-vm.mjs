// Each invocation owns an independent VM and observes complete value/alias graphs.
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {luaString} from '../../scripts/build-lua-data.mjs';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';
const require=createRequire(import.meta.url);
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
const {source,fixture,output}=JSON.parse(readFileSync(0,'utf8'));
const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
const records=[],logs=[];
const originalLines=readFileSync('tests/fixtures/wheel-event-before.lua','utf8').split('\n');
const sourceLines=source.split('\n');
// Normalize only a verified relocated original statement, not arbitrary errors.
lua.lua_pushcfunction(L,L=>{
 const message=to_jsstring(lauxlib.luaL_checkstring(L,1));
 const normalized=message.replace(/src\/lua\/abyss_wheel_event\.lua:(\d+):/g,(_,line)=>{
  const statement=sourceLines[Number(line)-1]?.trim();
  const matches=originalLines.flatMap((text,i)=>text.trim()===statement?[i+1]:[]);
  if(matches.length!==1)throw Error(`Unmapped wheel error statement: ${statement}`);
  return `src/lua/abyss_wheel_event.lua:${matches[0]}:`;
 });
 lua.lua_pushstring(L,to_luastring(normalized));return 1;
});lua.lua_setglobal(L,to_luastring('WHEEL_ERROR_LOCATION'));
installLuaGraphObserver(L,'WHEEL_GRAPH',(label,graph)=>records.push(JSON.stringify({label,graph})));
lua.lua_pushcfunction(L,L=>{logs.push(to_jsstring(lauxlib.luaL_tolstring(L,1)));return 0;});lua.lua_setglobal(L,to_luastring('print'));
const prelude=`package.path='tests/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
package.preload.abyss_wheel_event=assert(load(${luaString(source)},'@src/lua/abyss_wheel_event.lua'))
local W=require('abyss_wheel_event');local N=require('abyss_nodes')
local function observe(owner,key,label)
 local original=owner[key]
 owner[key]=function(run,...)
  local old={flow=run.nodeFlow,deck=run.deck,relics=run.relics,relicPool=run.relicPool,miscRng=run.miscRng}
  local returned=table.pack(pcall(original,run,...))
  local observed=table.pack(table.unpack(returned,1,returned.n))
  if not observed[1] and type(observed[2])=='string' then
   observed[2]=WHEEL_ERROR_LOCATION(observed[2])
  end
  WHEEL_GRAPH_WRITE({run=run,old=old,args=table.pack(...),returned=observed},label)
  if not returned[1]then error(returned[2],0)end
  return table.unpack(returned,2,returned.n)
 end
end
observe(W,'choose','direct');observe(N,'chooseEvent','transaction')
dofile(${luaString(fixture)})`;
try{
 const status=lauxlib.luaL_dostring(L,to_luastring(prelude));
 const error=status===lua.LUA_OK?null:to_jsstring(lua.lua_tostring(L,-1));
 writeFileSync(output,records.join('\n')+'\n');
 console.log(JSON.stringify({status,error,checkpoints:records.length,logs}));
}finally{lua.lua_close(L);}
