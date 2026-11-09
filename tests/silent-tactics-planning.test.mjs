import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runLua} from '../scripts/test-lua.mjs';
import {luaString} from '../scripts/build-lua-data.mjs';
import {runStatic} from '../scripts/check-lua-static.mjs';
import {measureSources} from '../scripts/lua-quality-metrics.mjs';
import {installLuaGraphObserver} from './helpers/lua-graph-observer.mjs';
const require=createRequire(import.meta.url);
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
const file='src/lua/abyss_silent_tactics_cards.lua';
const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const before=read('tests/fixtures/silent-tactics-planning-before.lua');
function replay(source){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 const graphs=[];let instructions=0;
 lua.lua_sethook(L,()=>{instructions+=10000;if(instructions>30000000)lauxlib.luaL_error(L,to_luastring('bounded tactics fixture instruction limit'));},lua.LUA_MASKCOUNT,10000);
 installLuaGraphObserver(L,'TACTICS_GRAPH',(label,graph)=>graphs.push({label,graph:JSON.parse(graph)}));
 const script=`package.path='src/lua/?.lua;build/lua/?.lua;'..package.path\npackage.preload.abyss_silent_tactics_cards=assert(load(${luaString(source)},'@src/lua/abyss_silent_tactics_cards.lua'))\ndofile('tests/lua/silent_tactics_planning.lua')`;
 const status=lauxlib.luaL_dostring(L,to_luastring(script));
 const error=status===lua.LUA_OK?null:to_jsstring(lua.lua_tostring(L,-1));
 lua.lua_close(L);return {status,error,graphs};
}
const pass=r=>assert.equal(r.status,0,r.error??r.stdout+r.stderr);
let reference;
function baseline(){return reference??=replay(before);}
test('complete frozen tactics source authenticates develop 7821a7f; only planning region changes',()=>{
 assert.equal(createHash('sha256').update(before).digest('hex'),'8ea7cc9fcd64559b999431997613ae02f394de2eaa6cd04947e2695ff3d48d76');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(before)}\0`).update(before).digest('hex'),'26285b8f9b31e974dcda5bc93defa9376289b1b8');
 assert.equal(read(file).split('-- Each planner owns')[0],before.split('-- All plan arrays')[0]);
 assert.equal(read(file).split('-- Call at randomManualDiscard')[1],before.split('-- Call at randomManualDiscard')[1]);
});
test('independent old/new VMs preserve complete input and plan graphs, aliases, read order, errors and side effects',()=>{
 const old=baseline(),current=replay(read(file));pass(old);pass(current);
 assert(old.graphs.length>1000,'complete before/after checkpoints');assert.deepEqual(current,old);
});
test('unchanged original tactics Combat fixture passes in separate old/new VMs',()=>{
 const dir=mkdtempSync(join(tmpdir(),'silent-tactics-'));
 try{
  const results=[before,read(file)].map(source=>{
   const path=join(dir,'driver.lua');
   writeFileSync(path,`package.preload.abyss_silent_tactics_cards=assert(load(${luaString(source)},'@src/lua/abyss_silent_tactics_cards.lua'))\ndofile('tests/lua/silent_tactics_build.lua')`);
   return runLua(path,{timeout:120000,maxBuffer:4*1024*1024});
  });
  for(const result of results){pass(result);assert.match(result.stdout,/SILENT_TACTICS_BUILD_PASS 60/);}
  assert.equal(results[0].stdout,results[1].stdout);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('all planning helpers and complete module functions/chunk remain measured at CC15',()=>{
 const source=read(file),diagnostics=runStatic(['--max-cyclomatic-complexity','0','--only','561']).diagnostics.filter(d=>d.file===file);
 const measured=measureSources({[file]:source},diagnostics);assert.deepEqual(measured.errors,[]);
 const rows=measured.modules[0].functions;
 for(const name of ['planTargetStatuses','planHandActions','planAttackHits','planEnergyActions','M.planEffect'])assert.equal(rows.filter(f=>f.name===name).length,1,name);
 for(const row of rows)assert(row.complexity<=15,`${row.name}: CC${row.complexity}`);
 assert(measureSources({[file]:source},diagnostics.slice(1)).errors.length>0,'missing measurement must fail');
});
const mutations=[
 ['Wail restore targets','if t.restore then','if not t.restore then'],
 ['Poison queue order',"status='poison',targetId=enemy.id","status='weak',targetId=enemy.id"],
 ['Finisher excludes itself','n=math.max(0,n-1)','n=math.max(0,n)'],
 ['Unload reverse order','for i=#state.hand,1,-1 do','for i=1,#state.hand do'],
 ['X capture fallback','n==nil or n==-1','n==nil or n==0'],
 ['free X spending','plan.consumeAllEnergy=context.freeToPlayOnce~=true','plan.consumeAllEnergy=true'],
 ['knife damage repeat',"e('reduceGlassKnife',2,{uid=instance.uid})","e('reduceGlassKnife',1,{uid=instance.uid})"],
 ['Storm upgraded shivs',"e('generateShivs',n,{upgraded=effect.upgraded})","e('generateShivs',n,{upgraded=false})"],
];
for(const [name,from,to]of mutations)test(`both original and current reject semantic mutation: ${name}`,()=>{
 const old=baseline();pass(old);
 for(const source of [before,read(file)]){
  assert(source.includes(from));const result=replay(source.replaceAll(from,to));
  if(result.status!==0)assert.match(result.error,/\[TACTICS_PLAN\]/);
  else assert.notDeepEqual(result.graphs,old.graphs,'semantic mutant survived');
 }
});
