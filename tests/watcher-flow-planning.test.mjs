import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runLua} from '../scripts/test-lua.mjs';
import {luaString} from '../scripts/build-lua-data.mjs';
import {runStatic,reviewResponsibilityComplexity} from '../scripts/check-lua-static.mjs';
import {measureSources,discoverSources} from '../scripts/lua-quality-metrics.mjs';
import {preWatcherFlowSource,watcherFlowSourceProof as proof} from './helpers/watcher-flow-source-inverse.mjs';
const file=proof.path;
const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const before=read('tests/fixtures/watcher-flow-planning-before.lua');
function replay(source,fixture='tests/lua/watcher_flow_planning.lua'){
 const dir=mkdtempSync(join(tmpdir(),'watcher-flow-'));
 try{
  const script=join(dir,'driver.lua');
  writeFileSync(script,`ABYSS_FLOW_TRACE=true\npackage.preload.abyss_watcher_flow_cards=function() return assert(load(${luaString(source)},'flow-planning-source'))() end\ndofile(${luaString(fixture)})\n`);
  return runLua(script,{timeout:30000,maxBuffer:4*1024*1024});
 }finally{rmSync(dir,{recursive:true,force:true});}
}
const pass=r=>assert.equal(r.status,0,r.stdout+r.stderr);
test('frozen complete source is authenticated and every unmodified responsibility is byte preserved',()=>{
 assert.equal(createHash('sha256').update(before).digest('hex'),proof.beforeSha256);
 const current=read(file);
 assert.equal(current.split('-- These planners only')[0],before.split('function M.planEffect(')[0]);
 assert.equal(current.split('-- After the actual NORMAL damage')[1],before.split('-- After the actual NORMAL damage')[1]);
});
test('independent old/new VMs preserve complete plans, input graphs, reads, callbacks and original errors',()=>{
 const graphs=source=>{const result=spawnSync(process.execPath,['tests/helpers/watcher-flow-vm.mjs'],{input:JSON.stringify({source}),encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024});assert.ifError(result.error);pass(result);return JSON.parse(result.stdout);};
 const old=graphs(before),current=graphs(read(file));assert.equal(old.status,0,old.error);assert.equal(current.status,0,current.error);
 assert.match(current.logs.at(-1),/WATCHER_FLOW_PLANNING_PASS \d+/);assert(current.graphs.length>500);assert.deepEqual(current,old);
});
test('unchanged real Combat Flow regression runs against both implementations',()=>{
 const old=replay(before,'tests/lua/watcher_flow_build.lua'),current=replay(read(file),'tests/lua/watcher_flow_build.lua');
 pass(old);pass(current);assert.match(current.stdout,/watcher_flow_build: \d+ passed/);assert.equal(current.stdout,old.stdout);
});
test('the dispatcher and all five helpers are complete CC15 measurements, while the old dispatcher is rejected',()=>{
 const source=read(file),diagnostics=runStatic(['--max-cyclomatic-complexity','0','--only','561']).diagnostics;
 const rows=measureSources({[file]:source},diagnostics.filter(d=>d.file===file));assert.deepEqual(rows.errors,[]);
 const names=['M.planEffect','planDamage','planStance','planCollect','planPower','planRecall'];
 for(const name of names){const matched=rows.modules[0].functions.filter(f=>f.name===name);assert.equal(matched.length,1,name);assert(matched[0].complexity<=15,`${name}: CC${matched[0].complexity}`);}
 const full=discoverSources();const current=reviewResponsibilityComplexity(diagnostics,full);
 assert.deepEqual(current.errors,[]);
 const old=reviewResponsibilityComplexity(diagnostics,{...full,[file]:before});assert(old.errors.some(e=>e.file===file),'old dispatcher must not satisfy new complete scope');
 for(const name of names.slice(1)){
  const fake=diagnostics.map(d=>d.file===file&&d.message.includes(`function '${name}'`)?{...d,message:d.message.replace(/\(\d+ > 0\)$/, '(16 > 0)')}:d);
  const result=reviewResponsibilityComplexity(fake,full);assert(result.errors.some(e=>e.file===file),`overbudget ${name} must fail`);
 }
});
for(const [name,from,to,diagnostic]of [
 ['damage before Calm',"p.top[1]=e('damage',effect.value,{normalAmount=effect.normalAmount})","p.bottom[1]=e('damage',effect.value,{normalAmount=effect.normalAmount})",'damage before stance'],
 ['Collect cap','math.min(999,n)','n','Collect cap/zero/captured energy'],
 ['Collect free spending','p.consumeAllEnergy=context.freeToPlayOnce~=true','p.consumeAllEnergy=true','Collect free spending'],
 ['complete Mark roster','if n>0 then p.bottom[#p.bottom+1]','if n>0 and target.hp>0 then p.bottom[#p.bottom+1]','marks complete order'],
 ['recall capacity','#state.hand<state.rules.player.maxHand','#state.hand<=state.rules.player.maxHand','recall full hand'],
 ['recall hand hook','handHook=false','handHook=true','recall first match/hand hook'],
])test(`original behavior assertion rejects semantic mutation: ${name}`,()=>{
 const source=read(file);assert.equal(source.split(from).length,2);
 const control=replay(source);pass(control);
 const mutant=replay(source.replace(from,to));assert.notEqual(mutant.status,0,'semantic mutant survived');
 assert.match(mutant.stdout+mutant.stderr,new RegExp(`\\[FLOW_PLAN\\] ${diagnostic}`));
});
test('standalone exact inverse preserves identity without accepting source drift or foreign inputs',()=>{
 const current=read(file);
 for(const input of [current,current.replaceAll('\n','\r\n')])assert.equal(preWatcherFlowSource(file,input),before);
 for(const input of [before,current+'\n',current.slice(1),current+current,null,undefined,{},17])assert.equal(preWatcherFlowSource(file,input),input);
 assert.equal(preWatcherFlowSource('foreign/'+file,current),current);
});
