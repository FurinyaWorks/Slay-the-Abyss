import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import * as epochs from './helpers/combined-epoch/source-epoch.mjs';
import {parseDiagnostics,reviewResponsibilityComplexity} from '../scripts/check-lua-static.mjs';
import {requireLuaTool} from '../scripts/setup-lua-static.mjs';
const path='src/lua/abyss_curses.lua',epoch=epochs.sourceEpoch;
const before='942e7c65da29875fefbff132182ce7a7aab16afb4405e28d2a71e31d589a44b7';
const after='65d912f1d2dbd5245bb4734103c762eb9667c5161c33e4c850062e35572c3642';
const hash=s=>createHash('sha256').update(s).digest('hex');
const raw=p=>epoch.proof.current[p]?.source??null;

test('Curses current identity extends the frozen joint epoch without replacing any historical source',()=>{
 assert.equal(epoch.proof.current[path].sha256,after);
 const prior=epochs.preCursesEpoch;
 assert.equal(prior.proof.current[path].sha256,before);
 assert.equal(hash(readFileSync(path)),after);
 assert.equal(hash(readFileSync('tests/fixtures/curses-shape-before.lua')),before);
 assert.equal(epoch.proof.currentTreeCommitted,false);
 assert.equal(epoch.proof.cursesSourceSliceCommit,'a769c0610d72a2dcf0631690dd6bb6c3ab8b21c6');
 assert.deepEqual(Object.keys(epoch.proof.current),Object.keys(prior.proof.current));
 for(const p of Object.keys(prior.proof.current))if(p!==path)assert.strictEqual(epoch.proof.current[p],prior.proof.current[p],p);
 for(const [name,target]of Object.entries(prior.proof.targets))assert.strictEqual(epoch.proof.targets[name],target,name);
 assert.strictEqual(epoch.proof.targets.cursesPrior.files,prior.proof.current);
 assert.deepEqual(epoch.proof.owners,[...prior.proof.owners,path]);
});

test('full Curses source projects through LF CRLF and every complete inherited target using fresh raw owners',()=>{
 for(const [target,binding]of Object.entries(epoch.proof.targets)){
  assert.deepEqual(Object.keys(binding.files).sort(),Object.keys(epoch.proof.current).sort());
  for(const source of [raw(path),raw(path).replaceAll('\n','\r\n')]){
   const reads=[];
   assert.equal(epoch.preCombinedSource(path,source,{target,readSource:p=>{reads.push(p);return raw(p);}}),binding.files[path].source,target);
   assert.deepEqual(reads,epoch.proof.owners,'complete fresh closure for '+target);
  }
 }
});

test('Curses and an inherited projection reject every warmed owner drift deletion and reader failure',()=>{
 const probes=[[path,'cursesPrior'],['config/architecture.json','jointUiPrior']];
 for(const [p,target]of probes)for(const owner of epoch.proof.owners){
  let mode='valid';const reader=q=>{
   if(q!==owner)return raw(q);
   if(mode==='throw')throw Error('owner removed');
   return mode==='drift'?raw(q)+'\n':mode==='missing'?null:raw(q);
  };
  assert.equal(epoch.preCombinedSource(p,raw(p),{target,readSource:reader}),epoch.proof.targets[target].files[p].source);
  for(mode of ['drift','missing','throw'])assert.throws(()=>epoch.preCombinedSource(p,raw(p),{target,readSource:reader}),/linked owner (identity|missing)/,p+' '+owner+' '+mode);
 }
 const reader=epoch.combinedReader(raw,'cursesPrior');
 assert.equal(epoch.readerTarget(reader),'cursesPrior');assert.strictEqual(epoch.combinedReader(reader,'cursesPrior'),reader);
 assert.equal(reader(path),epochs.preCursesEpoch.proof.current[path].source);
 const retargeted=epoch.combinedReader(reader,'develop');assert.equal(epoch.readerTarget(retargeted),'develop');
 assert.equal(retargeted(path),epoch.proof.targets.develop.files[path].source);
});

test('foreign original and unchanged inputs cannot authorize a Curses source projection',()=>{
 for(const source of [raw(path)+'\n',readFileSync('tests/fixtures/curses-shape-before.lua','utf8'),null,{},17]){
  let reads=0;assert.equal(epoch.preCombinedSource(path,source,{target:'cursesPrior',readSource(){reads++;throw Error('foreign');}}),source);assert.equal(reads,0);
 }
 const p=Object.keys(epoch.proof.current).find(p=>p!==path&&epoch.proof.current[p]?.sha256===epoch.proof.targets.cursesPrior.files[p]?.sha256);
 let reads=0;assert.equal(epoch.preCombinedSource(p,raw(p),{target:'cursesPrior',readSource(){reads++;throw Error('unchanged');}}),raw(p));assert.equal(reads,0);
});

test('shared responsibility gate governs all Curses functions chunks callbacks and mandatory entry',()=>{
 const dir=mkdtempSync(join(tmpdir(),'curses-shared-gate-')),file=join(dir,'curses.lua'),tool=requireLuaTool();
 function review(source,omit=false){
  writeFileSync(file,source);
  const r=spawnSync(tool.file,[file,'--formatter','plain','--codes','--ranges','--no-color','--max-cyclomatic-complexity','0','--only','561'],{encoding:'utf8',timeout:10000});
  assert([0,1].includes(r.status),r.stdout+r.stderr);assert.equal(r.stderr,'');
  const diagnostics=parseDiagnostics(r.stdout).map(row=>({...row,file:path}));if(omit)diagnostics.pop();
  const report=reviewResponsibilityComplexity(diagnostics,{[path]:source});
  return {...report,errors:report.errors.filter(row=>row.file===path)};
 }
 try{
  const source=readFileSync(path,'utf8'),ok=review(source);
  assert(ok.modules.includes(path),'production gate must include Curses');assert.deepEqual(ok.errors,[]);
  for(const subject of ["main chunk","function 'M.isImplemented'","function 'commonShape'","function 'curseTraits'"])assert(ok.functions.some(f=>f.subject===subject),subject);
  assert(review(readFileSync('tests/fixtures/curses-shape-before.lua','utf8')).errors.some(e=>e.message.includes('27 exceeds 15')));
  const branches=Array.from({length:16},(_,i)=>`if x==${i} then x=x+1 end`).join('\n');
  for(const extra of [`local x=0\n${branches}`,`local function hidden(x)\n${branches}\nend`,`local function outer() return function(x)\n${branches}\nend end`]){
   assert(review(source.replace('return M',extra+'\nreturn M')).errors.some(e=>e.message.includes('exceeds 15')),'all scopes governed');
  }
  assert(review(source,true).errors.some(e=>e.message.includes('Incomplete')));
  assert(review(source.replace('function M.isImplemented','function M.notTheEntry')).errors.some(e=>e.message.includes('Required responsibility entry missing')));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
