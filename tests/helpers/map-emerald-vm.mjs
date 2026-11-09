import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';
import {luaString} from '../../scripts/build-lua-data.mjs';
const require=createRequire(import.meta.url);
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
export function mapEmeraldBefore(){
 const source=readFileSync('tests/fixtures/map-emerald-before.lua','utf8').replaceAll('\r\n','\n');
 assert.equal(createHash('sha256').update(source).digest('hex'),'52d311bc4a863303906dfa3a29d65bc11606eda30759a560ed80266381900810');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex'),'5375d7e16059fc1967efa1826c2ffe9ac9f37ccc','complete src/lua/abyss_map.lua Git blob at develop 1eb288472d7b33b7450eec97a624ca2ffa526f39');
 return source;
}
export function mapEmeraldVm(source,{integration=true}={}){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);const graphs=[];let instructions=0;
 lua.lua_sethook(L,()=>{instructions+=10000;if(instructions>100000000)lauxlib.luaL_error(L,to_luastring('bounded emerald fixture instruction limit'));},lua.LUA_MASKCOUNT,10000);
 installLuaGraphObserver(L,'OWNER_GRAPH',(label,graph)=>graphs.push({label,graph:JSON.parse(graph)}));
 const script=`package.path='src/lua/?.lua;'..package.path
 OWNER_INTEGRATION=${integration?'true':'false'}
 OWNER_MAP=assert(load(${luaString(source)},'@src/lua/abyss_map.lua'))()
 dofile('tests/helpers/map-emerald-cases.lua')`;
 const status=lauxlib.luaL_dostring(L,to_luastring(script));
 const error=status===lua.LUA_OK?null:to_jsstring(lua.lua_tostring(L,-1));lua.lua_close(L);
 assert.equal(status,lua.LUA_OK,error);
 assert.ok(graphs.length>200,'owner matrix must run in every independent VM');
 return graphs;
}
