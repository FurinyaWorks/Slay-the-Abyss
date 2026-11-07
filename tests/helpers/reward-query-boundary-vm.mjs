// Each invocation owns a fresh VM and complete immutable source snapshot.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,openSync,writeSync,closeSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {luaString} from '../../scripts/build-lua-data.mjs';
import {installLuaGraphObserver} from './lua-graph-observer.mjs';
const require=createRequire(import.meta.url),{lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
const [variant,group,directory,mutation='none']=process.argv.slice(2);
assert(['old','current'].includes(variant));assert(['cold','dynamic','cards','shop'].includes(group));
assert(['none','managed-bowl','preview-flag','pending-bowl'].includes(mutation));
assert(mutation==='none'||variant==='current');
const hash=x=>createHash('sha256').update(x).digest('hex');
const proof=JSON.parse(readFileSync('tests/helpers/reward-query-boundary-before.json','utf8'));
assert.equal(proof.revision,'d8a57cae2a867200ca8e588abc0d368e6cdb3799');
const sources={},sourceManifest={};
for(const name of readdirSync('src/lua').filter(n=>n.endsWith('.lua')).sort()){
 const path='src/lua/'+name;let source=readFileSync(path,'utf8').replaceAll('\r\n','\n');
 const row=proof.files[path];
 if(row){
  assert.equal(hash(source),row.afterSha256,path+' current full source');
  assert.equal(hash(row.beforeSource),row.beforeSha256,path+' historical full source');
  assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(row.beforeSource)}\0`).update(row.beforeSource).digest('hex'),row.beforeGitBlob);
  if(variant==='old')source=row.beforeSource;
 }
 sources[name.slice(0,-4)]=source;sourceManifest[path]={sha256:hash(source),bytes:Buffer.byteLength(source)};
}
assert.equal(Object.keys(sources).length,333);
const mutations={
 'managed-bowl':['abyss_relic_card_rewards',"or owns(run,'singing_bowl')","or owns(run,'prayer_wheel')"],
 'preview-flag':['abyss_relic_card_rewards','common.previewCardReward(run,group,true)','common.previewCardReward(run,group,false)'],
 'pending-bowl':['abyss_relic_pending',"if run and require('abyss_relic_queries').hooks.owns(run,'singing_bowl')then","if run and require('abyss_relic_queries').hooks.owns(run,'prayer_wheel')then"],
};
if(mutation!=='none'){
 const [name,before,after]=mutations[mutation];assert.equal(sources[name].split(before).length-1,1);
 sources[name]=sources[name].replace(before,after);sourceManifest['src/lua/'+name+'.lua'].mutatedSha256=hash(sources[name]);
}
mkdirSync(directory,{recursive:true});writeFileSync(directory+'/source-manifest.json',JSON.stringify({variant,group,mutation,files:sourceManifest},null,2)+'\n');
const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
const fd=openSync(directory+'/graph.jsonl','w'),digest=createHash('sha256');let checkpoints=0,bytes=0;const printed=[];
installLuaGraphObserver(L,'REWARD_GRAPH',(label,graph)=>{
 const line=JSON.stringify({label,graph:JSON.parse(graph)})+'\n';bytes+=Buffer.byteLength(line);
 assert(bytes<=1024**3,'complete graph output budget');writeSync(fd,line);digest.update(line);checkpoints++;
});
lua.lua_pushcfunction(L,L=>{const parts=[],n=lua.lua_gettop(L);for(let i=1;i<=n;i++){parts.push(to_jsstring(lauxlib.luaL_tolstring(L,i)));lua.lua_pop(L,1);}printed.push(parts.join('\t'));return 0;});
lua.lua_setglobal(L,to_luastring('print'));
let prelude="package.path='src/lua/?.lua;build/lua/?.lua;'..package.path\n";
for(const [name,source]of Object.entries(sources))prelude+=`package.preload[${luaString(name)}]=assert(load(${luaString(source)},${luaString('@src/lua/'+name+'.lua')}))\n`;
prelude+=`REWARD_VARIANT=${luaString(variant)}\nREWARD_GROUP=${luaString(group)}\n`;
try{
 let status=lauxlib.luaL_dostring(L,to_luastring(prelude));assert.equal(status,lua.LUA_OK,status===lua.LUA_OK?'':to_jsstring(lua.lua_tostring(L,-1)));
 const fixture='tests/lua/support/reward_query_boundary.lua';
 status=lauxlib.luaL_loadbuffer(L,to_luastring(readFileSync(fixture,'utf8')),null,to_luastring('@'+fixture));
 if(status===lua.LUA_OK)status=lua.lua_pcall(L,0,lua.LUA_MULTRET,0);
 assert.equal(status,lua.LUA_OK,status===lua.LUA_OK?'':to_jsstring(lua.lua_tostring(L,-1)));
 assert(checkpoints>0);writeFileSync(directory+'/fixture.log',printed.join('\n')+'\n');
 console.log(JSON.stringify({variant,group,mutation,checkpoints,bytes,sha256:digest.digest('hex'),printed}));
}finally{writeFileSync(directory+'/fixture.log',printed.join('\n')+'\n');closeSync(fd);lua.lua_close(L);}
