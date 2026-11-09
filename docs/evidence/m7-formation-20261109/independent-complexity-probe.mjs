// Independent targeted review, no shared build report and no Full execution.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {requireLuaTool} from '../../../scripts/setup-lua-static.mjs';
import {parseDiagnostics,reviewResponsibilityComplexity} from '../../../scripts/check-lua-static.mjs';
const file='src/lua/abyss_encounter_formation.lua',oldFile='tests/fixtures/encounter-formation-before.lua';
const source=readFileSync(file,'utf8'),before=readFileSync(oldFile,'utf8');
const hash=s=>createHash('sha256').update(s).digest('hex');
const frozen=spawnSync('git',['show','fb04fd36:src/lua/abyss_encounter_formation.lua'],{encoding:'utf8'});
assert.equal(frozen.status,0);assert.equal(before,frozen.stdout,'fixture must equal full historical source');
const directory=mkdtempSync(join(tmpdir(),'formation-independent-review-')),tool=requireLuaTool();
const version=spawnSync(tool.file,['--version'],{encoding:'utf8'});assert.equal(version.status,0);assert(version.stdout.startsWith('Luacheck: 1.2.0'));
const measure=text=>{
 const path=join(directory,'formation.lua');writeFileSync(path,text);
 const run=spawnSync(tool.file,[path,'--formatter','plain','--codes','--ranges','--no-color','--max-cyclomatic-complexity','0','--only','561'],{encoding:'utf8',timeout:10000});
 assert([0,1].includes(run.status),run.stdout+run.stderr);assert.equal(run.stderr,'');
 return parseDiagnostics(run.stdout).map(row=>({...row,file}));
};
const review=(text,rows)=>{const report=reviewResponsibilityComplexity(rows,{[file]:text});return {...report,errors:report.errors.filter(e=>e.file===file)};};
const branches=Array.from({length:16},()=>`if _G.independentProbe then _G.independentProbe=nil end`).join('\n');
try{
 const measured=measure(source),current=review(source,measured),old=review(before,measure(before));
 assert.deepEqual(current.errors,[]);assert.equal(current.functions.length,15);
 assert(old.errors.some(e=>e.message.includes("31 exceeds 15: function 'M.assemble'")));
 const names=['M.assemble','boolean','integer','make','louse','weak','humanoid','strongWildlife','offset',
  'fixedFormation','shapeFormation','gremlinFormation','slimeFormation','louseFormation','mixedFormation'];
 for(const name of names){
  const marker=new RegExp(`function ${name.replaceAll('.','\\.')}\\([^)]*\\)`);
  assert(marker.test(source),name);const mutant=source.replace(marker,m=>`${m}\n${branches}\n`);
  assert(review(mutant,measure(mutant)).errors.some(e=>e.message.includes(`exceeds 15: function '${name}'`)),name);
 }
 const nested=source.replace(' local result={}',' local result={}\n local nested=function()\n'+branches+'\n end\n nested()');
 assert(review(nested,measure(nested)).errors.some(e=>e.message.includes('17 exceeds 15: function')),'anonymous nested root span');
 for(let i=0;i<measured.length;i++){
  const missing=measured.filter((_,n)=>n!==i);assert(review(source,missing).errors.length,'missing '+i);
  const shifted=structuredClone(measured);shifted[i].column+=1;assert(review(source,shifted).errors.length,'shifted '+i);
  const duplicate=[...measured,measured[i]];assert(review(source,duplicate).errors.length,'duplicate '+i);
 }
 const unknown=structuredClone(measured);unknown[2].message='unknown measurement';assert(review(source,unknown).errors.length);
 assert(review(source,measured.filter(r=>!r.message.includes("function 'M.assemble'"))).errors.some(e=>e.message.includes('Required responsibility entry missing')));
 assert(reviewResponsibilityComplexity([],{}).errors.some(e=>e.file===file&&e.message.includes('Required responsibility module missing')));
 console.log('PASS exact fixture identity; pinned Luacheck 1.2.0; old assemble CC31 rejected; all 15 scoped functions and anonymous nested CC regressions rejected; missing/duplicate/misaligned diagnostics fail closed');
 console.log(JSON.stringify({sourceSha256:hash(source),fixtureSha256:hash(before),gateSha256:hash(readFileSync('scripts/check-lua-static.mjs')),functions:current.functions},null,2));
 const boundaryProbe='docs/evidence/m7-formation-20261109/independent-boundary-probe.lua';
 const variants={
  cacheConstructor:source.replace(' local misc=boundary.misc',' local cachedConstruct=boundary.construct\n local misc=boundary.misc').replace('local actor=boundary.construct(id,x,y)','local actor=cachedConstruct(id,x,y)'),
  cloneSelected:source.replace(' return result\nend\nreturn M',` for i,a in ipairs(result) do local c={} for k,v in pairs(a)do c[k]=v end result[i]=c end\n return result\nend\nreturn M`),
  truncateEager:source.replace("  candidates[3]=make('acid_slime_m',x,y)","  candidates[3]=candidates[2]"),
 };
 for(const [name,mutant]of Object.entries(variants)){
  assert.notEqual(mutant,source);const path=join(directory,name+'.lua');writeFileSync(path,mutant);
  const run=spawnSync('node_modules/.bin/fengari',[boundaryProbe,path],{encoding:'utf8',timeout:20000});
  // Fengari can report a Lua exception with status 0; require the full success markers for any pass.
  assert(!run.stdout.includes('PASS independent reentrancy:'),'survived '+name);
  assert.match(run.stdout+run.stderr,/dynamic capability trace|selected actor cloned|mismatch|unexpected boundary failure/,'inconclusive '+name);
  console.log('KILL independent boundary mutant: '+name);
 }
}finally{rmSync(directory,{recursive:true,force:true});}
