import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {flowPreparationVm} from './helpers/watcher-flow-preparation-vm.mjs';
import {discoverSources} from '../scripts/lua-quality-metrics.mjs';
import {parseDiagnostics,runStatic,reviewResponsibilityComplexity} from '../scripts/check-lua-static.mjs';
import {requireLuaTool} from '../scripts/setup-lua-static.mjs';
const file='src/lua/abyss_watcher_flow_cards.lua',beforeFile='tests/fixtures/watcher-flow-preparation-before.lua';
const before=readFileSync(beforeFile,'utf8'),current=readFileSync(file,'utf8');
test('WatcherFlow preparation preserves complete independent VM graphs, input copies, reuse and exact ordered error bodies',()=>{
 assert.equal(createHash('sha256').update(before).digest('hex'),'019fc60e728ffad81405b24323545b05718f452ae20c756f67fc6f56ce9e0217');
 const old=flowPreparationVm(before),actual=flowPreparationVm(current);
 assert.equal(old.status,0,old.error);assert.equal(actual.status,0,actual.error);
 assert(old.graphs.length>=120);assert.deepEqual(actual,old);
 assert.equal(readFileSync(file,'utf8'),current);assert.equal(readFileSync(beforeFile,'utf8'),before);
});
test('WatcherFlow preparation rejects real semantic regressions at named assertions',t=>{
 const mutants=[
  ['local out=copy(data)','local out=data','empty source unchanged'],
  ["if k=='innate'then c.upgrade.innate=v","if k=='innate'then c.innate=v",'upgrade innate'],
  ["elseif k=='upgradeCost'then c.upgrade.cost=v","elseif k=='upgradeCost'then c.cost=v",'upgrade cost'],
  ["c.color='colorless'","c.color='purple'",'derivative normalization'],
  ["existing.selfRetain==true and existing.exhaust==true","existing.selfRetain==true",'through_violence field exhaust outcome'],
  ["existing.effects[1].value==c.effects[1].value","true",'through_violence effects 1 outcome'],
  ["existing.kind=='buff'","existing.kind~='buff'",'Vigor ABSENT outcome'],
  ["priority=id=='draw_card_next_turn' and 20 or 5","priority=5",'Power priority'],
  ['prepareDerivativeCards(out,ids)\n prepareFlowPowers(out,statuses)','prepareFlowPowers(out,statuses)\n prepareDerivativeCards(out,ids)','derivative before Power error'],
 ];
 for(const [from,to,marker]of mutants){
  assert.equal(current.split(from).length,2,from);
  const result=flowPreparationVm(current.replace(from,to));assert.notEqual(result.status,0,marker);
  assert(result.error.includes('FLOW_PREPARATION_SEMANTIC '+marker),result.error);t.diagnostic('killed: '+marker);
 }
});
test('WatcherFlow entry and every preparation helper have live CC15 protection, with the original CC32 rejected',()=>{
 const sources=discoverSources(),diagnostics=runStatic(['--max-cyclomatic-complexity','0','--only','561']).diagnostics;
 const reviewed=reviewResponsibilityComplexity(diagnostics,sources);
 assert.deepEqual(reviewed.errors,[]);
 const scoped=reviewed.functions.filter(row=>row.file===file);
 assert.equal(scoped.length,13);assert(scoped.every(row=>row.complexity<=15));
 // Initial check uses the real default policy over every source. Synthetic
 // missing/excess measurements then exercise exactly its thirteen bound subjects.
 const roots={[file]:scoped.map(row=>row.subject)},localSources={[file]:sources[file]};
 const localDiagnostics=diagnostics.filter(row=>row.file===file);
 const result=spawnSync(requireLuaTool().file,[beforeFile,'--formatter','plain','--codes','--ranges','--no-color','--max-cyclomatic-complexity','0','--only','561'],{encoding:'utf8',timeout:30000});
 assert.equal(result.error,undefined);assert.equal(result.status,1,result.stderr);
 const original=parseDiagnostics(result.stdout).map(row=>({...row,file}));
 const rejected=reviewResponsibilityComplexity(original,{[file]:before},roots);
 assert(rejected.errors.some(row=>row.file===file && row.message.includes('complexity 32 exceeds 15')));
 for(const row of scoped){
  const missing=localDiagnostics.filter(d=>d.line!==row.line);
  assert(reviewResponsibilityComplexity(missing,localSources,roots).errors.some(e=>e.file===file));
  const excess=localDiagnostics.map(d=>d.line===row.line?{...d,message:d.message.replace(/\(\d+ > 0\)/,'(16 > 0)')}:d);
  assert(reviewResponsibilityComplexity(excess,localSources,roots).errors.some(e=>e.file===file&&e.message.includes('complexity 16 exceeds 15')));
 }
});
