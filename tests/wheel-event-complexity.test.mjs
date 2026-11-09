import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {requireLuaTool} from '../scripts/setup-lua-static.mjs';
import {parseDiagnostics,reviewResponsibilityComplexity} from '../scripts/check-lua-static.mjs';
const file='src/lua/abyss_wheel_event.lua';
const names=['spinWheel','revealRelic','acceptCurse','offerPurge','acceptDamage','chooseRelic','choosePurge','acceptOutcome','M.choose'];
const errors=(source,rows)=>reviewResponsibilityComplexity(rows,{[file]:source}).errors.filter(e=>e.file===file);
test('complete wheel responsibility has pinned CC15 including nested functions and chunk',t=>{
 const tool=requireLuaTool(),dir=mkdtempSync(join(tmpdir(),'wheel-cc-'));
 const source=readFileSync(file,'utf8');const before=readFileSync('tests/fixtures/wheel-event-before.lua','utf8');
 const measure=text=>{
  const input=join(dir,'wheel.lua');writeFileSync(input,text);
  const result=spawnSync(tool.file,[input,'--formatter','plain','--codes','--ranges','--no-color','--max-cyclomatic-complexity','0','--only','561'],{encoding:'utf8',timeout:10000});
  assert([0,1].includes(result.status),result.stdout+result.stderr);assert.equal(result.stderr,'');
  return parseDiagnostics(result.stdout).map(row=>({...row,file}));
 };
 try{
  const current=measure(source);assert.deepEqual(errors(source,current),[]);
  assert(errors(before,measure(before)).some(e=>e.message.includes('34 exceeds 15')));
  const branches=Array.from({length:16},(_,i)=>`if _G.wheelProbe==${i} then _G.wheelProbe=${i+1} end`).join('\n');
  for(const name of names){
   const signature=new RegExp(`((?:local )?function ${name.replaceAll('.','\\.')}\\([^\\n]*\\)\\n)`);
   assert.match(source,signature);const mutant=source.replace(signature,'$1'+branches+'\n');
   assert(errors(mutant,measure(mutant)).some(e=>e.message.includes(`function '${name}'`)&&e.message.includes('exceeds 15')),name);
  }
  for(const injected of [branches+'\n'+source,source.replace('local function spinWheel(run,event,choice)\n','local function spinWheel(run,event,choice)\n local nested=function()\n'+branches+'\n end\n nested()\n')]){
   assert(errors(injected,measure(injected)).some(e=>e.message.includes('exceeds 15')));
  }
  assert(errors(source,current.slice(1)).some(e=>e.message.includes('Incomplete')));
  assert(errors(source,[]).some(e=>e.message.includes('missing')));
  t.diagnostic(current.map(r=>r.message).join('; '));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
