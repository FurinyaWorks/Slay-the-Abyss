import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {requireLuaTool} from '../scripts/setup-lua-static.mjs';
import {parseDiagnostics,reviewResponsibilityComplexity} from '../scripts/check-lua-static.mjs';

const file='src/lua/abyss_silent_final_cards.lua';
const names=['M.apply', ...['gainSilentFinalPower','potionShivs','trigger','choke','setup',
  'bulletTime','copyHand','distraction','doppelganger','phantasmalGain','remove','tools',
  'startPower','corpseDamage','alchemize'].map(name=>`actionHandlers.${name}`)];
const row=(line,column,subject,value)=>({file,line,column,code:'W561',
  message:`cyclomatic complexity of ${subject} is too high (${value} > 0)`});
const errors=(source,rows)=>reviewResponsibilityComplexity(rows,{[file]:source}).errors.filter(e=>e.file===file);

test('Silent final action entries and nested callbacks require complete CC15 measurements',()=>{
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

test('real pinned measurements reject old Silent apply and each helper or anonymous nested regression',t=>{
  const tool=requireLuaTool(),dir=mkdtempSync(join(tmpdir(),'silent-final-cc-'));
  const source=readFileSync(file,'utf8').replaceAll('\r\n','\n');
  const before=readFileSync('tests/fixtures/silent-final-apply-before.lua','utf8').replaceAll('\r\n','\n');
  const measure=text=>{
    const input=join(dir,'silent.lua');writeFileSync(input,text);
    const result=spawnSync(tool.file,[input,'--formatter','plain','--codes','--ranges','--no-color',
      '--max-cyclomatic-complexity','0','--only','561'],{encoding:'utf8',timeout:10000});
    assert([0,1].includes(result.status),result.stdout+result.stderr);assert.equal(result.stderr,'');
    return parseDiagnostics(result.stdout).map(r=>({...r,file}));
  };
  try{
    const current=measure(source);assert.deepEqual(errors(source,current),[]);
    assert(current.some(r=>r.message.includes("function 'M.choose'")&&r.message.includes('(18 > 0)')));
    assert.equal(current.filter(r=>r.message.match(/\((?:1[6-9]|[2-9]\d|\d{3,}) > 0\)/)).length,1);
    const old=measure(before);
    assert(old.some(r=>r.message.includes("function 'M.apply'")&&r.message.includes('(42 > 0)')));
    assert(errors(before,old).some(e=>e.message.includes('42 exceeds 15')));
    const branches=Array.from({length:16},(_,i)=>`if _G.silentProbe==${i} then _G.silentProbe=${i+1} end`).join('\n');
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

test('only the apply span changes; untouched choose CC18 remains an explicit residual',()=>{
  const source=readFileSync(file,'utf8').replaceAll('\r\n','\n');
  const before=readFileSync('tests/fixtures/silent-final-apply-before.lua','utf8').replaceAll('\r\n','\n');
  assert.equal(source.slice(0,source.indexOf('-- Action handlers')),before.slice(0,before.indexOf('function M.apply')));
  assert.equal(source.slice(source.indexOf('\nreturn M')),before.slice(before.indexOf('\nreturn M')));
  const sourceNames=[...source.slice(source.indexOf('-- Action handlers')).matchAll(/function ([\w.]+)\(/g)].map(m=>m[1]);
  assert.deepEqual(sourceNames.sort(),[...names].sort());
});
