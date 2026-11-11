import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
import {evaluateQualityRatchet as evaluate} from '../scripts/quality-ratchet-policy.mjs';

const fn=(name,complexity,line=2)=>({id:'$/M.'+name+'#1',name:'M.'+name,kind:'function',complexity,line,ratchetIdentity:{owner:'$',context:hash(name),fingerprint:hash(name+complexity)}});
const mod=(name,funcs=[],lines=40)=>({file:'src/lua/'+name+'.lua',lines,
  functions:[{id:'$',name:'<chunk>',kind:'chunk',complexity:1,line:1},...funcs]});
const cycle=(members,pairs)=>({members,edges:pairs.map(([from,to])=>({from,to,line:1}))});
const check=(beforeModules=[],afterModules=[],beforeCycles=[],afterCycles=[])=>
  evaluate({beforeModules,afterModules,beforeCycles,afterCycles});

test('new CC16 fails while CC15 passes and unrelated old debt is grandfathered',()=>{
  const old=mod('old',[fn('large',72)]);
  assert.deepEqual(check([old],[old]),[]);
  assert.deepEqual(check([],[mod('new',[fn('fine',15)])]),[]);
  const errors=check([old],[old,mod('new',[fn('tooBig',16,8)])]);
  assert.equal(errors.length,1);assert.match(errors[0].message,/CC new -> 16/);assert.equal(errors[0].line,8);
});
test('old high CC cannot increase; improvements and low debt within limit are permitted',()=>{
  const old=mod('a',[fn('large',72)]);
  assert.equal(check([old],[mod('a',[fn('large',73)])]).length,1);
  assert.deepEqual(check([old],[mod('a',[fn('large',20)])]),[]);
  assert.equal(check([old],[mod('a',[fn('large',70),fn('new',16)])]).length,1);
  assert.equal(check([mod('a',[fn('small',15)])],[mod('a',[fn('small',16)])]).length,1);
});
test('new modules have a line budget; existing oversized owners cannot grow',()=>{
  assert.equal(check([],[mod('new',[],1001)]).length,1);
  const old=mod('huge',[],1300);
  assert.deepEqual(check([old],[old]),[]);
  assert.equal(check([old],[mod('huge',[],1301)]).length,1);
  assert.deepEqual(check([old],[mod('huge',[],1299)]),[]);
});
test('new, expanded or denser SCC is blocked; unchanged and eliminated SCC are fine',()=>{
  const old=[cycle(['a','b'],[['a','b'],['b','a']])];
  assert.equal(check([],[],[],[cycle(['x','y'],[['x','y'],['y','x']])]).length,1);
  assert.equal(check([],[],old,[cycle(['a','b','c'],[['a','b'],['b','c'],['c','a']])]).length,1);
  assert.equal(check([],[],old,[cycle(['a','b'],[['a','b'],['b','a'],['a','a']])]).length,1);
  assert.deepEqual(check([],[],old,old),[]);
  assert.deepEqual(check([],[],old,[]),[]);
});
test('splitting a large SCC is allowed but its internal edge allowance cannot expand',()=>{
  const old=[cycle(['a','b','c','d'],[['a','b'],['b','a'],['b','c'],['c','d'],['d','a']])];
  const next=[cycle(['a','b'],[['a','b'],['b','a']]),cycle(['c','d'],[['c','d'],['d','c']])];
  assert.deepEqual(check([],[],old,next),[]);
  assert.equal(check([],[],old,[cycle(['a','b'],[['a','b'],['b','a'],['a','a']]),
    cycle(['c','d'],[['c','d'],['d','c'],['c','c']])]).length,1);
});
test('missing/corrupt measurements fail closed',()=>{
  assert.throws(()=>check([],[{file:'src/lua/a.lua',lines:2,functions:[{id:'$',kind:'chunk',complexity:null,line:1}]}]),/Invalid candidate function/);
  assert.throws(()=>check([],[mod('a'),mod('a')]),/duplicate candidate module/);
  assert.throws(()=>check([],[],[],[{members:['a','b'],edges:[{from:'a',to:'not-a-member'}]}]),/Invalid candidate SCC edge/);
});

import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {committedSources} from '../scripts/check-quality-ratchet.mjs';
import {requireLuaTool} from '../scripts/setup-lua-static.mjs';
const repository=fileURLToPath(new URL('..',import.meta.url));
function gitFixture(run){
  const root=mkdtempSync(join(tmpdir(),'quality-ratchet-git-')),cwd=process.cwd();
  const git=(...args)=>{
    const result=spawnSync('git',args,{cwd:root,encoding:'utf8',timeout:10000});
    assert.equal(result.status,0,result.stderr);return result.stdout.trim();
  };
  const put=(path,source)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);};
  const commit=()=>{git('add','-A');git('-c','user.name=Ratchet test','-c','user.email=ratchet@example.invalid','commit','--no-gpg-sign','-qm','fixture');return git('rev-parse','HEAD');};
  git('init','-q');git('config','core.autocrlf','false');git('config','commit.gpgsign','false');
  put('.gitignore','build/\n');put('.luacheckrc','std="lua53"\n');
  try{process.chdir(root);run({root,git,put,commit});}
  finally{process.chdir(cwd);rmSync(root,{recursive:true,force:true});}
}

test('committed source graphs preserve Git bytes and ignore checkout, staged and untracked changes',()=>{
  gitFixture(({git,put,commit})=>{
    const original={'src/lua/a.lua':'\ufeffreturn "汉字"\r\n',
      'src/lua/nested/space name.lua':'return "é"\n',
      'src/lua/empty.lua':''};
    for(const [file,source]of Object.entries(original))put(file,source);
    put('src/lua/README.txt','not Lua');const head=commit();
    assert.deepEqual(committedSources(head),original);
    put('src/lua/a.lua','return "staged replacement"\n');git('add','src/lua/a.lua');
    put('src/lua/a.lua','return "unstaged replacement"\n');
    rmSync('src/lua/empty.lua');put('src/lua/untracked.lua','return "not committed"\n');
    assert.deepEqual(committedSources(head),original);
    assert.throws(()=>committedSources('HEAD'),/Exact source revision/);
  });
});

test('committed linked source files and directory entries fail closed without following checkout paths',()=>{
  for(const file of ['src/lua/linked.lua','src/lua/linked'])gitFixture(({git,put,commit})=>{
    put('src/lua/a.lua','return {}\n');const base=commit();
    const oid=git('rev-parse',base+':src/lua/a.lua');
    git('update-index','--add','--cacheinfo','120000,'+oid+','+file);
    git('-c','user.name=Ratchet test','-c','user.email=ratchet@example.invalid','commit','--no-gpg-sign','-qm','linked entry');
    assert.throws(()=>committedSources(git('rev-parse','HEAD')),/Unsupported committed source entry/);
  });
});

test('real CLI keeps committed CC16 blocked after checkout source and policy are replaced',()=>{
  const tool=requireLuaTool();
  for(const file of ['src/lua/a.lua','src/lua/nested/a.lua'])gitFixture(({root,put,commit})=>{
    put('config/architecture.json',JSON.stringify({layers:{[file.slice('src/lua/'.length,-4).replaceAll('/','.')]: 'core'}}));
    put(file,'return {}\n');const base=commit();
    const source='local M={}\nfunction M.added(n)\n'+Array.from({length:15},(_,i)=>
      ` if n==${i} then return ${i} end\n`).join('')+' return -1\nend\nreturn M\n';
    put(file,source);const head=commit();
    mkdirSync(join(root,'build/tools/luacheck'),{recursive:true});
    copyFileSync(tool.file,join(root,'build/tools/luacheck',tool.asset));
    const run=()=>{
      const result=spawnSync(process.execPath,[resolve(repository,'scripts/check-quality-ratchet.mjs'),'--base',base],
        {cwd:root,encoding:'utf8',timeout:30000});
      assert.equal(result.status,1,result.stderr);assert.match(result.stderr,/CC new -> 16 exceeds 15/);
      const report=JSON.parse(readFileSync('build/quality-ratchet.json','utf8'));
      assert.equal(report.head,head);assert.equal(report.base,base);assert.equal(report.status,'blocked');
      return report;
    };
    const before=run();
    put(file,'return {}\n');put('src/lua/untracked.lua','invalid Lua');
    put('config/architecture.json','not JSON');put('.luacheckrc','not Lua');
    assert.deepEqual(run(),before,'receipt remains about the named commit, not checkout inputs');
  });
});

import {measureSources} from '../scripts/lua-quality-metrics.mjs';
import {parseDiagnostics} from '../scripts/check-lua-static.mjs';
const callback=(cc,tag='n')=>`function(${tag})\n${Array.from({length:cc-1},(_,i)=>
  `if ${tag} == ${i} then return ${i} end`).join('\n')}\nreturn -1\nend`;
function measured(source,file='src/lua/a.lua',withIdentity=true) {
  const root=mkdtempSync(join(tmpdir(),'ratchet-identity-'));
  try {
    mkdirSync(dirname(join(root,file)),{recursive:true});writeFileSync(join(root,file),source);
    const result=spawnSync(requireLuaTool().file,[file,'--no-config','--formatter','plain','--codes',
      '--ranges','--no-color','--max-cyclomatic-complexity','0','--only','561'],
      {cwd:root,encoding:'utf8',timeout:30000});
    assert.ok([0,1].includes(result.status),result.stderr);assert.equal(result.stderr,'');
    const measured=measureSources({[file]:source},parseDiagnostics(result.stdout),{ratchetIdentity:withIdentity});
    assert.deepEqual(measured.errors,[]);return measured.modules;
  } finally {rmSync(root,{recursive:true,force:true});}
}
const compareLua=(before,after)=>check(measured(before),measured(after));

test('real anonymous insertions preserve old hotspots without lending their debt to another target',()=>{
  const before=`register_old(${callback(20)})`;
  assert.deepEqual(compareLua(before,`register_new(${callback(1)})\n${before}`),[]);
  assert.match(compareLua(before,`register_new(${callback(20)})\nregister_old(${callback(1)})`)[0].message,/CC new -> 20/);
  assert.deepEqual(compareLua(before,`-- location shift\nregister_old(${callback(19)})`),[]);
  assert.equal(compareLua(before,`register_old(${callback(21)})`).length,1);
});

test('registration event arguments and table owners cannot share an anonymous allowance',()=>{
  for(const [before,after] of [
    [`register('old',${callback(20)})`,`register('new',${callback(20)})\nregister('old',${callback(1)})`],
    [`register({event='old'},${callback(20)})`,`register({event='new'},${callback(20)})`],
    [`local a={run=${callback(20)}}`,`local b={run=${callback(20)}}\nlocal a={run=${callback(1)}}`],
    [`local a={nested={run=${callback(20)}}}`,`local a={other={run=${callback(20)}},nested={run=${callback(1)}}}`],
    [`if enabled then local run=${callback(20)} end`,`if other then local run=${callback(20)} end`],
    [`local run=${callback(20)}`,`local renamed=${callback(20)}`]
  ])assert.equal(compareLua(before,after).length,1);
  const before=`local a={run=${callback(20)}}`;
  assert.deepEqual(compareLua(before,`local b={run=${callback(1)}}\n${before}`),[]);
});

test('ambiguous same-context functions match unchanged content first and never infer residual uniqueness',()=>{
  for(const wrap of [f=>`register('event',${f})`,f=>`local run=${f}`]) {
    const old=wrap(callback(20));
    assert.deepEqual(compareLua(old,wrap(callback(1))+'\n'+old),[]);
    assert.equal(compareLua(old,old+'\n'+old).length,1,'old debt is consumed once');
    const pair=old+'\n'+wrap(callback(18));
    assert.deepEqual(compareLua(pair,wrap(callback(1))+'\n'+pair),[]);
    assert.equal(compareLua(pair,old+'\n'+wrap(callback(17))).length,1,'original ambiguity survives exact matching');
    assert.deepEqual(compareLua(old+'\n'+old,old+'\n'+old),[],'unchanged identical multiplicity is bounded');
  }
});

test('nested debt follows matched lexical owners, not names or shifted ordinals',()=>{
  const owner=(event,cc)=>`register('${event}',function() register_inner(${callback(cc)}) end)`;
  const before=owner('old',20);
  assert.deepEqual(compareLua(before,owner('new',1)+'\n'+before),[]);
  assert.equal(compareLua(before,owner('new',20)+'\n'+owner('old',1)).length,1);
  const ambiguous=owner('same',20)+'\n'+owner('same',18);
  assert.equal(compareLua(ambiguous,owner('same',20)+'\n'+owner('same',17)).length,1);
});

test('file moves and generated committed sources use the same explicit identity boundary',()=>{
  const source=`return {run=${callback(20)}}`;
  assert.equal(check(measured(source),measured(source,'src/lua/moved.lua')).length,1);
  const generated='src/lua/generated/output.lua';
  assert.deepEqual(check(measured(source,generated),measured('-- regenerated\n'+source,generated)),[]);
  assert.equal(check(measured(source,generated),measured(`return {renamed=${callback(20)}}`,generated)).length,1);
});

test('ratchet identity is optional for legacy metrics but mandatory to inherit function debt',()=>{
  const source=`register('event',${callback(20)})`;
  const plain=measured(source,'src/lua/a.lua',false),extended=measured(source);
  assert.deepEqual(extended.map(m=>({...m,functions:m.functions.map(({ratchetIdentity,...f})=>f)})),plain);
  assert.throws(()=>check(plain,plain),/Invalid base function identity/);
  const malformed=structuredClone(extended);malformed[0].functions[1].ratchetIdentity.owner='missing';
  assert.throws(()=>check(malformed,extended),/Invalid base function identity/);
});

function installFixtureTool(root,tool) {
  mkdirSync(join(root,'build/tools/luacheck'),{recursive:true});
  copyFileSync(tool.file,join(root,'build/tools/luacheck',tool.asset));
}
function runFixtureRatchet(root,base,head,status) {
  const result=spawnSync(process.execPath,[resolve(repository,'scripts/check-quality-ratchet.mjs'),'--base',base],
    {cwd:root,encoding:'utf8',timeout:30000});
  assert.equal(result.status,status==='pass'?0:1,result.stderr);
  const report=JSON.parse(readFileSync(join(root,'build/quality-ratchet.json'),'utf8'));
  assert.equal(report.base,base);assert.equal(report.head,head);assert.equal(report.status,status);
  return report;
}

test('real CLI blocks a new full-graph SCC including reviewed deferred imports',()=>{
  const tool=requireLuaTool();
  gitFixture(({root,put,commit})=>{
    installFixtureTool(root,tool);
    put('config/architecture.json',JSON.stringify({layers:{a:'core',b:'core'},
      deferredImports:[{from:'b',to:'a'}]}));
    put('src/lua/a.lua','return {}\n');
    put('src/lua/b.lua','return {load=function() return require("a") end}\n');const base=commit();
    put('config/architecture.json',JSON.stringify({layers:{a:'core',b:'core'},
      deferredImports:[{from:'a',to:'b'},{from:'b',to:'a'}]}));
    put('src/lua/a.lua','return {load=function() return require("b") end}\n');const head=commit();
    const report=runFixtureRatchet(root,base,head,'blocked');
    assert.deepEqual(report.changedLua,['src/lua/a.lua']);
    assert.deepEqual(report.sccBefore,[]);assert.deepEqual(report.sccAfter,[2]);
    assert.equal(report.errors.length,1);assert.match(report.errors[0].message,/New or expanded SCC: a, b/);
  });
});

test('real CLI preserves an old full-graph SCC and CC debt but blocks CC growth',()=>{
  const tool=requireLuaTool();
  gitFixture(({root,put,commit})=>{
    installFixtureTool(root,tool);
    put('config/architecture.json',JSON.stringify({layers:{a:'core',b:'core'},
      deferredImports:[{from:'a',to:'b'},{from:'b',to:'a'}]}));
    const source=cc=>`return {load=function() return require("b") end,run=${callback(cc)}}\n`;
    put('src/lua/a.lua',source(20));
    put('src/lua/b.lua','return {load=function() return require("a") end}\n');const base=commit();
    for(const [cc,status] of [[20,'pass'],[19,'pass'],[21,'blocked']]) {
      put('src/lua/a.lua','-- touched, same owner\n'+source(cc));const head=commit();
      const report=runFixtureRatchet(root,base,head,status);
      assert.deepEqual(report.changedLua,['src/lua/a.lua']);
      assert.deepEqual(report.sccBefore,[2]);assert.deepEqual(report.sccAfter,[2]);
      if(status==='pass')assert.deepEqual(report.errors,[]);
      else {
        assert.equal(report.errors.length,1);
        assert.match(report.errors[0].message,/CC 20 -> 21 exceeds 20/);
      }
    }
  });
});

test('real CLI passes a no-Lua commit without needing a tool or measuring existing debt',()=>{
  gitFixture(({root,put,commit})=>{
    put('src/lua/a.lua',`return {run=${callback(20)}}\n`);const base=commit();
    for(const file of ['README.md','src/lua/README.md','src/lua/nested/notes.txt']) {
      put(file,'Documentation-only change\n');const head=commit();
      const report=runFixtureRatchet(root,base,head,'pass');
      assert.deepEqual(report.changedLua,[]);assert.deepEqual(report.errors,[]);
      assert.equal(Object.hasOwn(report,'sccBefore'),false);
      assert.equal(Object.hasOwn(report,'sccAfter'),false);
    }
  });
});
