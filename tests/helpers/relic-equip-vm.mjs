import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {luaString,toLua} from '../../scripts/build-lua-data.mjs';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';
const require=createRequire(import.meta.url);
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
export function equipVm(source,group='ordinary'){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);const graphs=[],rawErrors=[];let instructions=0;
 lua.lua_sethook(L,()=>{instructions+=10000;if(instructions>30000000)lauxlib.luaL_error(L,to_luastring('relic equip instruction bound'));},lua.LUA_MASKCOUNT,10000);
 installLuaGraphObserver(L,'EQUIP_GRAPH',(label,graph)=>graphs.push({label,graph}));
 lua.lua_pushcfunction(L,L=>{rawErrors.push(to_jsstring(lauxlib.luaL_checkstring(L,1)));return 0;});lua.lua_setglobal(L,to_luastring('EQUIP_ERROR'));
 const errors={};for(const message of ['missing unknown-room state','invalid potion capacity']){
  const lines=source.split('\n').flatMap((line,i)=>line.includes(`'${message}'`)?[i+1]:[]);
  if(lines.length!==1)throw Error(`missing exact assertion ${message}`);
  errors[`src/lua/abyss_relic_hooks.lua:${lines[0]}: ${message}`]=`src/lua/abyss_relic_hooks.lua:<assertion>: ${message}`;
 }
 const script=`package.path='src/lua/?.lua;build/relic-equip-evidence/?.lua;'..package.path
 package.preload.abyss_relic_hooks=assert(load(${luaString(source)},'@src/lua/abyss_relic_hooks.lua'))
 EQUIP_GROUP=${luaString(group)};EQUIP_ERRORS=${toLua(errors)}
 `+readFileSync('tests/helpers/relic-equip-cases.lua','utf8');
 const status=lauxlib.luaL_dostring(L,to_luastring(script));
 const error=status===lua.LUA_OK?null:to_jsstring(lua.lua_tostring(L,-1));lua.lua_close(L);
 return {status,error,graphs,rawErrors};
}
