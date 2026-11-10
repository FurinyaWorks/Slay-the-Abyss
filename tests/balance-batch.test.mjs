import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {seedBatches,summarizeEvidence,aggregateRows} from '../scripts/balance-batch.mjs';

test('seed ranges are bounded and chunked to the existing driver limit',()=>{
 assert.deepEqual(seedBatches(42,21),[Array.from({length:20},(_,i)=>42+i),[62]]);
 for(const args of [[-1,1],[1,0],[0,201],[2147483647,2],[0,1.5]]) assert.throws(()=>seedBatches(...args));
});
const fixture=(seed,status='victory')=>({seed,status,platformVerified:false,newRunConstructionResetVerified:true,
 final:{floor:10,hp:24},rooms:[{},{}],actions:[
 {label:'play',ok:true,before:{hp:76},after:{hp:76}},
 {label:'end_turn',ok:true,before:{hp:76},after:{hp:60}},
 {label:'card_reward',ok:true,details:{index:1},before:{hp:60},after:{hp:66}},
 ]});
test('offline run metrics track actual play, damage, healing',()=>{
 const r=summarizeEvidence(fixture(42));
 assert.equal(r.played,1);assert.equal(r.cardPicks,1);assert.equal(r.hpLost,16);assert.equal(r.healed,6);
 assert.equal(r.status,'victory');
});
test('do not pass corrupted or platform-claimed evidence',()=>{
 const raw=fixture(43);raw.platformVerified=true;assert.throws(()=>summarizeEvidence(raw),/untrusted/);
 const malformed=fixture(44);malformed.newRunConstructionResetVerified=false;assert.throws(()=>summarizeEvidence(malformed));
});
test('skipped and failed card rewards are not recorded as picked cards',()=>{
 const evidence=fixture(45);
 const reward=evidence.actions[2];
 evidence.actions=[{...reward,details:{index:0}}, {...reward,ok:false}, reward];
 assert.equal(summarizeEvidence(evidence).cardPicks,1);
});
test('missing and nonfinite report metrics fail instead of disappearing from JSON',()=>{
 for(const final of [{},{floor:10},{floor:10,hp:NaN},{floor:Infinity,hp:24}])
  assert.throws(()=>summarizeEvidence({...fixture(46),final}),/untrusted/);
 for(const action of [null,{}, {label:'play',ok:true,before:{},after:{hp:24}},
  {label:'card_reward',ok:true,details:{index:-1},before:{hp:24},after:{hp:24}}])
  assert.throws(()=>summarizeEvidence({...fixture(47),actions:[action]}),/untrusted/);
});
test('losses are evidence and driver blockers fail a mechanical gate',()=>{
 const win=summarizeEvidence(fixture(1));const loss=summarizeEvidence(fixture(2,'defeat'));
 const blocked=summarizeEvidence({...fixture(3,'driver_blocked'),reason:'invalid card'});
 const result=aggregateRows([win,loss,blocked]);
 assert.equal(result.samples,3);assert.equal(result.observedWinRate,1/3);
 assert.equal(result.blocked,1);assert.equal(result.blockedSeeds[0].seed,3);
 assert.equal(result.gameBalanceApproved,false);
 assert.throws(()=>aggregateRows([win,win]),/duplicate seeds/);
});

test('batch runner uses existing driver and writes a verified report (isolated fake driver)',()=>{
 const d=mkdtempSync(join(tmpdir(),'balance-batch-'));
 try {
  mkdirSync(join(d,'scripts'),{recursive:true});
  const mock=`import fs from 'node:fs';import path from 'node:path';import z from 'node:zlib';
const out=process.env.M3_EVIDENCE_DIR; fs.mkdirSync(out,{recursive:true});const source=process.env.BALANCE_TEST_SOURCE??'a'.repeat(40);
const runs=process.argv.slice(2).map(s=>{const seed=Number(s);const artifact='seed-'+seed+'.json.gz';
const evidence={seed,status:seed%2?'defeat':'victory',reason:null,platformVerified:false,newRunConstructionResetVerified:true,sourceCommit:source,final:{floor:10,hp:seed%2?0:25},rooms:[],actions:[{label:'play',ok:true,before:{hp:76},after:{hp:70}}]};
fs.writeFileSync(path.join(out,artifact),z.gzipSync(JSON.stringify(evidence)));
return {seed,status:evidence.status,artifact}});fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({runs,platformVerified:false,sourceCommit:source}));`;
  writeFileSync(join(d,'scripts','m3-normal-campaign.mjs'),mock);
  writeFileSync(join(d,'package.json'),' { "type": "module" } ');
  const out=spawnSync(process.execPath,[resolve('scripts/balance-batch.mjs'),'42','3'],{cwd:d,encoding:'utf8',timeout:15000});
  assert.equal(out.status,0,out.stderr||out.stdout);
  const report=JSON.parse(readFileSync(join(d,'build','balance-batch','report.json'),'utf8'));
  assert.equal(report.summary.samples,3);assert.equal(report.summary.victory,2);assert.equal(report.summary.defeat,1);
  assert.equal(report.summary.medianHpLost,6);assert.equal(report.sourceCommit,'a'.repeat(40));
  for(const invalidSource of ['aaa','g'.repeat(40),'']){
   const invalid=spawnSync(process.execPath,[resolve('scripts/balance-batch.mjs'),'42','1'],{cwd:d,encoding:'utf8',timeout:15000,
    env:{...process.env,BALANCE_TEST_SOURCE:invalidSource}});
   assert.notEqual(invalid.status,0);assert.match(invalid.stderr,/invalid source identity/);
  }
 } finally {rmSync(d,{recursive:true,force:true});}
});
