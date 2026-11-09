import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {preparationVm} from './helpers/warrior-status-preparation-vm.mjs';
import {discoverSources} from '../scripts/lua-quality-metrics.mjs';
import {parseDiagnostics,runStatic,reviewResponsibilityComplexity} from '../scripts/check-lua-static.mjs';
import {requireLuaTool} from '../scripts/setup-lua-static.mjs';
const file='src/lua/abyss_warrior_status_cards.lua',beforeFile='tests/fixtures/warrior-status-before.lua';
const sha=source=>createHash('sha256').update(source).digest('hex');
const before=readFileSync(beforeFile,'utf8'),current=readFileSync(file,'utf8');
test('WarriorStatus preparation preserves independent full graph traces, detached copies, aliases and ordered failures',()=>{
 assert.equal(sha(before),'554181c678d5387ca7de54095db78a37225c04acc23878bce0392d21acc33a63');
 const old=preparationVm(before),actual=preparationVm(current);
 assert.equal(old.status,0,old.error);assert.equal(actual.status,0,actual.error);
 assert.equal(old.graphs.length,68);assert.deepEqual(actual,old);
 assert.equal(readFileSync(file,'utf8'),current);assert.equal(readFileSync(beforeFile,'utf8'),before);
});
test('WarriorStatus preparation detects real semantic regressions at named assertions',t=>{
 const mutants=[
  ['local out=copy(data)','local out=data','empty source unchanged'],
  ["d.color='red';d.experimental=true","d.color='red';d.experimental=false",'native normalization'],
  ['out.cards.cards[i]=replacement','out.cards.cards[#out.cards.cards+1]=replacement','Burn normalization'],
  ['out.experimentalWarriorStatus=true;return out','out.experimentalWarriorStatus=false;return out','final marker'],
  ["existing.burnDamage==nil and existing.endTurnDamage==2","existing.burnDamage==nil and existing.endTurnDamage==3",'legacy Burn outcome'],
  ["prepareNativeCards(out,ids)\n prepareStatusCards(out,ids)\n preparePowers(out)","preparePowers(out)\n prepareStatusCards(out,ids)\n prepareNativeCards(out,ids)",'definition order'],
 ];
 for(const [from,to,marker] of mutants){
  assert.equal(current.split(from).length,2,from);
  const result=preparationVm(current.replace(from,to));
  assert.notEqual(result.status,0,marker);assert(result.error.includes('STATUS_SEMANTIC '+marker),result.error);
  t.diagnostic(`killed: ${marker}`);
 }
 assert.equal(readFileSync(file,'utf8'),current);
});
test('WarriorStatus entry and every preparation helper have live CC15 protection, with the original CC36 rejected',()=>{
 const sources=discoverSources(),diagnostics=runStatic(['--max-cyclomatic-complexity','0','--only','561']).diagnostics;
 const reviewed=reviewResponsibilityComplexity(diagnostics,sources);
 assert.deepEqual(reviewed.errors,[]);
 const scoped=reviewed.functions.filter(row=>row.file===file);
 assert.equal(scoped.length,8);assert(scoped.every(row=>row.complexity<=15));
 // Initial check uses the real default policy over every source. Synthetic
 // missing/excess measurements then exercise exactly its eight bound subjects.
 const roots={[file]:scoped.map(row=>row.subject)},localSources={[file]:sources[file]};
 const localDiagnostics=diagnostics.filter(row=>row.file===file);
 const result=spawnSync(requireLuaTool().file,[beforeFile,'--formatter','plain','--codes','--ranges','--no-color','--max-cyclomatic-complexity','0','--only','561'],{encoding:'utf8',timeout:30000});
 assert.equal(result.error,undefined);assert.equal(result.status,1,result.stderr);
 const original=parseDiagnostics(result.stdout).map(row=>({...row,file}));
 const rejected=reviewResponsibilityComplexity(original,{[file]:before},roots);
 assert(rejected.errors.some(row=>row.file===file && row.message.includes('complexity 36 exceeds 15')));
 for(const row of scoped){
  const missing=localDiagnostics.filter(d=>d.line!==row.line);
  assert(reviewResponsibilityComplexity(missing,localSources,roots).errors.some(e=>e.file===file));
  const excess=localDiagnostics.map(d=>d.line===row.line?{...d,message:d.message.replace(/\(\d+ > 0\)/,'(16 > 0)')}:d);
  assert(reviewResponsibilityComplexity(excess,localSources,roots).errors.some(e=>e.file===file&&e.message.includes('complexity 16 exceeds 15')));
 }
});
