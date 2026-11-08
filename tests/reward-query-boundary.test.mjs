import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {checkArchitecture,analyzeSources} from '../scripts/check-architecture.mjs';
import {dependencyCycles} from '../scripts/lua-quality-metrics.mjs';
import {buildLuaData} from '../scripts/build-lua-data.mjs';
const consumers=['abyss_relic_card_rewards','abyss_relic_choices','abyss_relic_pending'];
test('reward query consumers use capabilities and retain actual Run transaction dependencies',()=>{
 const graph=checkArchitecture();assert.deepEqual(graph.errors,[]);
 assert.deepEqual(graph.edges.filter(e=>consumers.includes(e.from)&&e.to==='abyss_relic_hooks'),[],'[REWARD_BOUNDARY] mixed Session facade returned');
 for(const from of consumers)assert(graph.edges.some(e=>e.from===from&&e.to==='abyss_run'),'real transaction owner must remain visible');
 const cycle=dependencyCycles(graph.nodes,graph.edges).find(c=>c.members.includes('abyss_run'));
 assert.equal(cycle.members.length,15);assert.equal(cycle.edges.length,56);
 assert.equal(new Set(cycle.edges.map(e=>e.from+':'+e.to)).size,38);
});
test('reward query architecture rule rejects immediate and deferred facade regression',()=>{
 const policy=JSON.parse(readFileSync('config/architecture.json','utf8'));
 const rule=policy.dependencyBoundaries.find(r=>r.id==='reward-query-consumer-boundary');assert(rule);
 assert.deepEqual(rule.from,consumers);assert.deepEqual(rule.forbiddenTargets,['abyss_relic_hooks']);
 const sources=Object.fromEntries([...consumers,'abyss_relic_hooks'].map(n=>[n,'return {}']));
 for(const from of consumers)for(const deferred of [false,true]){
  const source=deferred?"return function()return require('abyss_relic_hooks')end":"return require('abyss_relic_hooks')";
  const report=analyzeSources({...sources,[from]:source},{layers:policy.layers,dependencyBoundaries:[rule],deferredImports:deferred?[{from,to:'abyss_relic_hooks'}]:[]},{});
  assert(report.errors.some(e=>e.message.includes('Dependency boundary reward-query-consumer-boundary:')));
 }
});
function run(variant,group,mutation='none'){
 const directory=`build/reward-query-boundary/${group}-${variant}-${mutation}`;mkdirSync(directory,{recursive:true});
 const result=spawnSync(process.execPath,['--max-old-space-size=512','tests/helpers/reward-query-boundary-vm.mjs',variant,group,directory,mutation],{encoding:'utf8',timeout:30000,maxBuffer:2*1024**2,windowsHide:true});
 writeFileSync(directory+'/process.json',JSON.stringify({status:result.status,signal:result.signal,error:result.error?.message},null,2)+'\n');
 writeFileSync(directory+'/stdout.log',result.stdout??'');writeFileSync(directory+'/stderr.log',result.stderr??'');return {result,directory};
}
for(const group of ['cold','dynamic','cards','shop'])test(`independent ${group} baseline and current VMs preserve complete reward graph`,()=>{
 buildLuaData();const rows=[];
 for(const variant of ['old','current']){
  const {result,directory}=run(variant,group);assert.ifError(result.error);assert.equal(result.status,0,result.stdout+result.stderr);
  const receipt=JSON.parse(result.stdout);assert(receipt.checkpoints>0);rows.push({receipt,graph:readFileSync(directory+'/graph.jsonl')});
 }
 assert.equal(rows[0].receipt.checkpoints,rows[1].receipt.checkpoints);assert.deepEqual(rows[0].graph,rows[1].graph,'complete values/aliases/returns/error/RNG graph differs');
});
const expectedKills={
 'managed-bowl':'[REWARD_BOUNDARY] Bowl owns is not Prayer Wheel: false ~= true',
 'preview-flag':'[REWARD_BOUNDARY] preview preserves skip-upgraded flag: false ~= true',
 'pending-bowl':'[REWARD_BOUNDARY] every reward owner retains Bowl option: 0 ~= bowl',
};
for(const [mutation,message]of Object.entries(expectedKills))test(`real ${mutation} semantic mutation is rejected by named boundary assertion`,()=>{
 const {result}=run('current','dynamic',mutation);assert.ifError(result.error);assert.notEqual(result.status,0);
 assert.ok(result.stderr.includes(message),'only this mutant-specific semantic assertion counts as a kill: '+message);
});
