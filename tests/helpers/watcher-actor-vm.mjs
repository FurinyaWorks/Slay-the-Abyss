import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';
import {luaString} from '../../scripts/build-lua-data.mjs';
const require=createRequire(import.meta.url);
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
export function baselineSources(){return JSON.parse(gunzipSync(readFileSync('tests/fixtures/watcher-actor-before.json.gz')));}
export function watcherVm({before=false,fixture,body='',replace={}}={}){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 const graphs=[];let instructions=0;
 lua.lua_sethook(L,()=>{instructions+=10000;if(instructions>150000000)lauxlib.luaL_error(L,to_luastring('Watcher fixture instruction limit'));},lua.LUA_MASKCOUNT,10000);
 installLuaGraphObserver(L,'WATCHER_GRAPH',(label,graph)=>graphs.push({label,bytes:Buffer.byteLength(graph),sha256:createHash('sha256').update(graph).digest('hex')}));
 let script="package.path='src/lua/?.lua;build/lua/?.lua;'..package.path\n";
 const sources={...(before?baselineSources():{}),...replace};
 for(const [file,source]of Object.entries(sources))if(file.endsWith('.lua')){
  const module=file.split('/').at(-1).slice(0,-4);
  script+=`package.preload[${luaString(module)}]=assert(load(${luaString(source)},${luaString('@'+file)}))\n`;
 }
 if(fixture)script+=`
 local Combat=require('abyss_combat')
 for _,name in ipairs({'new','play','endTurn','autoplayTop'})do
  local original=Combat[name]
  Combat[name]=function(...)
   local args=table.pack(...)
   local returned=table.pack(original(...))
   local owner=name=='new'and returned[1]or args[1]
   if type(owner)=='table'then WATCHER_GRAPH_WRITE({owner=owner,returned=returned},name,true)end
   return table.unpack(returned,1,returned.n)
  end
 end
 dofile(${luaString(fixture)})
 `;
 script+=body;
 const status=lauxlib.luaL_dostring(L,to_luastring(script));
 const error=status===lua.LUA_OK?null:to_jsstring(lua.lua_tostring(L,-1));
 lua.lua_close(L);return {status,error,graphs};
}
