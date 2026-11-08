import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';
import {luaString} from '../../scripts/build-lua-data.mjs';
const require=createRequire(import.meta.url);
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
export const beforeSha256='786a5b20a63abaf08f1251402238e410fedf4aefab47abd75a38ab9fc3f1d4a5';
export function beforeSource(){
 const source=readFileSync('tests/fixtures/scry-choice-before.lua','utf8').replaceAll('\r\n','\n');
 assert.equal(createHash('sha256').update(source).digest('hex'),beforeSha256);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex'),'66bf806903b46272656a1f77d5f63ab03db106ee','complete baseline Git blob at d8a57cae2a867200ca8e588abc0d368e6cdb3799');
 return source;
}
export function choiceVm(source,mode='direct'){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 const graphs=[];let instructions=0;
 lua.lua_sethook(L,()=>{instructions+=10000;if(instructions>20000000)lauxlib.luaL_error(L,to_luastring('bounded choice fixture instruction limit'));},lua.LUA_MASKCOUNT,10000);
 installLuaGraphObserver(L,'CHOICE_GRAPH',(label,graph)=>graphs.push({label,graph:JSON.parse(graph)}));
 const script=`package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
 package.preload.abyss_scry=assert(load(${luaString(source)},'@src/lua/abyss_scry.lua'))
 CHOICE_MODE=${luaString(mode)}
 CHOICE_MISSING_ERROR=${luaString('src/lua/abyss_scry.lua:'+(source.split('\n').findIndex(line=>line.includes('assert(type(state.events)=="table","missing scry events")'))+1)+': missing scry events')}
 dofile('tests/helpers/scry-choice-responsibilities.lua')`;
 const status=lauxlib.luaL_dostring(L,to_luastring(script));
 const error=status===lua.LUA_OK?null:to_jsstring(lua.lua_tostring(L,-1));
 lua.lua_close(L);return {status,error,graphs};
}
