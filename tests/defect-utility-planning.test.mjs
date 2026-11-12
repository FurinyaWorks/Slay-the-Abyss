import {preDefectActorSource} from './helpers/defect-actor-source-epoch.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runLua} from '../scripts/test-lua.mjs';
import {luaString} from '../scripts/build-lua-data.mjs';
import {runStatic} from '../scripts/check-lua-static.mjs';
import {measureSources} from '../scripts/lua-quality-metrics.mjs';
const file='src/lua/abyss_defect_utility_cards.lua';
const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const before=read('tests/fixtures/defect-utility-planning-before.lua');
function replay(source,fixture='tests/lua/defect_utility_planning.lua'){
 const dir=mkdtempSync(join(tmpdir(),'defect-utility-'));
 try{
  const script=join(dir,'driver.lua');
  writeFileSync(script,`ABYSS_UTILITY_TRACE=true\npackage.preload.abyss_defect_utility_cards=function() return assert(load(${luaString(source)},'utility-planning-source'))() end\ndofile(${luaString(fixture)})\n`);
  return runLua(script,{timeout:120000,maxBuffer:4*1024*1024});
 }finally{rmSync(dir,{recursive:true,force:true});}
}
const pass=r=>assert.equal(r.status,0,r.stdout+r.stderr);
test('utility planner frozen complete source remains authenticated to develop d8a57cae',()=>{
 assert.equal(createHash('sha256').update(before).digest('hex'),'e9372f029db58b62e4fff8f4889826607e8d114dcab2cfa00ca4f124fe29f670');
 assert.equal(preDefectActorSource(file,read(file)).split('-- Orb-derived plans')[0],before.split('-- Pure queue plan.')[0]);
});
test('independent old/new VMs preserve plans, input graphs, validation order, dynamic reads and original errors',()=>{
 const old=replay(before),current=replay(read(file));pass(old);pass(current);
 assert.match(current.stdout,/DEFECT_UTILITY_PLANNING_PASS \d+/);assert.equal(current.stdout,old.stdout);
});
test('the unchanged 52-case combat regression runs against old and current utility implementations',()=>{
 const old=replay(before,'tests/lua/defect_utility_build.lua'),current=replay(read(file),'tests/lua/defect_utility_build.lua');
 pass(old);pass(current);assert.match(current.stdout,/DEFECT_UTILITY_BUILD_PASS 52/);assert.equal(current.stdout,old.stdout);
});
test('every utility function and chunk has a complete CC15 measurement, including all new responsibilities',()=>{
 const source=read(file),diagnostics=runStatic(['--max-cyclomatic-complexity','0','--only','561']).diagnostics.filter(d=>d.file===file);
 const measured=measureSources({[file]:source},diagnostics);assert.deepEqual(measured.errors,[]);
 const rows=measured.modules[0].functions;
 for(const name of ['planOrbEffects','planIntentDebuff','planEnergyEffects','planHistoryAttack','M.planEffect'])assert.equal(rows.filter(f=>f.name===name).length,1,name);
 for(const row of rows)assert(row.complexity<=15,`${row.name}: CC${row.complexity}`);
 assert(measureSources({[file]:source},diagnostics.slice(1)).errors.length>0,'missing measurement must fail');
});
for(const [name,from,to]of [
 ['distinct orb count','if not seen[ball.kind] then','if true then'],
 ['late intent validation','attacking=true\n','attacking=true;break\n'],
 ['X capture fallback','amount==nil or amount==-1','amount==nil or amount==0'],
 ['X free spending','plan.consumeAllEnergy=context.freeToPlayOnce~=true','plan.consumeAllEnergy=true'],
 ['FTL threshold','context.cardsPlayedBefore<effect.threshold','context.cardsPlayedBefore<=effect.threshold'],
 ['FTL queue priority',"plan.bottom[1]=e('damage',effect.value,{normalAmount=effect.normalAmount})","plan.top[#plan.top+1]=e('damage',effect.value,{normalAmount=effect.normalAmount})"],
])test(`differential rejects semantic mutation: ${name}`,()=>{
 const source=read(file);assert.equal(source.split(from).length,2);
 const control=replay(source);pass(control);
 const mutant=replay(source.replace(from,to));
 if(mutant.status!==0)assert.match(mutant.stdout+mutant.stderr,/\[UTILITY_PLAN\]/);
 else assert.notEqual(mutant.stdout,control.stdout,'semantic mutant survived');
});

test('exact single-source inverse preserves frozen history and does not bless drift, fragments, other files or nonstrings',async()=>{
 const {preDefectUtilitySource:inverse,defectUtilitySourceProof:proof}=await import('./helpers/defect-utility-source-inverse.mjs');
 const current=preDefectActorSource(file,read(file));assert.equal(file,proof.path);
 for(const source of [current,current.replaceAll('\n','\r\n')])assert.equal(inverse(file,source),before);
 for(const source of [before,current+'\n',current.slice(1),current+current,null,undefined,{},17])assert.equal(inverse(file,source),source);
 assert.equal(inverse('foreign/'+file,current),current);
});
