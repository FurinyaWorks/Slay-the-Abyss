import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSources } from '../scripts/check-architecture.mjs';

test('AST boundaries distinguish imports, shadowing, dynamic access, syntax and cycles',async()=>{
  const mod=await import('../scripts/check-architecture.mjs');
  const layers={a:'core',b:'core',ui:'ui'};
  const check=sources=>mod.analyzeSources(sources,{layers},{theme:'builder'});
  assert.deepEqual(check({a:'-- require("ui")\nlocal text=[=[中文 require("ui")]=]\nlocal function f() return require("b") end',b:'return math.max(1,2)',ui:'return require("a")'}).errors,[]);
  assert.deepEqual(check({a:'local require=function(x) return x end; require("ui")'}).errors,[]);
  for(const [code,match] of [
    ['local function unused() return require("theme") end',/core.*theme/],
    ['return require("missing")',/unknown module/],['return require(prefix .. "b")',/dynamic/],
    ['local loader=require; return loader("b")',/dynamic/],['return game.GetPlayer()',/platform/],
    ['return _G["game"]',/indirect/],['return _ENV.game',/indirect/],['return load("return 1")',/dynamic/],
    ['local =',/parse/],
  ]) assert(check({a:code}).errors.some(e=>match.test(e.message)),code);
  assert(check({a:'return require("b")',b:'return require("a")'}).errors.some(e=>/cycle/.test(e.message)));
  assert(check({unknown:'return {}'}).errors.some(e=>/classif/.test(e.message)));
  assert.deepEqual(mod.analyzeSources({fresh:'return math.abs(-1)'},{layers:{fresh:'core'}},{}).errors,[]);
  const callbacks={a:'local M={}\nfunction M.later() return require("b") end\nreturn M',b:'return require("a")'};
  assert(mod.analyzeSources(callbacks,{layers:{a:'core',b:'core'}},{}).errors.some(e=>/cycle/.test(e.message)));
  const reviewed={layers:{a:'core',b:'core'},deferredImports:[{from:'a',to:'b',reason:'Reviewed callback after initialization'}]};
  assert.deepEqual(mod.analyzeSources(callbacks,reviewed,{}).errors,[]);
  assert(mod.analyzeSources({...callbacks,a:'return require("b")'},reviewed,{}).errors.some(e=>/cycle/.test(e.message)));
  assert(mod.analyzeSources(callbacks,{...reviewed,layers:{a:'core',b:'ui'}},{}).errors.some(e=>/core cannot depend/.test(e.message)));
});

const deferredPolicy = {
  layers: {a:'core', b:'core'},
  deferredImports: [{from:'a', to:'b', reason:'Reviewed callback after initialization'}],
};

test('only own source and generated entries register Lua imports',()=>{
  const policy={layers:{a:'ui',b:'core'}};
  for(const name of Object.getOwnPropertyNames(Object.prototype)) {
    const report=analyzeSources({a:`return require("${name}")`},policy,{});
    assert(report.errors.some(error=>error.message===`unknown module ${name}`),name);
    assert.deepEqual(report.nodes,['a'],name);
    const registered=Object.fromEntries([[name,'builder']]);
    assert.deepEqual(analyzeSources({a:`return require("${name}")`},policy,registered).errors,[],name);
  }
  const source='return require("b")';
  const inheritedSources=Object.assign(Object.create({b:'return {}'}),{a:source});
  const inheritedGenerated=Object.create({b:'builder'});
  for(const [sources,generated] of [[inheritedSources,{}],[{a:source},inheritedGenerated]]) {
    const report=analyzeSources(sources,policy,generated);
    assert.deepEqual(report.nodes,['a']);
    assert(report.errors.some(error=>error.message==='unknown module b'));
  }
  assert.deepEqual(analyzeSources({a:source,b:'return {}'},policy,{}).errors,[]);
  assert.deepEqual(analyzeSources({a:source},policy,{b:'builder'}).errors,[]);
  assert.deepEqual(analyzeSources({a:source},policy,Object.assign(Object.create(null),{b:'builder'})).errors,[]);
});

test('initialization calls cannot borrow a deferred import exception',()=>{
  for(const [label,a] of [
    ['IIFE','return (function() return require("b") end)()'],
    ['local direct call','local function loadB() return require("b") end; return loadB()'],
    ['local function expression','local loadB=function() return require("b") end; return loadB()'],
    ['local alias','local function loadB() return require("b") end; local alias=loadB; return alias()'],
    ['assigned alias','local function loadB() return require("b") end; local alias; alias=loadB; return alias()'],
    ['assigned local','local loadB; loadB=function() return require("b") end; return loadB()'],
    ['forward local declaration','local loadB; function loadB() return require("b") end; return loadB()'],
    ['nested direct call','local function outer() local function inner() return require("b") end; return inner() end; return outer()'],
    ['returned function call','return (function() return function() return require("b") end end)()()'],
    ['returned local alias','local function factory() local function loadB() return require("b") end; return loadB end; local alias=factory(); return alias()'],
    ['second return expression still executes','local function factory() return function() return 1 end, (function() return require("b") end)() end; return factory()()'],
    ['StringCallExpression','return (function() return require "b" end) "argument"'],
    ['TableCallExpression','return (function() return require "b" end) {}'],
    ['conditional initialization','if enabled then local function loadB() return require("b") end; loadB() end'],
    ['repeat scope','repeat local function loadB() return require("b") end until loadB()'],
    ['local recursive call','local function again() require("b"); return again() end; return again()'],
  ]) {
    const report=analyzeSources({a,b:'return require("a")'},deferredPolicy,{});
    assert(report.errors.some(error=>/Dependency cycle/.test(error.message)),label);
    assert(report.errors.some(error=>/Stale deferred import exception/.test(error.message)),label);
    assert.equal(report.edges.find(edge=>edge.from==='a').reviewedDeferred,false,label);
  }
});

test('uninvoked callbacks and lexical shadows remain deferred',()=>{
  for(const [label,a] of [
    ['uninvoked local','local function later() return require("b") end; return later'],
    ['uninvoked nested IIFE','return function() return (function() return require("b") end)() end'],
    ['returned callback','return (function() return function() return require("b") end end)()'],
    ['shadowed local','local function loadB() return require("b") end; do local function loadB() return 1 end; loadB() end; return loadB'],
    ['loop local','local function loadB() return require("b") end; for loadB in iterator do loadB() end; return loadB'],
    ['local initializer scope','local function loadB() return require("b") end; do local loadB=function() return 1 end; local loadB=loadB; loadB() end; return loadB'],
    ['recursive aliases without invocation','local first,second; first=function() return second() end; second=function() require("b"); return first() end; return first'],
    ['alias before reassignment','local f=function() return 1 end; local old=f; f=function() return require("b") end; old(); return f'],
    ['uninvoked mutator','local f=function() return 1 end; local function later() f=function() return require("b") end end; f(); return later'],
    ['only first return is invoked','local function f() return function() return 1 end, function() return require("b") end end; return f()()'],
    ['alias before assignment is not a future function','local f; local old=f; f=function() return require("b") end; old(); return f'],
    ['implicit nil reassignment is unknown','local f=function() return require("b") end; local unused; unused,f=1; f()'],
    ['shadowed parameter','local function loadB() return require("b") end; local function invoke(loadB) return loadB() end; invoke(function() return 1 end); return loadB'],
  ])assert.deepEqual(analyzeSources({a,b:'return require("a")'},deferredPolicy,{}).errors,[],label);
});

test('generic-for initialization invokes the known iterator, including aliases and factory results',()=>{
  for(const [label,a] of [
    ['local iterator','local function iter() return require("b") end; for value in iter do end'],
    ['function expression','for value in function() return require("b") end do end'],
    ['local alias','local function iter() return require("b") end; local alias=iter; for value in alias do end'],
    ['assigned local','local iter; iter=function() return require("b") end; for value in iter do end'],
    ['returned iterator','local function factory() return function() return require("b") end end; for value in factory() do end'],
    ['returned alias','local function factory() local function iter() return require("b") end; return iter end; for value in factory() do end'],
    ['shadowing loop variable','local function iter() return require("b") end; for iter in iter do end'],
    ['multiple loop variables','local function iter() return require("b") end; for iter, other in iter, {}, 0 do end'],
    ['called outer owner','local function outer() local function iter() return require("b") end; for value in iter do end end; outer()'],
    ['nested generic loops','local function outer() return require("b") end; local function iter() for value in outer do end end; for value in iter do end'],
    ['state expression still executes','local function state() return require("b") end; for value in function() end, state() do end'],
    ['control expression still executes','local function control() return require("b") end; for value in function() end, {}, control() do end'],
  ]) {
    const report=analyzeSources({a,b:'return require("a")'},deferredPolicy,{});
    assert(report.errors.some(error=>/Dependency cycle/.test(error.message)),label);
    assert(report.errors.some(error=>/Stale deferred import exception/.test(error.message)),label);
    assert.equal(report.edges.find(edge=>edge.from==='a').reviewedDeferred,false,label);
  }
});

test('generic-for does not invoke state, control, unused results or dormant loop owners',()=>{
  for(const [label,a] of [
    ['state value','local function later() return require("b") end; for value in function() end, later do end'],
    ['control value','local function later() return require("b") end; for value in function() end, {}, later do end'],
    ['extra value','local function later() return require("b") end; for value in function() end, {}, 0, later do end'],
    ['factory second result','local function factory() return function() end, function() return require("b") end end; for value in factory() do end'],
    ['iterator return is not called','local function iter() return function() return require("b") end end; for value in iter do end'],
    ['uninvoked owner','return function() local function iter() return require("b") end; for value in iter do end end'],
    ['shadowed iterator','local function iter() return require("b") end; do local function iter() end; for value in iter do end end; return iter'],
    ['reassigned iterator remains unknown','local iter=function() end; local old=iter; iter=function() return require("b") end; for value in old do end; return iter'],
    ['parameter remains unknown','local function iter() return require("b") end; local function loop(iter) for value in iter do end end; loop(function() end); return iter'],
    ['numeric loop is not an iterator call','local function later() return require("b") end; for value=1,2 do end; return later'],
  ]) assert.deepEqual(analyzeSources({a,b:'return require("a")'},deferredPolicy,{}).errors,[],label);
  const a='local function iter() return require("b") end; for value in iter do end; return function() return require("b") end';
  const report=analyzeSources({a,b:'return require("a")'},deferredPolicy,{});
  assert.deepEqual(report.edges.filter(edge=>edge.from==='a').map(edge=>edge.reviewedDeferred),[false,true]);
  assert(report.errors.some(error=>/Dependency cycle/.test(error.message)));
  assert(!report.errors.some(error=>/Stale deferred/.test(error.message)));
});

test('an immediate and a deferred require retain their individual execution classification',()=>{
  const a='local function now() return require("b") end; now(); return function() return require("b") end';
  const report=analyzeSources({a,b:'return require("a")'},deferredPolicy,{});
  assert.deepEqual(report.edges.filter(edge=>edge.from==='a').map(edge=>edge.reviewedDeferred),[false,true]);
  assert(report.errors.some(error=>/Dependency cycle/.test(error.message)));
  assert(!report.errors.some(error=>/Stale deferred/.test(error.message)));
});

test('deferred import exceptions must still match an actual function-scoped require',()=>{
  for (const [label, sources] of [
    ['removed import', {a:'return {}', b:'return {}'}],
    ['deleted importer', {b:'return {}'}],
    ['module-level import', {a:'return require("b")', b:'return {}'}],
    ['shadowed require', {a:'local require=function(x) return x end; return function() return require("b") end', b:'return {}'}],
    ['comment and string', {a:'-- require("b")\nreturn function() return [=[require("b")]=] end', b:'return {}'}],
    ['different dependency', {a:'return function() return require("a") end', b:'return {}'}],
  ]) {
    const report=analyzeSources(sources,deferredPolicy,{});
    assert(report.errors.some(error=>error.file==='config/architecture.json'
      && /Stale deferred import exception: a -> b/.test(error.message)),label);
  }
});

test('duplicate deferred import exceptions fail even with different review reasons',()=>{
  const sources={a:'return function() return require("b") end', b:'return require("a")'};
  const policy={...deferredPolicy, deferredImports:[
    ...deferredPolicy.deferredImports,
    {from:'a',to:'b',reason:'A second explanation does not make this a distinct exception'},
  ]};
  assert(analyzeSources(sources,policy,{}).errors.some(error=>error.file==='config/architecture.json'
    && /Duplicate deferred import exception: a -> b/.test(error.message)));
});

test('one reviewed pair permits repeated deferred calls while module-level calls retain cycle checks',()=>{
  const deferred='local function first() return require("b") end\nreturn function() return function() return require("b") end end';
  const sources={a:deferred,b:'return require("a")'};
  const report=analyzeSources(sources,deferredPolicy,{});
  assert.deepEqual(report.errors,[]);
  assert.equal(report.edges.filter(edge=>edge.from==='a' && edge.reviewedDeferred).length,2);
  const mixed=analyzeSources({...sources,a:'local b=require("b")\n'+deferred},deferredPolicy,{});
  assert(mixed.errors.some(error=>/Dependency cycle/.test(error.message)));
  assert(!mixed.errors.some(error=>/Stale deferred/.test(error.message)));
});

test('global protected calls invoke known functions during module initialization',()=>{
  for(const [label,a] of [
    ['pcall local','local function init() return require("b") end; return pcall(init)'],
    ['pcall inline','return pcall(function() return require("b") end)'],
    ['pcall alias argument','local function init() return require("b") end; local alias=init; return pcall(alias)'],
    ['pcall assigned argument','local init; init=function() return require("b") end; return pcall(init)'],
    ['pcall factory result','local function factory() return function() return require("b") end end; return pcall(factory())'],
    ['pcall recursive','local function init() require("b"); return pcall(init) end; return pcall(init)'],
    ['pcall called owner','local function outer() return pcall(function() return require("b") end) end; return outer()'],
    ['xpcall local','local function init() return require("b") end; return xpcall(init,function(err) return err end)'],
    ['xpcall inline','return xpcall(function() return require("b") end,function(err) return err end)'],
    ['xpcall handler','return xpcall(function() error("boom") end,function() return require("b") end)'],
    ['xpcall handler alias','local function failed() return require("b") end; local alias=failed; return xpcall(function() error("boom") end,alias)'],
    ['xpcall handler factory','local function factory() return function() return require("b") end end; return xpcall(function() error("boom") end,factory())'],
    ['nested protected calls','return pcall(function() return xpcall(function() return require("b") end,function(err) return err end) end)'],
    ['argument expression still executes','local function argument() return require("b") end; return pcall(function() end,argument())'],
  ]) {
    const report=analyzeSources({a,b:'return require("a")'},deferredPolicy,{});
    assert(report.errors.some(error=>/Dependency cycle/.test(error.message)),label);
    assert(report.errors.some(error=>/Stale deferred import exception/.test(error.message)),label);
    assert.equal(report.edges.find(edge=>edge.from==='a').reviewedDeferred,false,label);
  }
});

test('protected call values and lexical shadows do not activate unrelated callbacks',()=>{
  for(const [label,a] of [
    ['pcall argument value','local function later() return require("b") end; return pcall(function() end,later)'],
    ['xpcall argument value','local function later() return require("b") end; return xpcall(function() end,function(err) return err end,later)'],
    ['pcall returned function','return pcall(function() return function() return require("b") end end)'],
    ['xpcall returned function','return xpcall(function() return function() return require("b") end end,function(err) return err end)'],
    ['handler returned function','return xpcall(function() error("boom") end,function() return function() return require("b") end end)'],
    ['dormant pcall owner','return function() return pcall(function() return require("b") end) end'],
    ['dormant xpcall owner','return function() return xpcall(function() end,function() return require("b") end) end'],
    ['shadowed local pcall','local pcall=function(fn) return fn end; return pcall(function() return require("b") end)'],
    ['shadowed local xpcall','local xpcall=function(fn,handler) return handler end; return xpcall(function() end,function() return require("b") end)'],
    ['shadowed parameter','local function invoke(pcall) return pcall(function() return require("b") end) end; return invoke(function(fn) return fn end)'],
    ['shadowed loop variable','for pcall in function() end do pcall(function() return require("b") end) end'],
    ['factory second result','local function factory() return function() end,function() return require("b") end end; return pcall(factory())'],
    ['reassigned callback stays unknown','local init=function() end; local old=init; init=function() return require("b") end; return pcall(old)'],
    ['member is not standard pcall','local protect={pcall=function(fn) return fn end}; return protect.pcall(function() return require("b") end)'],
  ])assert.deepEqual(analyzeSources({a,b:'return require("a")'},deferredPolicy,{}).errors,[],label);
});

test('protected initialization and dormant callbacks retain separate import occurrences',()=>{
  const a='pcall(function() return require("b") end); return function() return require("b") end';
  const report=analyzeSources({a,b:'return require("a")'},deferredPolicy,{});
  assert.deepEqual(report.edges.filter(edge=>edge.from==='a').map(edge=>edge.reviewedDeferred),[false,true]);
  assert(report.errors.some(error=>/Dependency cycle/.test(error.message)));
  assert(!report.errors.some(error=>/Stale deferred/.test(error.message)));
});
