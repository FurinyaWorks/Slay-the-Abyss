import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateQualityRatchet as evaluate} from '../scripts/quality-ratchet-policy.mjs';

const fn=(name,complexity,line=2)=>({id:'$/M.'+name+'#1',name:'M.'+name,kind:'function',complexity,line});
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
  gitFixture(({root,put,commit})=>{
    put('config/architecture.json',JSON.stringify({layers:{a:'core'}}));
    put('src/lua/a.lua','return {}\n');const base=commit();
    const source='local M={}\nfunction M.added(n)\n'+Array.from({length:15},(_,i)=>
      ` if n==${i} then return ${i} end\n`).join('')+' return -1\nend\nreturn M\n';
    put('src/lua/a.lua',source);const head=commit();
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
    put('src/lua/a.lua','return {}\n');put('src/lua/untracked.lua','invalid Lua');
    put('config/architecture.json','not JSON');put('.luacheckrc','not Lua');
    assert.deepEqual(run(),before,'receipt remains about the named commit, not checkout inputs');
  });
});
