import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const {installLuaGraphObserver}=await import(pathToFileURL(resolve('tests/helpers/lua-graph-observer.mjs')));
const {luaString}=await import(pathToFileURL(resolve('scripts/build-lua-data.mjs')));
const require=createRequire(import.meta.url),{lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
const base='a0c35db8d3c7242437f4dff0df373749b0d84985',rejectedHead='e7a5020a9acc543f842958fb863a12fe0fedd47e';
const gitSource=(ref,path)=>execFileSync('git',['show',ref+':'+path],{encoding:'utf8'});
assert(readFileSync('src/lua/abyss_combat.lua','utf8').includes('return CardUpgrade.canUpgrade(state,instance,M)'),'apply the recovery experiment patch in an isolated checkout before running');
const probe=readFileSync(new URL('./raw-relic-probe.lua',import.meta.url),'utf8');
const hash=s=>createHash('sha256').update(s).digest('hex');
function run(variant){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);const graphs=[],logs=[];
 installLuaGraphObserver(L,'PROBE_GRAPH',(label,graph)=>graphs.push({label,graph}));
 lua.lua_pushcfunction(L,L=>{logs.push(to_jsstring(lauxlib.luaL_tolstring(L,1)));return 0;});lua.lua_setglobal(L,to_luastring('print'));
 let code="package.path='src/lua/?.lua;build/lua/?.lua;'..package.path;\n";
 if(variant==='before')code+=`package.preload.abyss_combat=assert(load(${luaString(gitSource(base,'src/lua/abyss_combat.lua'))},'@src/lua/abyss_combat.lua'));\n`;
 if(variant==='rejected')for(const name of ['abyss_combat','abyss_card_upgrade','abyss_warrior_status_cards','abyss_act2_stasis'])
  code+=`package.preload.${name}=assert(load(${luaString(gitSource(rejectedHead,'src/lua/'+name+'.lua'))},'@src/lua/${name}.lua'));\n`;
 code+=`assert(load(${luaString(probe)},'@raw-relic-probe.lua'))()`;
 let status=lauxlib.luaL_loadstring(L,to_luastring(code));if(status===lua.LUA_OK)status=lua.lua_pcall(L,0,lua.LUA_MULTRET,0);
 const error=status===lua.LUA_OK?null:to_jsstring(lua.lua_tostring(L,-1));lua.lua_close(L);
 return {variant,status,error,logs,graphs};
}
const rejected=run('rejected');assert.notEqual(rejected.status,0);assert.match(rejected.error,/raw API metatables changed/);
const before=run('before'),after=run('after');assert.equal(before.status,0,before.error);assert.equal(after.status,0,after.error);
assert.equal(before.graphs.length,3);assert.deepEqual(after.graphs,before.graphs);assert.deepEqual(after.logs,before.logs);
const output=resolve(process.env.CARD_UPGRADE_EVIDENCE_DIR??'build/card-upgrade-recovery');mkdirSync(output,{recursive:true});
writeFileSync(resolve(output,'raw-relic-differential.json'),JSON.stringify({base:'a0c35db8d3c7242437f4dff0df373749b0d84985',rejected,before,after,equalCompleteGraphs:true},null,2)+'\n');
console.log(JSON.stringify({checkpoints:3,equalCompleteGraphs:true,rejectedOldHead:rejected.error,bytesPerSide:Buffer.byteLength(JSON.stringify(before.graphs)),streamSha256:hash(JSON.stringify(before.graphs))}));
