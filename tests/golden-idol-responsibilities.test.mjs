import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync}from'node:fs';import {join}from'node:path';import {tmpdir}from'node:os';
import {spawnSync}from'node:child_process';import {createHash}from'node:crypto';import luaparse from 'luaparse';
const path='src/lua/abyss_golden_idol_event.lua';const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');const before=read('tests/fixtures/golden-idol-before.lua');
function run(source){const dir=mkdtempSync(join(tmpdir(),'golden-responsibilities-'));try{
 const output=join(dir,'graphs.jsonl');const child=spawnSync(process.execPath,['tests/helpers/golden-idol-vm.mjs'],{input:JSON.stringify({source,fixture:'tests/helpers/golden-idol-cases.lua',output}),encoding:'utf8',timeout:20000,maxBuffer:8*1024**2});
 assert.ifError(child.error);assert.equal(child.signal,null,'timeout is not a semantic mutant kill');assert.equal(child.status,0,child.stderr);
 return {...JSON.parse(child.stdout),graph:readFileSync(output,'utf8')};
}finally{rmSync(dir,{recursive:true,force:true});}}
test('Golden Idol frozen source binds exact develop 1eb28847 Git bytes',()=>{
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(before)}\0`).update(before).digest('hex'),'85baebf80e4919437a55635b9930eba9a671dd60');
 assert.equal(read(path).slice(0,read(path).indexOf('local function chooseIntro')),before.slice(0,before.indexOf('function M.choose')));
});
test('Golden Idol independent old/new VMs preserve complete state, reads, failures, aliases and returns',()=>{
 const a=run(before),b=run(read(path));assert.equal(a.status,0,a.error);assert.equal(b.status,0,b.error);assert(b.checkpoints>=97);
 assert.deepEqual(b.logs,a.logs);assert.deepEqual(b.labels,a.labels);assert.equal(b.graph,a.graph);
 console.log('GOLDEN_GRAPHS '+JSON.stringify({checkpoints:b.checkpoints,bytes:Buffer.byteLength(b.graph),logs:b.logs}));
});
test('Golden Idol real semantic mutations fail their named assertion, never timeout',()=>{
 for(const [name,from,to]of [
  ['duplicate relic fallback',"and'circlet'or'golden_idol'","and'golden_idol'or'golden_idol'"],
  ['obtain before trap',"id,'trap','遗物已经到手","id,'result','遗物已经到手"],
  ['late relic failure partial state',"if not ok then return false,why end\n event.obtainedRelicId","if not ok then event.stage='trap';return false,why end\n event.obtainedRelicId"],
  ['curse admission before obtain',"owned(run,'darkstone_periapt')","owned(run,'unsupported_periapt')"],
  ['blocked curse result',"event.curseBlocked=obtained=='curse_blocked'","event.curseBlocked=false"],
  ['fatal damage result',"Run.eventNormalDamage(run,event.damage)","Run.eventNormalDamage(run,0)"],
  ['maximum before clamp','run.hp=math.min(run.hp,run.maxHp)','run.hp=run.hp'],
  ['health before invalid choice',"if invalidTrapHealth(run)then","if false then"],
 ]){
  const source=read(path);assert(source.includes(from),name);const mutated=source.replace(from,to);luaparse.parse(mutated,{luaVersion:'5.3'});
  const result=run(mutated);assert.equal(result.status,2,result.error);assert.match(result.error,new RegExp('tests/helpers/golden-idol-cases.lua:\\d+: '+name+'$'));
 }
});

import {writeFileSync}from'node:fs';
import {requireLuaTool}from'../scripts/setup-lua-static.mjs';
import {parseDiagnostics,reviewResponsibilityComplexity}from'../scripts/check-lua-static.mjs';
const file=path;
const names=['M.choose','chooseIntro','invalidTrapHealth','obtainInjury','applyTrapCost'];
const row=(line,column,subject,value)=>({file,line,column,code:'W561',
  message:`cyclomatic complexity of ${subject} is too high (${value} > 0)`});
const errors=(source,rows)=>reviewResponsibilityComplexity(rows,{[file]:source}).errors.filter(e=>e.file===file);

test('Golden Idol responsibility entries and nested callbacks require complete CC15 measurements',()=>{
  for(const name of names){
    const source=`function ${name}() return function() end end`;
    const nested=source.indexOf('function()')+1;
    const rows=[row(1,1,'main chunk',1),row(1,1,`function '${name}'`,15),row(1,nested,'function',16)];
    assert(errors(source,rows).some(e=>e.message.includes('16 exceeds 15')),name+' nested');
    rows[1]=row(1,1,`function '${name}'`,16);rows[2]=row(1,nested,'function',1);
    assert(errors(source,rows).some(e=>e.message.includes('16 exceeds 15')),name+' entry');
    assert(errors(source,[]).some(e=>e.message.includes(name)&&e.message.includes('missing')),name+' required');
    const shifted=rows.map(r=>({...r,column:r.column+1}));
    assert(errors(source,shifted).some(e=>e.message.includes('AST')),name+' coordinate drift');
    assert(errors(source,[...rows,rows[1]]).some(e=>e.message.includes('Duplicate')),name+' duplicate');
  }
});

test('real pinned measurements reject old Golden Idol choose and each helper or anonymous nested regression',t=>{
  const tool=requireLuaTool(),dir=mkdtempSync(join(tmpdir(),'golden-idol-cc-'));
  const source=readFileSync(file,'utf8').replaceAll('\r\n','\n');
  const before=readFileSync('tests/fixtures/golden-idol-before.lua','utf8').replaceAll('\r\n','\n');
  const measure=text=>{
    const input=join(dir,'golden-idol.lua');writeFileSync(input,text);
    const result=spawnSync(tool.file,[input,'--formatter','plain','--codes','--ranges','--no-color',
      '--max-cyclomatic-complexity','0','--only','561'],{encoding:'utf8',timeout:10000});
    assert([0,1].includes(result.status),result.stdout+result.stderr);assert.equal(result.stderr,'');
    return parseDiagnostics(result.stdout).map(r=>({...r,file}));
  };
  try{
    const current=measure(source);assert.deepEqual(errors(source,current),[]);
    for(const name of names){
      const measured=current.find(r=>r.message.includes(`function '${name}'`));assert(measured,name);
      assert(errors(source,current.filter(r=>r!==measured)).some(e=>e.message.includes('missing')),name+' measured missing');
      assert(errors(source,[...current,measured]).some(e=>e.message.includes('Duplicate')),name+' measured duplicate');
      assert(errors(source,current.map(r=>r===measured?{...r,column:r.column+1}:r)).some(e=>e.message.includes('AST')),name+' measured coordinate');
    }
    const old=measure(before);
    assert(old.some(r=>r.message.includes("function 'M.choose'")&&r.message.includes('(31 > 0)')));
    assert(errors(before,old).some(e=>e.message.includes('31 exceeds 15')));
    const branches=Array.from({length:16},(_,i)=>`if _G.goldenProbe==${i} then _G.goldenProbe=${i+1} end`).join('\n');
    for(const name of names){
      const signature=new RegExp(`(function ${name.replaceAll('.','\\.')}\\([^\\n]*\\)\\n)`);
      const match=source.match(signature);assert(match,name);
      const mutant=source.replace(signature,match[0]+branches+'\n');
      assert(errors(mutant,measure(mutant)).some(e=>e.message.includes(`function '${name}'`)&&e.message.includes('exceeds 15')),name);
      const nested=source.replace(signature,match[0]+' local probe=function()\n'+branches+'\n end\n probe()\n');
      assert(errors(nested,measure(nested)).some(e=>e.message.includes('17 exceeds 15')),name+' anonymous nested');
    }
    t.diagnostic(current.filter(r=>names.some(name=>r.message.includes(`function '${name}'`))).map(r=>r.message).join('; '));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
