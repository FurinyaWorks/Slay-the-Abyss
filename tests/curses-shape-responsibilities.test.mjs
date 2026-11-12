import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {requireLuaTool} from '../scripts/setup-lua-static.mjs';
import {parseDiagnostics} from '../scripts/check-lua-static.mjs';
import {measureSources} from '../scripts/lua-quality-metrics.mjs';
const before='tests/fixtures/curses-shape-before.lua',current='src/lua/abyss_curses.lua';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const cli=createRequire(import.meta.url).resolve('fengari-node-cli/src/lua-cli.js');
function replay(source,caseName){
 const result=spawnSync(process.execPath,[cli,'-e',`arg={[1]=${JSON.stringify(source)},[2]=${caseName===undefined?"nil":JSON.stringify(caseName)}};dofile('tests/helpers/curses-shape-differential.lua')`],{encoding:'utf8',timeout:30000,maxBuffer:16*1024*1024});
 assert.equal(result.status,0,result.stderr);assert.equal(result.stderr,'');assert.match(result.stdout,/CURSES_SHAPE_CASES \d+/);return result.stdout;
}
// Reuse only this invocation's fresh original trace across the two assertions.
// No source result is persisted or reused by another process.
let originalTrace;
function originalReplay(){return originalTrace??=replay(before);}
function compare(a,b){
 const aa=a.trim().split('\n'),bb=b.trim().split('\n');assert.equal(aa.length,bb.length);
 for(let i=0;i<aa.length;i++)assert.equal(bb[i],aa[i],`behavior/state/trace mismatch at ${aa[i].split('\t').slice(0,2).join(' ')}`);
}
function measure(path){
 const tool=requireLuaTool(),result=spawnSync(tool.file,[path,'--formatter','plain','--codes','--ranges','--no-color','--max-cyclomatic-complexity','0','--only','561'],{encoding:'utf8',timeout:10000});
 assert([0,1].includes(result.status),result.stdout+result.stderr);assert.equal(result.stderr,'');
 const measured=measureSources({[path]:readFileSync(path,'utf8')},parseDiagnostics(result.stdout));assert.deepEqual(measured.errors,[]);return measured.modules[0];
}
test('immutable full Curses source preserves eligibility returns aliases faults and dynamic dependency trace in separate VMs',t=>{
 assert.equal(sha(readFileSync(before)),'942e7c65da29875fefbff132182ce7a7aab16afb4405e28d2a71e31d589a44b7');
 const baseline=originalReplay(),candidate=replay(current);compare(baseline,candidate);
 t.diagnostic(baseline.trim().split('\n').at(-1));
});
test('all Curses functions including extracted responsibilities and nested callbacks are measured at CC15',()=>{
 assert.equal(measure(before).functions.find(fn=>fn.name==='M.isImplemented').complexity,27);
 for(const fn of measure(current).functions)assert(fn.complexity<=15,`${fn.name} CC${fn.complexity} exceeds 15`);
});

test('semantic validation regressions are killed by the immutable full-source oracle',t=>{
 const source=readFileSync(current,'utf8'),reference=originalReplay(),dir=mkdtempSync(join(tmpdir(),'curses-shape-mutants-'));
 const mutants=[
  ['unknown-id',"ids[card.id]==true",'true','short-id-no-type'],
  ['nonempty-effects',"next(card.effects)==nil",'true','effects-real-entry'],
  ['false-upgrade',"card.upgrade==nil",'not card.upgrade','injury-upgrade-2'],
  ['clumsy-trait',"(card.ethereal==true)==(card.id=='clumsy')",'true','clumsy-ethereal-2'],
  ['writhe-trait',"(card.innate==true)==(card.id=='writhe')",'true','writhe-innate-2'],
  ['decay-damage',"card.endTurnDamage==2",'card.endTurnDamage==3','valid-decay'],
  ['shame-status',"card.endTurnStatusAmount==1",'card.endTurnStatusAmount==2','valid-shame'],
  ['pain-loss',"card.onOtherCardHpLoss==1",'card.onOtherCardHpLoss==2','valid-pain'],
  ['normality-limit',"card.playLimit==3",'card.playLimit==4','valid-normality'],
  ['parasite-loss',"card.onRemoveMaxHpLoss==3",'card.onRemoveMaxHpLoss==2','valid-parasite'],
  ['traits-before-shape','return commonShape(card) and curseTraits(card)','return curseTraits(card) and commonShape(card)','short-shape-no-traits'],
  ['collapse-delegate-returns',"return require('abyss_necronomicurse').supported(card)","return (require('abyss_necronomicurse').supported(card))",'necro-multi'],
 ];
 const selected=(text,name)=>{const row=text.split('\n').find(line=>line.split('\t')[1]===name);assert(row,'missing mutation case '+name);return row;};
 const parse=createRequire(import.meta.url)('luaparse').parse;
 try{for(const [name,from,to,caseName]of mutants){
  assert.equal(source.split(from).length,2,'exact unique mutation target '+name);
  const mutated=source.replace(from,to);parse(mutated,{luaVersion:'5.3'});
  const file=join(dir,name+'.lua');writeFileSync(file,mutated);
  assert.throws(()=>compare(selected(reference,caseName),selected(replay(file,caseName),caseName)),/behavior\/state\/trace mismatch/,name);
  t.diagnostic(name+' killed by '+caseName);
 }}finally{rmSync(dir,{recursive:true,force:true});}
});
