import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { collectEngineeringInputs, collectQuality } from '../scripts/check-engineering-quality.mjs';
import { runEngineering } from '../scripts/check-engineering.mjs';
import { discoverSources, measureSources } from '../scripts/lua-quality-metrics.mjs';
import { checkArchitecture } from '../scripts/check-architecture.mjs';

test('each invocation collects fresh sources, architecture and both Luacheck passes exactly once',()=>{
  let revision=0;const calls=[];
  const dependencies={
    discover:()=>({'src/lua/a.lua':`return ${++revision}`}),
    policy:()=>({layers:{a:'core'}}),
    analyze:(sources,policy)=>{calls.push(['architecture',sources.a,policy.layers.a]);return {errors:[],edges:[],nodes:['a']};},
    lint:args=>{calls.push(['lint',args]);return {diagnostics:args.length?[{file:'src/lua/a.lua',line:1,column:1,code:'W561',message:'cyclomatic complexity of main chunk is too high (1 > 0)'}]:[],tool:{version:'1.2.0'}};},
    measure:(sources,diagnostics)=>{calls.push(['measure',sources['src/lua/a.lua'],diagnostics.length]);return measureSources(sources,diagnostics);},
  };
  const first=collectEngineeringInputs(dependencies),second=collectEngineeringInputs(dependencies);
  assert.equal(first.sources['src/lua/a.lua'],'return 1');
  assert.equal(second.sources['src/lua/a.lua'],'return 2');
  assert.deepEqual(first.measurements.errors,[]);assert.deepEqual(second.measurements.errors,[]);
  assert.notEqual(first.measurements,second.measurements);
  assert.equal(collectQuality(first).snapshot.modules,first.measurements.modules,'quality consumes the same measured AST/W561 collection');
  assert.deepEqual(calls,[['architecture','return 1','core'],['lint',[]],['lint',['--max-cyclomatic-complexity','0','--only','561']],['measure','return 1',1],
    ['architecture','return 2','core'],['lint',[]],['lint',['--max-cyclomatic-complexity','0','--only','561']],['measure','return 2',1]]);
});

test('combined entry shares the same in-memory inputs across all three existing gates',()=>{
  const shared={architecture:{errors:[]}},seen=[];
  runEngineering({collect:()=>shared,
    quality:(args,collect)=>{assert.deepEqual(args,[]);seen.push(collect());return {errors:[]};},
    architecture:report=>{assert.equal(report,shared.architecture);return report;},
    staticCheck:inputs=>{seen.push(inputs);return {errors:[]};},
  });
  assert.deepEqual(seen,[shared,shared]);
});

test('collection failures and existing gate failures propagate',()=>{
  assert.throws(()=>runEngineering({collect:()=>{throw Error('tool missing');},quality:(_args,collect)=>collect()}),/tool missing/);
  const gates={collect:()=>({architecture:{errors:[]}}),quality:(_args,collect)=>{collect();return {errors:[]};},architecture:()=>({errors:[]}),staticCheck:()=>({errors:[]})};
  for(const gate of ['quality','architecture','staticCheck']) {
    assert.throws(()=>runEngineering({...gates,[gate]:()=>{throw Error(`${gate} failed`);}}),new RegExp(`${gate} failed`));
    assert.throws(()=>runEngineering({...gates,[gate]:()=>({errors:[{message:`${gate} rejected`}]})}),new RegExp(`${gate} rejected`));
  }
});


test('a failed shared collection writes a fresh failed quality report',()=>{
  const directory=mkdtempSync(join(tmpdir(),'engineering-failure-')),cwd=process.cwd(),exitCode=process.exitCode;
  try {
    process.chdir(directory);
    assert.throws(()=>runEngineering({collect:()=>{throw Error('tool missing');}}),/tool missing/);
    const report=JSON.parse(readFileSync('build/engineering-quality.json','utf8'));
    assert.equal(report.status,'failed');
    assert.deepEqual(report.errors,[{message:'tool missing'}]);
    assert.equal(process.exitCode,1);
  }finally {process.chdir(cwd);process.exitCode=exitCode;rmSync(directory,{recursive:true,force:true});}
});
import { reviewNodeUiSize } from '../scripts/check-lua-static.mjs';
test('Node UI size reports are identical for independent and shared discovery orders',()=>{
  const sources={'src/lua/abyss_node_ui.lua':'return {}\n','src/lua/abyss_node_ui_input.lua':'local function input() end\nreturn {}\n'};
  assert.deepEqual(reviewNodeUiSize(sources),reviewNodeUiSize(Object.fromEntries(Object.entries(sources).reverse())));
});

function sourceTree(sources, policy, run) {
  const root=mkdtempSync(join(tmpdir(),'architecture-discovery-'));
  try {
    mkdirSync(join(root,'src/lua'),{recursive:true});
    mkdirSync(join(root,'config'));
    writeFileSync(join(root,'config/architecture.json'),JSON.stringify(policy));
    for(const [file,source] of Object.entries(sources)) {
      mkdirSync(dirname(join(root,'src/lua',file)),{recursive:true});
      writeFileSync(join(root,'src/lua',file),source);
    }
    run(root,()=>collectEngineeringInputs({discover:()=>discoverSources(root),policy:()=>policy,
      lint:()=>({diagnostics:[]}),measure:()=>({modules:[],errors:[]})}).architecture);
  } finally {rmSync(root,{recursive:true,force:true});}
}

test('standalone architecture and shared collection inspect the same recursive modules and source paths',()=>{
  const policy={layers:{main:'core','nested.helper':'core',ui:'ui'}};
  for(const [label,helper,pattern] of [
    ['valid','return {}',null],
    ['platform access','return game.GetPlayer()',/platform global/],
    ['syntax','local =',/Lua parse failed/],
    ['dynamic import','return require(name)',/dynamic require/],
    ['unknown import','return require("missing")',/unknown module/],
    ['forbidden layer','return require("ui")',/core cannot depend/],
    ['dependency cycle','return require("main")',/Dependency cycle/],
  ]) sourceTree({'main.lua':'return require("nested.helper")','nested/helper.lua':helper,'ui.lua':'return {}'},policy,(root,shared)=>{
    const report=checkArchitecture(root);
    assert.deepEqual(report,shared(),label);
    assert.deepEqual(report.nodes,['main','nested.helper','ui'],label);
    if(pattern)assert(report.errors.some(error=>pattern.test(error.message)),label);
    else assert.deepEqual(report.errors,[],label);
    if(pattern&&label!=='dependency cycle')assert(report.errors.some(error=>
      error.file==='src/lua/nested/helper.lua'&&pattern.test(error.message)),`${label}: actual source path`);
  });
  sourceTree({'nested/helper.lua':'return {}'},{layers:{}},(root,shared)=>{
    const report=checkArchitecture(root);
    assert.deepEqual(report,shared());
    assert.equal(report.errors[0].file,'src/lua/nested/helper.lua');
    assert.match(report.errors[0].message,/explicit classification/);
  });
});

test('both architecture entries reject empty scans and ambiguous Lua module identities',()=>{
  for(const [sources,pattern] of [
    [{},/No Lua sources discovered/],
    [{'nested/helper.lua':'return {}','nested.helper.lua':'return {}'},/Ambiguous Lua module identity: nested.helper/],
  ])sourceTree(sources,{layers:{'nested.helper':'core'}},(root,shared)=>{
    assert.throws(()=>checkArchitecture(root),pattern);
    assert.throws(shared,pattern);
  });
});

test('both architecture entries refuse linked source directories instead of silently omitting them',()=>{
  sourceTree({'main.lua':'return {}'},{layers:{main:'core'}},(root,shared)=>{
    const external=join(root,'external');mkdirSync(external);
    writeFileSync(join(external,'hidden.lua'),'return game.GetPlayer()');
    symlinkSync(external,join(root,'src/lua/linked'),'junction');
    assert.throws(()=>checkArchitecture(root),/Linked source entry is not supported/);
    assert.throws(shared,/Linked source entry is not supported/);
  });
});

test('nested source changes and dependency boundaries are freshly checked by both architecture entries',()=>{
  const policy={layers:{main:'core','nested.helper':'core'},dependencyBoundaries:[{
    id:'nested-leaf',from:['nested.helper'],forbiddenTargets:['main'],reason:'The helper is a leaf',
  }]};
  sourceTree({'main.lua':'return {}','nested/helper.lua':'return {}'},policy,(root,shared)=>{
    const first=checkArchitecture(root);assert.deepEqual(first,shared());assert.deepEqual(first.errors,[]);
    writeFileSync(join(root,'src/lua/nested/helper.lua'),'return require("main")');
    const changed=checkArchitecture(root);assert.deepEqual(changed,shared());
    assert.notEqual(first.sourceHashes['nested.helper'],changed.sourceHashes['nested.helper']);
    assert(changed.errors.some(error=>error.file==='src/lua/nested/helper.lua'&&/Dependency boundary/.test(error.message)));
  });
});
