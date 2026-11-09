import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {discoverSources,dependencyCycles} from '../scripts/lua-quality-metrics.mjs';
import {analyzeSources} from '../scripts/check-architecture.mjs';
import {reviewResponsibilityComplexity} from '../scripts/check-lua-static.mjs';
const roots=['abyss_act2_stasis','abyss_act2_powers'];
const forbidden=['abyss_actor','abyss_combat','abyss_card_actions','abyss_combat_queued_play'];
const policy=JSON.parse(readFileSync('config/architecture.json','utf8'));
function closure(graph,root){
 const seen=new Set(),pending=[root];
 while(pending.length){const n=pending.pop();if(seen.has(n))continue;seen.add(n);
  for(const e of graph.edges)if(e.from===n)pending.push(e.to);}
 return [...seen];
}
function requireBoundary(graph){
 for(const root of roots)assert(!closure(graph,root).some(n=>forbidden.includes(n)),`${root}: Stasis policy must not reach death/Combat execution`);
}
test('Stasis policies cannot reach execution owners through immediate or deferred full-source paths',()=>{
 const sources=Object.fromEntries(Object.entries(discoverSources()).map(([p,s])=>[p.slice(8,-4),s]));
 const graph=analyzeSources(sources,policy);assert.deepEqual(graph.errors,[]);requireBoundary(graph);
 const cycles=dependencyCycles(graph.nodes,graph.edges);
 for(const root of roots)assert(!cycles.some(c=>c.members.includes(root)),`${root} stays outside dependency cycles`);
 const owner=graph.edges.filter(e=>e.from==='abyss_actor'&&e.to==='abyss_combat');
 assert.equal(owner.length,1);assert.equal(owner[0].reviewedDeferred,true);
 const rule=policy.dependencyBoundaries.find(r=>r.id==='stasis-death-owner');
 assert.deepEqual(rule.from,roots);assert.deepEqual(rule.forbiddenTargets,forbidden);
 // Parse real import regressions in a bounded graph, then feed their actual AST
 // edges into the full production graph. No synthetic edge or parser failure.
 for(const root of roots)for(const target of forbidden)for(const deferred of [false,true]){
  const source=deferred?`local function regression() return require('${target}') end\nreturn regression`:`return require('${target}')`;
  const small=analyzeSources({[root]:source,[target]:'return {}'},
   {layers:{[root]:'core',[target]:'core'},deferredImports:deferred?[{from:root,to:target}]:[],
    dependencyBoundaries:[{...rule,from:[root],forbiddenTargets:[target]}]});
  assert(small.errors.some(e=>e.message.includes('Dependency boundary stasis-death-owner')));
  assert(!small.errors.some(e=>e.message.includes('parse failed')));
  assert.throws(()=>requireBoundary({...graph,edges:[...graph.edges,...small.edges]}),/Stasis policy must not reach/);
 }
 // A newly introduced facade is forbidden transitively even without a direct
 // policy target match. Both immediate and reviewed deferred paths count.
 for(const deferred of [false,true]){
  const small=analyzeSources({abyss_act2_stasis:"return require('stasis_regression_facade')",stasis_regression_facade:
   deferred?"return function() return require('abyss_combat') end":"return require('abyss_combat')",abyss_combat:'return {}'},
   {layers:{abyss_act2_stasis:'core',stasis_regression_facade:'core',abyss_combat:'core'},
    deferredImports:deferred?[{from:'stasis_regression_facade',to:'abyss_combat'}]:[]});
  assert.deepEqual(small.errors,[]);
  assert.throws(()=>requireBoundary({...graph,edges:[...graph.edges,...small.edges]}),/Stasis policy must not reach/);
 }
});
test('lazy upgrade owner helper and its nested callbacks retain explicit CC15 governance',()=>{
 const file='src/lua/abyss_actor.lua',source='local function upgradeStasisHeld() return function() end end';
 const row=(column,subject,cc)=>({file,line:1,column,code:'W561',message:`cyclomatic complexity of ${subject} is too high (${cc} > 0)`});
 const rows=[row(1,'main chunk',1),row(7,"function 'upgradeStasisHeld'",1),row(source.indexOf('function()')+1,'function',1)];
 for(const index of [1,2]){
  const changed=rows.map((r,i)=>i===index?{...r,message:r.message.replace('(1 > 0)','(16 > 0)')}:r);
  const errors=reviewResponsibilityComplexity(changed,{[file]:source}).errors;
  assert(errors.some(e=>e.file===file&&e.message===`Responsibility complexity 16 exceeds 15: ${index===1?"function 'upgradeStasisHeld'":'function'}`));
 }
 const absent=reviewResponsibilityComplexity([],{[file]:'return {}'}).errors;
 assert(absent.some(e=>e.file===file&&e.message.includes("Required responsibility entry missing or duplicated: function 'upgradeStasisHeld'")));
});
