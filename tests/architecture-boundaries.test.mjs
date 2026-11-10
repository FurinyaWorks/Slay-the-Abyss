import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyzeSources,checkArchitecture} from '../scripts/check-architecture.mjs';
const sources={a:'return {}',b:'return {}'};
const rule={id:'no-reverse',from:['a'],forbiddenTargets:['b'],reason:'Admission cannot depend on dispatch'};
const policy={layers:{a:'core',b:'core'},dependencyBoundaries:[rule]};
test('responsibility boundaries validate policy and reject immediate and deferred imports',()=>{
 for(const code of ['return require("b")','return function() return require("b") end']) {
  const report=analyzeSources({...sources,a:code},{...policy,deferredImports:code.includes('function')?[{from:'a',to:'b',reason:'Reviewed runtime callback'}]:[]},{});
  assert(report.errors.some(e=>/Dependency boundary no-reverse/.test(e.message)),code);
 }
 for(const a of ['-- require("b")\nreturn {}','return "require(\'b\')"','local require=function()end;return require("b")'])
  assert.deepEqual(analyzeSources({...sources,a},policy,{}).errors,[]);
 for(const boundary of [{...rule,id:''},{...rule,from:[]},{...rule,from:['a','a']},
  {...rule,forbiddenTargets:[]},{...rule,forbiddenTargets:['b','b']},{...rule,from:['missing']},
  {...rule,forbiddenTargets:['missing']},{...rule,reason:''}])
  assert(analyzeSources(sources,{...policy,dependencyBoundaries:[boundary]},{}).errors.length,JSON.stringify(boundary));
 assert(analyzeSources(sources,{...policy,dependencyBoundaries:[rule,rule]},{}).errors.length);
});
test('production policy permanently protects Actor and the independently loadable reaction entry',()=>{
 const policy=JSON.parse(readFileSync('config/architecture.json','utf8'));
 const boundaries=policy.dependencyBoundaries??[];
 const required=[['actor-reaction-admission','abyss_actor',['abyss_card_actions']],
  ['nob-reaction-admission','abyss_gremlin_nob_ai',['abyss_card_actions']],
  ['combat-reaction-independence','abyss_combat_reactions',['abyss_actor','abyss_card_actions','abyss_combat']]];
 for(const [id,from,targets] of required){
  const row=boundaries.find(row=>row.id===id);assert(row,id);assert(row.from.includes(from));
  for(const target of targets)assert(row.forbiddenTargets.includes(target),target);
 }
 const report=checkArchitecture();assert.deepEqual(report.errors,[]);
 assert(!report.edges.some(edge=>edge.from==='abyss_actor'&&edge.to==='abyss_card_actions'));
 assert(!report.edges.some(edge=>edge.from==='abyss_gremlin_nob_ai'&&edge.to==='abyss_card_actions'));
 const nob=readFileSync('src/lua/abyss_gremlin_nob_ai.lua','utf8');
 const restored=nob.replace('require("abyss_combat_reactions")','require("abyss_card_actions")');
 assert.notEqual(restored,nob,'restore the actual old dependency');
 const mutant=analyzeSources({abyss_gremlin_nob_ai:restored,abyss_card_actions:'return {}'},
  {layers:policy.layers,dependencyBoundaries:boundaries.filter(row=>row.id==='nob-reaction-admission')},{});
 assert(mutant.errors.some(error=>error.message.includes('Dependency boundary nob-reaction-admission')));
});


const deferredCycleSources={a:'return function() return require("b") end',b:'return require("a")'};
const deferredLayers={a:'core',b:'core'};
const reviewedPair={from:'a',to:'b',reason:'Reviewed callback after initialization'};
const hasCycle=report=>report.errors.some(error=>/Dependency cycle/.test(error.message));
const policyErrors=report=>report.errors.filter(error=>error.file==='config/architecture.json');

test('deferred cycle exemptions require a nonblank textual review reason',()=>{
 for(const reason of [undefined,null,'','  \t\n ',false,0,[],{},['reviewed']]) {
  const report=analyzeSources(deferredCycleSources,{layers:deferredLayers,deferredImports:[{...reviewedPair,reason}]},{});
  assert(policyErrors(report).some(error=>/reason/.test(error.message)),JSON.stringify(reason));
  assert(hasCycle(report),'invalid review must not remove a graph edge');
  assert.equal(report.edges.find(edge=>edge.from==='a').reviewedDeferred,false);
 }
 assert.deepEqual(analyzeSources(deferredCycleSources,
  {layers:deferredLayers,deferredImports:[{...reviewedPair,reason:'  已审查的运行期回调  '}]},{}).errors,[]);
});

test('malformed deferred exception containers and rows produce structured errors',()=>{
 for(const deferredImports of [null,false,0,'',{},'a:b',...([null,false,0,'a:b',[],{}].map(row=>[row]))]) {
  const report=analyzeSources(deferredCycleSources,{layers:deferredLayers,deferredImports},{});
  assert(policyErrors(report).some(error=>/deferred|Deferred/.test(error.message)),JSON.stringify(deferredImports));
  assert(hasCycle(report),'malformed policy cannot hide the cycle');
 }
 assert(hasCycle(analyzeSources(deferredCycleSources,{layers:deferredLayers},{})));
 assert(hasCycle(analyzeSources(deferredCycleSources,{layers:deferredLayers,deferredImports:[]},{})));
});

test('deferred exceptions validate both identities without coercion or prototype matches',()=>{
 for(const key of ['from','to'])for(const value of [undefined,null,'',' a ','missing','constructor','toString',0,{},['a']]) {
  const report=analyzeSources(deferredCycleSources,
   {layers:deferredLayers,deferredImports:[{...reviewedPair,[key]:value}]},{});
  assert(policyErrors(report).some(error=>error.message.includes(key)),`${key}: ${JSON.stringify(value)}`);
  assert(hasCycle(report));
 }
 const report=analyzeSources({a:'return function() return require("theme") end'},
  {layers:{a:'ui'},deferredImports:[{from:'a',to:'theme',reason:'Generated theme is consumed by runtime callback'}]},
  {theme:'scripts/build-ui-theme.mjs'});
 assert.deepEqual(report.errors,[],'known generated targets retain their previous valid behavior');
});

test('invalid exception rows do not discard unrelated valid reviews or boundary enforcement',()=>{
 const source={...deferredCycleSources,c:'return function() return require("d") end',d:'return require("c")'};
 const report=analyzeSources(source,{layers:{...deferredLayers,c:'core',d:'core'},deferredImports:[
  null,reviewedPair,{from:'c',to:'d',reason:' '},
 ]},{});
 assert.equal(report.edges.find(edge=>edge.from==='a').reviewedDeferred,true);
 assert.equal(report.edges.find(edge=>edge.from==='c').reviewedDeferred,false);
 assert(report.errors.some(error=>/Dependency cycle: c -> d -> c/.test(error.message)));
 assert(!report.errors.some(error=>/Dependency cycle: a/.test(error.message)));
 const boundary=analyzeSources(deferredCycleSources,{...policy,deferredImports:[reviewedPair]},{});
 assert(boundary.edges.find(edge=>edge.from==='a').reviewedDeferred);
 assert(boundary.errors.some(error=>/Dependency boundary no-reverse/.test(error.message)));
});
