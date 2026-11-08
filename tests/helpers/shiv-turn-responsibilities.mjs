import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';
import {luaString,toLua} from '../../scripts/build-lua-data.mjs';
const require=createRequire(import.meta.url);
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
export function beforeSource(){
 const source=readFileSync('tests/fixtures/shiv-turn-before.lua','utf8').replaceAll('\r\n','\n');
 assert.equal(createHash('sha256').update(source).digest('hex'),'f96896a0280691c2ed5cb04f516d1bf9a92854be817dea922b9858d52a91a57e');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex'),'4cca114a88aae9a55cebe9019f7b075adcd8f304','complete baseline Git blob at d8a57cae2a867200ca8e588abc0d368e6cdb3799');
 return source;
}
// Exact allowlist: source coordinates alone may move, but no arbitrary Lua
// engine error or unexpected diagnostic is treated as equivalent.
export function errorLocations(source){
 const diagnostics=['invalid Infinite Blades amount','unsupported Accuracy amount','missing shared Shiv generator','generator returned wrong Shiv count','generator returned malformed UIDs','invalid generated Shiv'];
 return Object.fromEntries(diagnostics.map(message=>{
  const matches=source.split('\n').flatMap((line,i)=>line.includes(`"${message}"`)?[i+1]:[]);
  assert.equal(matches.length,1,`unique assertion location: ${message}`);
  const lines=source.split('\n');let line=matches[0];
  while(line>0&&!lines[line-1].includes('assert('))line--;
  assert.ok(line>0&&matches[0]-line<=1,`known assertion start: ${message}`);
  return [`src/lua/abyss_shivs.lua:${line}: ${message}`,`src/lua/abyss_shivs.lua:<line>: ${message}`];
 }));
}
export function turnVm(source,mode='direct'){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);const graphs=[],rawErrors=[];let instructions=0;
 lua.lua_sethook(L,()=>{instructions+=10000;if(instructions>20000000)lauxlib.luaL_error(L,to_luastring('bounded Shiv fixture instruction limit'));},lua.LUA_MASKCOUNT,10000);
 lua.lua_pushcfunction(L,L=>{rawErrors.push(to_jsstring(lauxlib.luaL_checkstring(L,1)));return 0;});lua.lua_setglobal(L,to_luastring('SHIV_RAW_ERROR'));
 installLuaGraphObserver(L,'SHIV_GRAPH',(label,graph)=>graphs.push({label,graph:JSON.parse(graph)}));
 const script=`package.path='src/lua/?.lua;build/shiv-turn-evidence/?.lua;build/lua/?.lua;'..package.path
 package.preload.abyss_shivs=assert(load(${luaString(source)},'@src/lua/abyss_shivs.lua'))
 SHIV_MODE=${luaString(mode)}
 SHIV_ERROR_LOCATIONS=${toLua(errorLocations(source))}
 dofile('tests/helpers/shiv-turn-responsibilities.lua')`;
 const status=lauxlib.luaL_dostring(L,to_luastring(script));
 const error=status===lua.LUA_OK?null:to_jsstring(lua.lua_tostring(L,-1));lua.lua_close(L);
 return {status,error,graphs,rawErrors};
}
