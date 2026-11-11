import test from 'node:test';
import assert from 'node:assert/strict';
import {runLua} from '../scripts/test-lua.mjs';
test('source power callbacks drain synchronously through real feedback without extra frames or audio',()=>{
 const r=runLua('tests/lua/source_intent_power_feedback.lua');assert.equal(r.status,0,r.stdout+r.stderr);
 assert.match(r.stdout,/SOURCE_INTENT_POWER_FEEDBACK_PASS 4/);
});

// Exact source + trace comparison keeps the presentation refactor independent
// from the live UI and from shared game-state/source-epoch fixtures.
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {requireLuaTool} from '../scripts/setup-lua-static.mjs';
import {parseDiagnostics,reviewResponsibilityComplexity} from '../scripts/check-lua-static.mjs';
const sourceFile='src/lua/abyss_skill_feedback.lua';
const beforeFile='tests/fixtures/skill-feedback-before.lua';
const readSource=file=>readFileSync(file,'utf8').replaceAll('\r\n','\n');
const beforeSource=readSource(beforeFile);
const cli=createRequire(import.meta.url).resolve('fengari-node-cli/src/lua-cli.js');
function resolveTrace(file,probe=false){
 const code=`SKILL_FEEDBACK_MUTATION_PROBE=${probe};SKILL_FEEDBACK_MODULE_PATH=${JSON.stringify(file)};dofile('tests/helpers/skill-feedback-resolve-cases.lua')`;
 const result=spawnSync(process.execPath,[cli,'-e',code],{encoding:'utf8',timeout:10000,maxBuffer:4*1024*1024});
 assert.ifError(result.error);assert.equal(result.status,0,result.stderr);assert.equal(result.stderr,'');
 assert.ok(result.stdout.endsWith(`SKILL_RESOLVE_CASES ${probe?10:1533}\n`));
 return result.stdout;
}

test('skill vocabulary preserves exact old source, separate-VM returns and field/failure traces',()=>{
 assert.equal(createHash('sha256').update(beforeSource).digest('hex'),
  '6bc4bbfc994d1b031f0857a4f690a1c7e9a405ec457d542abf82497e91f3dce6');
 const current=readSource(sourceFile),marker='-- Returns sx,sy,x,y,alpha,themeColourKey.';
 assert.equal(current.slice(current.indexOf(marker)),beforeSource.slice(beforeSource.indexOf(marker)));
 assert.equal(resolveTrace(sourceFile),resolveTrace(beforeFile));
});

test('skill vocabulary detects real precedence, short-circuit and read-order regressions',()=>{
 const source=readSource(sourceFile),expected=resolveTrace(beforeFile,true);
 const mutations=[
  ["return true,d.effectType","return true,'projectile'"],
  ["if handled then return family end","if family then return family end"],
  ["byEnemy and byEnemy[c.intentId] or c.family", "c.family or byEnemy and byEnemy[c.intentId]"],
  ["block and 'defend' or buff and 'buff'", "buff and 'buff' or block and 'defend'"],
  ["if c.weight=='heavy' and family=='melee'", "if family=='melee' and c.weight=='heavy'"],
  ["if family=='none' then", "if family~='projectile' then"],
 ];
 const dir=mkdtempSync(join(tmpdir(),'skill-feedback-mutation-'));
 try{
  for(const [from,to] of mutations){
   assert.equal(source.split(from).length,2,from);
   const file=join(dir,'mutant.lua');writeFileSync(file,source.replace(from,to));
   assert.notEqual(resolveTrace(file,true),expected,from);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('pinned measurements reject the old skill resolver and every new helper regression',()=>{
 const tool=requireLuaTool(),dir=mkdtempSync(join(tmpdir(),'skill-feedback-cc-'));
 const source=readSource(sourceFile);
 const measure=text=>{
  const file=join(dir,'skill.lua');writeFileSync(file,text);
  const result=spawnSync(tool.file,[file,'--formatter','plain','--codes','--ranges','--no-color',
   '--max-cyclomatic-complexity','0','--only','561'],{encoding:'utf8',timeout:10000});
  assert.ifError(result.error);assert.ok([0,1].includes(result.status),result.stdout+result.stderr);
  return parseDiagnostics(result.stdout).map(r=>({...r,file:sourceFile}));
 };
 const errors=text=>reviewResponsibilityComplexity(measure(text),{[sourceFile]:text}).errors.filter(e=>e.file===sourceFile);
 try{
  assert.deepEqual(errors(source),[]);
  const old=errors(beforeSource);
  assert.ok(old.some(e=>e.message.includes('34 exceeds 15')));
  assert.ok(old.some(e=>e.message.includes('19 exceeds 15')));
  const branches=Array.from({length:16},(_,i)=>`if _G.skillProbe==${i} then _G.skillProbe=${i+1} end`).join('\n')+'\n';
  for(const name of ['nonDamageFamily','effectsFamily','committedFamily','intentKindFamily','intentFamily','damageFamily','M.resolve']){
   const signature=new RegExp(`((?:local )?function ${name.replaceAll('.','\\.')}\\([^\\n]*\\)\\n)`);
   assert.ok(signature.test(source),name);
   assert.ok(errors(source.replace(signature,'$1'+branches)).some(e=>e.message.includes('exceeds 15')),name);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
