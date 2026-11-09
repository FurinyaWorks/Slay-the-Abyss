import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import luaparse from 'luaparse';
import {silentPotionEpoch} from './helpers/silent-potion-source-epoch.mjs';
import {analyzeSources} from '../scripts/check-architecture.mjs';
import {discoverSources,dependencyCycles} from '../scripts/lua-quality-metrics.mjs';
const paths=['src/lua/abyss_silent_potions.lua','src/lua/abyss_silent_final_cards.lua'];
const before=Object.fromEntries(paths.map(p=>[p,silentPotionEpoch.proof.targets.prior.files[p].source]));
const current=()=>Object.fromEntries(paths.map(p=>[p,readFileSync(p,'utf8').replaceAll('\r\n','\n')]));
function run(sources,fixture,{gameplay=false}={}){
 const dir=mkdtempSync(join(tmpdir(),'silent-potion-owner-'));
 try{
  const output=join(dir,'graphs.jsonl');
  const child=spawnSync(process.execPath,['tests/helpers/silent-potion-owner-vm.mjs'],{
   input:JSON.stringify({sources,beforeSources:before,fixture,gameplay,output}),encoding:'utf8',timeout:120000,maxBuffer:8*1024**2});
  assert.ifError(child.error);assert.equal(child.signal,null,'timeout is not a semantic mutant kill');assert.equal(child.status,0,child.stderr);
  return {...JSON.parse(child.stdout),graph:readFileSync(output,'utf8')};
 }finally{rmSync(dir,{recursive:true,force:true});}
}
for(const [fixture,gameplay]of [['tests/helpers/silent-potion-owner-edges.lua',false],['tests/lua/silent_final_potions.lua',true]])
 test(`${fixture}: exact old/current owners preserve every graph, alias, action and failure prefix`,()=>{
  const a=run(before,fixture,{gameplay}),b=run(current(),fixture,{gameplay});
  assert.equal(a.status,0,a.error);assert.equal(b.status,0,b.error);
  assert(a.checkpoints>0);assert.deepEqual(b.logs,a.logs);assert.equal(b.graph,a.graph);
  console.log('SILENT_POTION_OWNER '+JSON.stringify({fixture,checkpoints:b.checkpoints,bytes:Buffer.byteLength(b.graph),sha256:b.sha256,rawErrors:{before:a.rawErrors,after:b.rawErrors}}));
 });
test('Silent potion policy is independent of every immediate and deferred lifecycle executor',()=>{
 const sources=Object.fromEntries(Object.entries(discoverSources()).map(([path,value])=>[path.slice(8,-4),value]));
 const policy=JSON.parse(readFileSync('config/architecture.json','utf8'));
 const report=analyzeSources(sources,policy);assert.deepEqual(report.errors,[]);
 assert.equal(report.edges.filter(e=>e.from==='abyss_silent_potions').length,0,'policy stays an execution-independent leaf');
 assert(!dependencyCycles(report.nodes,report.edges).some(c=>c.members.includes('abyss_silent_potions')),'potion leaves every SCC');
 for(const owner of ['abyss_combat','abyss_card_actions','abyss_actor','abyss_silent_final_cards'])for(const text of [
  `local forbidden=require('${owner}')\n`,`local function forbidden()return require('${owner}')end\n`,
 ]){
  const changed={...sources,abyss_silent_potions:text+sources.abyss_silent_potions};
  assert(analyzeSources(changed,policy).errors.some(e=>e.message.includes('silent-potion-shiv-owner')),owner);
 }
});
for(const [name,path,from,to,expected]of [
 ['duplicate creation','src/lua/abyss_silent_potions.lua','host.created(state,card);host.created(state,card)','host.created(state,card)','double dynamic created hooks'],
 ['upgrade omission','src/lua/abyss_silent_potions.lua','host.upgrade(state,card);','', 'upgrade before creation'],
 ['wrong fresh card','src/lua/abyss_silent_final_cards.lua',"Actions.fresh(C,state,'shiv')","Actions.fresh(C,state,'strike')",'bound runtime identity'],
 ['eager method capture','src/lua/abyss_silent_final_cards.lua',"created=function(state,card)return Actions.created(C,state,card)end,","created=(function()local fn=Actions.created;return function(state,card)return fn(C,state,card)end end)(),",'created method replacement'],
])test(`real parsed ${name} mutation cannot satisfy behavior`,()=>{
 const sources=current();assert.equal(sources[path].split(from).length,2);sources[path]=sources[path].replace(from,to);
 luaparse.parse(sources[path],{luaVersion:'5.3'});
 const result=run(sources,'tests/helpers/silent-potion-owner-edges.lua');assert.equal(result.status,2,result.error);
 // The comparison must catch callback order/identity, not parsing or timeout.
 assert.match(result.error,new RegExp('tests/helpers/silent-potion-owner-edges.lua:\\d+: '+expected+'$'));
});
