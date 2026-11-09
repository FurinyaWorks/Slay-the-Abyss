import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {requireLuaTool} from '../scripts/setup-lua-static.mjs';
import {parseDiagnostics,reviewResponsibilityComplexity} from '../scripts/check-lua-static.mjs';

const file='src/lua/abyss_relic_hooks.lua';
const names=['M.onEquip','admitEquipment','initializeEquipCounter','equipPotionCapacity',
  'previewEggRewards','equipPermanentBenefit'];
const row=(line,column,subject,value)=>({file,line,column,code:'W561',
  message:`cyclomatic complexity of ${subject} is too high (${value} > 0)`});
const errors=(source,rows)=>reviewResponsibilityComplexity(rows,{[file]:source}).errors.filter(e=>e.file===file);

test('equip responsibility entries and nested callbacks are required and retain the CC15 hard cap',()=>{
  for(const name of [...names,'queryIndex','queryNewIndex']){
    const source=`${name.includes('.')?'':'local '}function ${name}() return function() end end`;
    const start=source.indexOf('function')+1,nested=source.indexOf('function()')+1;
    const rows=[row(1,1,'main chunk',1),row(1,start,`function '${name}'`,15),row(1,nested,'function',16)];
    assert(errors(source,rows).some(e=>e.message.includes('16 exceeds 15')),name+' nested');
    rows[1]=row(1,start,`function '${name}'`,16);rows[2]=row(1,nested,'function',1);
    assert(errors(source,rows).some(e=>e.message.includes('16 exceeds 15')),name+' entry');
    assert(errors(source,[]).some(e=>e.message.includes(name)&&e.message.includes('missing')),name+' required');
  }
});

test('real pinned measurements reject old equip complexity and all real helper and nested regressions',t=>{
  const tool=requireLuaTool(),dir=mkdtempSync(join(tmpdir(),'relic-equip-cc-'));
  const source=readFileSync(file,'utf8').replaceAll('\r\n','\n');
  const before=readFileSync('tests/fixtures/relic-equip-before.lua','utf8').replaceAll('\r\n','\n');
  const measure=text=>{
    const input=join(dir,'equip.lua');writeFileSync(input,text);
    const result=spawnSync(tool.file,[input,'--formatter','plain','--codes','--ranges','--no-color',
      '--max-cyclomatic-complexity','0','--only','561'],{encoding:'utf8',timeout:10000});
    assert([0,1].includes(result.status),result.stdout+result.stderr);assert.equal(result.stderr,'');
    return parseDiagnostics(result.stdout).map(r=>({...r,file}));
  };
  try{
    const current=measure(source);assert.deepEqual(errors(source,current),[]);
    const old=measure(before);
    assert(old.some(r=>r.message.includes("function 'M.onEquip'")&&r.message.includes('(47 > 0)')));
    assert(errors(before,old).some(e=>e.message.includes('47 exceeds 15')));
    const branches=Array.from({length:16},(_,i)=>`if _G.equipProbe==${i} then _G.equipProbe=${i+1} end`).join('\n');
    for(const name of names){
      const signature=new RegExp(`((?:local )?function ${name.replaceAll('.','\\.')}\\([^\\n]*\\)\\n)`);
      const match=source.match(signature);assert(match,name);
      const mutant=source.replace(signature,match[0]+branches+'\n');
      assert(errors(mutant,measure(mutant)).some(e=>e.message.includes(`function '${name}'`)&&e.message.includes('exceeds 15')),name);
    }
    const nested=source.replace('local function admitEquipment(run,id)\n',
      'local function admitEquipment(run,id)\n local probe=function()\n'+branches+'\n end\n probe()\n');
    assert(errors(nested,measure(nested)).some(e=>e.message.includes('17 exceeds 15')),'anonymous nested helper');
    t.diagnostic(current.filter(r=>names.some(name=>r.message.includes(`function '${name}'`))).map(r=>r.message).join('; '));
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('untouched equipment upgrade and room-entry residuals remain explicit and are not claimed below CC15',()=>{
  const source=readFileSync(file,'utf8').replaceAll('\r\n','\n');
  const before=readFileSync('tests/fixtures/relic-equip-before.lua','utf8').replaceAll('\r\n','\n');
  const block=(text,start,end)=>text.slice(text.indexOf(start),text.indexOf(end,text.indexOf(start)));
  assert.equal(block(source,'local function equipmentUpgrade','-- Admission'),
    block(before,'local function equipmentUpgrade','function M.onEquip'));
  assert.equal(source.slice(source.indexOf('function M.onUnequip')),before.slice(before.indexOf('function M.onUnequip')));
});
