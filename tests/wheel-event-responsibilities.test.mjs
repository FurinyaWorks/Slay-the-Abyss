import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const sourceFile='src/lua/abyss_wheel_event.lua';
const beforeFile='tests/fixtures/wheel-event-before.lua';
const sha=s=>createHash('sha256').update(s).digest('hex');
const source=readFileSync(sourceFile,'utf8'),before=readFileSync(beforeFile,'utf8');
function run(source,fixture,output){
 const child=spawnSync(process.execPath,['tests/helpers/wheel-event-vm.mjs'],{
  input:JSON.stringify({source,fixture,output}),encoding:'utf8',timeout:120000,maxBuffer:1024**2});
 assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);return JSON.parse(child.stdout);
}
test('frozen original and current independent VMs preserve complete states and owners on public paths and boundaries',t=>{
 assert.equal(sha(before),'f775746a95c2f33eeb9a5d7c688c536b3dd0b6b3ddefeb3455fbd28468f6bc2c');
 const dir=mkdtempSync(join(tmpdir(),'wheel-proof-'));
 try{
  for(const fixture of ['tests/lua/wheel_event.lua','tests/lua/wheel_event_ui.lua','tests/helpers/wheel-event-boundaries.lua']){
   const oldPath=join(dir,'old.jsonl'),newPath=join(dir,'new.jsonl');
   const old=run(before,fixture,oldPath),current=run(source,fixture,newPath);
   assert.equal(old.status,0,old.error);assert.equal(current.status,0,current.error);
   assert(old.checkpoints>0);assert.deepEqual(current,old);
   const oldGraph=readFileSync(oldPath),newGraph=readFileSync(newPath);
   assert.equal(newGraph.compare(oldGraph),0,fixture);
   t.diagnostic(`graph SHA256 ${sha(newGraph)} (${newGraph.length} bytes)`);
   t.diagnostic(`${fixture}: ${current.checkpoints} complete graphs; ${current.logs.join('; ')}`);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
 assert.equal(readFileSync(sourceFile,'utf8'),source);assert.equal(readFileSync(beforeFile,'utf8'),before);
});
test('real semantic mutants are killed by named boundary assertions in fresh VMs',t=>{
 const dir=mkdtempSync(join(tmpdir(),'wheel-mutants-')),fixture='tests/helpers/wheel-event-mutants.lua',output=join(dir,'trace.jsonl');
 const changes=[
  ['R.randomIntBetween(run.miscRng,0,5)','R.randomIntBetween(run.miscRng,0,4)','rng high'],
  ['event.stage=\'wheel_result\'','R.randomIntBetween(run.miscRng,0,5);event.stage=\'wheel_result\'','one draw'],
  ['if event.outcome==0 then event.goldGained','if event.outcome==1 then event.goldGained','gold preapply'],
  ["if uid~=nil and event.stage~='choose_card' then","if false then",'UID gate'],
  ['run.relicPool=pool;event.relicOffer=offer','event.relicOffer=offer','pool at reveal'],
  ["Run.obtainCard(run,'Decay')","Run.obtainCard(run,'Injury')",'source Decay'],
  ["event.curseBlocked=obtained=='curse_blocked'","event.curseBlocked=false",'Omamori'],
  ['R.float32(R.float32(run.maxHp)*R.float32(.1))','run.maxHp*.1','float32'],
  ["if not damaged then return false,why end","if not damaged then return true,why end",'damage refusal'],
  ["if not eligible then return false,'card_not_purgeable' end",'','remove UID'],
  ["if not ok then return false,id end","if not ok then return true,id end",'relic refusal'],
 ];
 try{
  const baseline=run(source,fixture,output);assert.equal(baseline.status,0,baseline.error);
  for(const [from,to,marker] of changes){
   assert.equal(source.split(from).length,2,from);const mutant=source.replace(from,to);
   const result=run(mutant,fixture,output);assert.notEqual(result.status,0,marker);
   assert(result.error.includes('WHEEL_SEMANTIC '+marker),result.error);t.diagnostic(`killed: ${marker}`);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
 assert.equal(readFileSync(sourceFile,'utf8'),source);
});
