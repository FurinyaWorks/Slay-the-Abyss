import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {luaString} from '../../scripts/build-lua-data.mjs';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=createRequire(import.meta.url)('fengari');
const {sources,beforeSources,fixture,output,gameplay=false}=JSON.parse(readFileSync(0,'utf8'));
const graphs=[],logs=[],rawErrors=[];
function comparable(error){
 const match=error.match(/^(src\/lua\/abyss_silent_potions\.lua):(\d+): (.*)$/s);
 if(!match)return error;
 const source=sources[match[1]],before=beforeSources[match[1]];
 const line=source.split('\n')[Number(match[2])-1]?.trim();
 const body=match[3];
 if(!((line==="for _=1,n do"&&body==="'for' limit must be a number")||
  (line?.includes("assert(host.canUpgrade(state,card),'missing upgraded Shiv')")&&body==='missing upgraded Shiv')))return error;
 const oldLines=before.split('\n');
 const oldLine=oldLines.findIndex(l=>body==='missing upgraded Shiv'?l.includes("assert(C.canUpgrade(state,card),'missing upgraded Shiv')"):l.trim()===line)+1;
 return oldLine?`${match[1]}:${oldLine}: ${body}`:error;
}
const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
installLuaGraphObserver(L,'OWNER_GRAPH',(label,graph)=>graphs.push(JSON.stringify({label,graph:JSON.parse(graph)})));
lua.lua_pushcfunction(L,L=>{logs.push(to_jsstring(lauxlib.luaL_tolstring(L,1)));return 0;});lua.lua_setglobal(L,to_luastring('print'));
lua.lua_pushcfunction(L,L=>{const raw=to_jsstring(lauxlib.luaL_checkstring(L,1));rawErrors.push(raw);lua.lua_pushstring(L,to_luastring(comparable(raw)));return 1;});lua.lua_setglobal(L,to_luastring('OWNER_ERROR'));
let body="package.path='tests/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path\n";
for(const [path,source]of Object.entries(sources))body+=`package.preload[${luaString(path.slice(8,-4))}]=assert(load(${luaString(source)},${luaString('@'+path)}))\n`;
if(gameplay)body+=`
local Run=require('abyss_run')
for _,name in ipairs({'usePotion','play'})do
 local original=Run[name]
 Run[name]=function(state,...)
  OWNER_GRAPH_WRITE({state=state},name..':before',true)
  local result=table.pack(pcall(original,state,...))
  OWNER_GRAPH_WRITE({state=state,result=result},name..':after',true)
  if not result[1]then error(result[2],0)end
  return table.unpack(result,2,result.n)
 end
end
`;
body+=`dofile(${luaString(fixture)})`;
try{
 const status=lauxlib.luaL_dostring(L,to_luastring(body));
 const error=status===lua.LUA_OK?null:to_jsstring(lua.lua_tostring(L,-1));
 const graph=graphs.join('\n')+'\n';writeFileSync(output,graph);
 console.log(JSON.stringify({status,error,logs,rawErrors,checkpoints:graphs.length,sha256:createHash('sha256').update(graph).digest('hex')}));
}finally{lua.lua_close(L);}
