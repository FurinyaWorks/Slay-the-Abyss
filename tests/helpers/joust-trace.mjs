import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {lua,lauxlib,lualib,to_luastring,to_jsstring} from 'fengari';
import {readFileSync} from 'node:fs';
import {luaString} from '../../scripts/build-lua-data.mjs';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';

// Each source gets a fresh VM. The real RNG is retained; the Run command
// boundary is instrumented to expose dynamic dispatch and partial failures.
function runJoustVm(source){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);const trace=[];
 installLuaGraphObserver(L,'JOUST_GRAPH',(label,graph)=>trace.push({label,graph:JSON.parse(graph)}));
 const prelude=`package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
 package.preload.abyss_joust_event=assert(load(${luaString(source)},'@src/lua/abyss_joust_event.lua'))
 ${readFileSync('tests/helpers/joust-trace.lua','utf8')}`;
 try{
  const status=lauxlib.luaL_dostring(L,to_luastring(prelude));
  if(status!==lua.LUA_OK)throw Error(to_jsstring(lua.lua_tostring(L,-1)));
  return trace;
 }finally{lua.lua_close(L);}
}


export function joustTrace(source){
 const child=spawnSync(process.execPath,[fileURLToPath(import.meta.url)],{
  input:JSON.stringify({source}),encoding:'utf8',timeout:30000,maxBuffer:16*1024**2,
 });
 if(child.error)throw child.error;
 if(child.signal||child.status!==0)throw Error(`Joust VM infrastructure failure: ${child.status}/${child.signal}: ${child.stderr}`);
 const result=JSON.parse(child.stdout);
 if(result.error)throw Error(result.error);
 return result.trace;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {source}=JSON.parse(readFileSync(0,'utf8'));
 try{process.stdout.write(JSON.stringify({trace:runJoustVm(source)}));}
 catch(error){process.stdout.write(JSON.stringify({error:error.message}));}
}
