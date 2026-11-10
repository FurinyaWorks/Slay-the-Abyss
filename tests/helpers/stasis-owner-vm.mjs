import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {luaString} from '../../scripts/build-lua-data.mjs';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=createRequire(import.meta.url)('fengari');
export const metadata=JSON.parse(readFileSync('tests/helpers/stasis-owner-before.json','utf8'));
const digest=b=>createHash('sha256').update(b).digest('hex');
export function sources(old=false){return Object.fromEntries(Object.entries(metadata.files).map(([path,entry])=>{
 const bytes=readFileSync(old?entry.frozen:path);if(old)assert.equal(digest(bytes),entry.sha256,'complete old source '+path);
 return [path,bytes.toString('utf8')];
}));}
export function runStasis(bundle,fixture='tests/helpers/stasis-owner-edges.lua'){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);const graphs=[],logs=[];
 installLuaGraphObserver(L,'STASIS_GRAPH',(label,graph)=>graphs.push({label,graph:JSON.parse(graph)}));
 lua.lua_pushcfunction(L,L=>{logs.push(to_jsstring(lauxlib.luaL_tolstring(L,1)));return 0;});lua.lua_setglobal(L,to_luastring('print'));
 const observeFixture=fixture==='tests/lua/death_power_order.lua'?`
local combat=require('abyss_combat');local play=combat.play
combat.play=function(...)
 local args=table.pack(...);STASIS_GRAPH_WRITE(args,'play:before',true)
 local result=table.pack(pcall(play,...));STASIS_GRAPH_WRITE({args=args,returned=result},'play:after',true)
 if not result[1]then error(result[2],0)end
 return table.unpack(result,2,result.n)
end
`:'';
 const preload=Object.entries(bundle).map(([path,text])=>`package.preload[${luaString(path.slice(8,-4))}]=assert(load(${luaString(text)},'@${path}'))`).join('\n');
 try{
 const status=lauxlib.luaL_dostring(L,to_luastring(`package.path='tests/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path\n${preload}\n${observeFixture}\ndofile(${luaString(fixture)})`));
 return {status,error:status===lua.LUA_OK?null:to_jsstring(lua.lua_tostring(L,-1)),graphs,logs};
 }finally{lua.lua_close(L);}
}
