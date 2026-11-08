import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';
import {luaString,toLua} from '../../scripts/build-lua-data.mjs';
const require=createRequire(import.meta.url);
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
export function beforeSource(){
 const source=readFileSync('tests/fixtures/act3-ai-before.lua','utf8').replaceAll('\r\n','\n');
 assert.equal(createHash('sha256').update(source).digest('hex'),'34511b1e1bfa55fccaa6f77cb8d549f60722a95fecaf324613abe427731a5b19');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex'),'52d75363ee955865ed9bce82f6e02d98339a8700','complete baseline Git blob at d8a57cae');
 return source;
}
export function errorLocations(source){
 const lines=source.split('\n');const index=lines.findIndex(l=>l.includes("assert(policy=='orb_walker'"));assert.ok(index>=0);
 return {[`src/lua/abyss_act3_ai.lua:${index+1}: unsupported Act3 AI`]:'unsupported Act3 AI'};
}
export function aiVm(source,mode='matrix'){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);const graphs=[],rawErrors=[];let instructions=0;
 lua.lua_sethook(L,()=>{instructions+=10000;if(instructions>60000000)lauxlib.luaL_error(L,to_luastring('bounded Act3 AI fixture instruction limit'));},lua.LUA_MASKCOUNT,10000);
 lua.lua_pushcfunction(L,L=>{rawErrors.push(to_jsstring(lauxlib.luaL_checkstring(L,1)));return 0;});lua.lua_setglobal(L,to_luastring('AI_RAW_ERROR'));
 installLuaGraphObserver(L,'AI_GRAPH',(label,graph)=>graphs.push({label,graph:JSON.parse(graph)}));
 const script=`package.path='src/lua/?.lua;'..package.path
 AI_ERROR_LOCATIONS=${toLua(errorLocations(source))}
 AI_MODE=${luaString(mode)}
 AI_LOAD=function()return assert(load(${luaString(source)},'@src/lua/abyss_act3_ai.lua'))()end
 dofile('tests/helpers/act3-ai-responsibilities.lua')`;
 const status=lauxlib.luaL_dostring(L,to_luastring(script));
 const error=status===lua.LUA_OK?null:to_jsstring(lua.lua_tostring(L,-1));lua.lua_close(L);
 return {status,error,graphs,rawErrors};
}
