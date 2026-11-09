import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {luaString} from '../../scripts/build-lua-data.mjs';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=createRequire(import.meta.url)('fengari');
const {source,fixture,output}=JSON.parse(readFileSync(0,'utf8'));
const path='src/lua/abyss_golden_idol_event.lua';
const before=readFileSync('tests/fixtures/golden-idol-before.lua','utf8').replaceAll('\r\n','\n');
function comparable(value){
 const match=value.match(/^src\/lua\/abyss_golden_idol_event\.lua:(\d+): (.*)$/s);
 if(!match)return value;
 const line=source.split('\n')[Number(match[1])-1]?.trim();
 const sites=before.split('\n').map((text,i)=>({text:text.trim(),line:i+1})).filter(s=>s.text===line);
 return sites.length===1?`${path}:${sites[0].line}: ${match[2]}`:value;
}
const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);const graphs=[],logs=[],labels=[];
installLuaGraphObserver(L,'GOLDEN_GRAPH',(label,graph)=>{labels.push(label);graphs.push(JSON.stringify({label,graph:JSON.parse(graph)}));});
lua.lua_pushcfunction(L,L=>{logs.push(to_jsstring(lauxlib.luaL_tolstring(L,1)));return 0;});lua.lua_setglobal(L,to_luastring('print'));
lua.lua_pushcfunction(L,L=>{lua.lua_pushstring(L,to_luastring(comparable(to_jsstring(lauxlib.luaL_checkstring(L,1)))));return 1;});lua.lua_setglobal(L,to_luastring('GOLDEN_ERROR'));
const direct=fixture==='tests/helpers/golden-idol-cases.lua';
const prelude=`package.path='tests/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
${direct?"package.loaded.abyss_run={}":''}
package.preload.abyss_golden_idol_event=assert(load(${luaString(source)},'@${path}'))
dofile(${luaString(fixture)})`;

try{
 const status=lauxlib.luaL_dostring(L,to_luastring(prelude)),error=status===lua.LUA_OK?null:to_jsstring(lua.lua_tostring(L,-1));
 writeFileSync(output,graphs.join('\n')+'\n');console.log(JSON.stringify({status,error,logs,checkpoints:graphs.length,labels}));
}finally{lua.lua_close(L);}
