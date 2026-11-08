import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {standaloneSilentTacticsEpoch as sourceEpoch,preSilentTacticsEpoch} from './helpers/combined-epoch/pre-defect-source-epoch.mjs';
import {silentTacticsEpoch} from './helpers/silent-tactics-source-epoch.mjs';
import {copyIntegrationSourceClosure} from './helpers/copy-integration-source-closure.mjs';
const path='src/lua/abyss_silent_tactics_cards.lua',proof=sourceEpoch.proof,prior=preSilentTacticsEpoch.proof;
const raw=p=>proof.current[p]?.source??null;
test('Silent tactics outer epoch preserves every prior binding and exact frozen production byte',()=>{
 assert.equal(silentTacticsEpoch.proof.currentCommit,'07400300eb467ff249ec122e6f28b1d79fae0276');
 assert.equal(raw(path),readFileSync(path,'utf8').replaceAll('\r\n','\n'));
 assert.deepEqual(silentTacticsEpoch.proof.targets.prior.files[path],prior.current[path]);
 assert.deepEqual(proof.targets.silentTacticsPrior.files,prior.current);
 for(const [name,target]of Object.entries(prior.targets))assert.deepEqual(proof.targets[name],target,name);
 for(const [file,binding]of Object.entries(prior.current))if(file!==path)assert.deepEqual(proof.current[file],binding,file);
 assert.deepEqual(proof.owners,[...prior.owners,path]);assert.equal(proof.owners.length,46);
});
test('all advertised historical targets restore Silent tactics from LF and CRLF without rewriting originals',()=>{
 for(const [target,record]of Object.entries(proof.targets)){
  const expected=record.files[path]?.source??raw(path);
  for(const source of [raw(path),raw(path).replaceAll('\n','\r\n')])assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource:raw}),expected,target);
  let reads=0;const original=record.files[path]?.source;
  assert.equal(sourceEpoch.preCombinedSource(path,original,{target,readSource(){reads++;throw Error('unexpected read');}}),original);assert.equal(reads,0);
 }
});
test('current facade retains exact config identity and rechecks all 46 owners after warm success',()=>{
 const file='config/architecture.json',source=raw(file),target='actor';
 let calls=0;assert.equal(sourceEpoch.preCombinedSource(file,source,{target,readSource:p=>{calls++;return raw(p);}}),proof.targets.actor.files[file].source);assert.equal(calls,46);
 for(const owner of proof.owners){
  let bad=false;const readSource=p=>bad&&p===owner?raw(p)+'\n':raw(p);
  sourceEpoch.preCombinedSource(file,source,{target,readSource});bad=true;
  assert.throws(()=>sourceEpoch.preCombinedSource(file,source,{target,readSource}),/linked owner identity/,owner);
  assert.throws(()=>sourceEpoch.preCombinedSource(path,raw(path),{target:'silentTacticsPrior',readSource:p=>p===owner?null:raw(p)}),/linked owner identity/,owner);
 }
});
test('foreign bytes never authorize reads and composed readers preserve explicit raw reader ownership',()=>{
 for(const target of Object.keys(proof.targets))for(const source of [raw(path)+'\n',raw(path).slice(1),null,undefined,{},17]){
  let reads=0;assert.equal(sourceEpoch.preCombinedSource(path,source,{target,readSource(){reads++;throw Error('unexpected read');}}),source);assert.equal(reads,0);
 }
 const reader=sourceEpoch.combinedReader(raw,'silentTacticsPrior');assert.equal(reader(path),prior.current[path].source);
 assert.equal(sourceEpoch.combinedReader(reader,'silentTacticsPrior'),reader);
 const retargeted=sourceEpoch.combinedReader(reader,'actor');assert.equal(retargeted(path),proof.targets.actor.files[path].source);
 assert.throws(()=>sourceEpoch.combinedReader(null,'actor'),/reader/);
});
test('isolated authenticated helper closure retains the exact Silent tactics epoch and rejects owner drift',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'silent-epoch-closure-'));
 try{
  copyIntegrationSourceClosure(directory);
  const isolated=(await import(pathToFileURL(join(directory,'tests/helpers/combined-epoch/pre-defect-source-epoch.mjs')).href)).standaloneSilentTacticsEpoch;
  assert.deepEqual(isolated.proof,proof);
  assert.equal(isolated.preCombinedSource(path,raw(path),{target:'silentTacticsPrior',readSource:raw}),prior.current[path].source);
  assert.throws(()=>isolated.preCombinedSource(path,raw(path),{target:'silentTacticsPrior',readSource:p=>p===path?raw(p)+'\n':raw(p)}),/linked owner identity/);
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('the actual scoped gate rejects the old monolith and each over-limit extracted helper',async()=>{
 const {spawnSync}=await import('node:child_process');
 const {writeFileSync}=await import('node:fs');
 const {requireLuaTool}=await import('../scripts/setup-lua-static.mjs');
 const {parseDiagnostics,reviewResponsibilityComplexity}=await import('../scripts/check-lua-static.mjs');
 const directory=mkdtempSync(join(tmpdir(),'silent-cc-'));
 try{
  const temporary=join(directory,'slice.lua'),tool=requireLuaTool();
  function check(source){
   writeFileSync(temporary,source);
   const measured=spawnSync(tool.file,[temporary,'--formatter','plain','--codes','--ranges','--no-color','--max-cyclomatic-complexity','0','--only','561'],{encoding:'utf8',timeout:10000});
   assert.equal(measured.error,undefined);assert([0,1].includes(measured.status),measured.stderr);
   const rows=parseDiagnostics(measured.stdout).map(row=>({...row,file:path}));
   return reviewResponsibilityComplexity(rows,{[path]:source},{[path]:[]});
  }
  assert.deepEqual(check(raw(path)).errors,[]);
  assert(check(prior.current[path].source).errors.some(e=>e.message.includes("34 exceeds 15: function 'M.planEffect'")));
  for(const name of ['planTargetStatuses','planHandActions','planAttackHits','planEnergyActions']){
   const marker=new RegExp('(local function '+name+'\\([^\\n]+\\)\\n)');
   assert(marker.test(raw(path)));
   const source=raw(path).replace(marker,'$1'+(' if state then end\n'.repeat(16)));
   assert(check(source).errors.some(e=>e.message.includes('exceeds 15')&&e.message.includes(name)),name);
  }
 }finally{rmSync(directory,{recursive:true,force:true});}
});
