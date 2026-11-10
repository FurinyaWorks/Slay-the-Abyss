import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const root='docs/evidence/m7-colorless-description-ci-20261110';
const labels=process.argv.slice(2);assert(labels.length>0);assert(labels.every(label=>/^[a-z0-9-]+$/.test(label)));
const observations=labels.map(label=>{const receiptPath=`${root}/${label}-receipt.json`,bytes=readFileSync(receiptPath),row=JSON.parse(bytes);assert.equal(row.exitCode,0);assert.equal(row.inputFilesUnchanged,true);assert.equal(row.pass,row.tests);assert(row.tests>0);assert.equal(row.fail+row.cancelled+row.skipped,0);return {...row,receiptPath,receiptSha256:hash(bytes)};});
assert.equal(new Set(observations.map(row=>row.file)).size,observations.length);
const path='scripts/ci-test-timings.json',before=execFileSync('git',['show','ab65ed3b5b4240eb653af4651a13c1b8c72b2e04:'+path],{encoding:'utf8'}),timings=JSON.parse(before);
for(const row of observations){
 const durationMs=Math.ceil(Math.max(row.wallMs,row.nodeReportedDurationMs)),floor=timings.jsPlanning.localLowerBounds[row.file];
 const effective=platform=>Math.max(timings.js[platform][row.file]??timings.unknownJsMs,floor?.durationMs??0);
 if(['linux','win32'].some(platform=>durationMs>effective(platform))){
  assert.equal(floor,undefined,'never rewrite an existing historical floor');
  timings.jsPlanning.localLowerBounds[row.file]={durationMs,environment:'cloud Linux local',kind:'Complete local planning floor; not a hosted measurement or execution permission.',sourceReceipt:row.receiptPath,sourceReceiptSha256:row.receiptSha256};
 }
}
writeFileSync(path,JSON.stringify(timings,null,2)+'\n');
writeFileSync(`${root}/complete-process-observations.json`,JSON.stringify({schemaVersion:1,measurementScope:'Complete serial file processes in an isolated cloud Linux checkout. Not hosted CI, archived behavior replay, or Full execution. Before/after superset input identities are stable within each recorded process; later evidence and timing updates are separate.',observations},null,2)+'\n');
console.log(JSON.stringify({observations:observations.map(row=>({file:row.file,wallMs:row.wallMs,nodeReportedDurationMs:row.nodeReportedDurationMs,tests:row.tests})),addedFloors:Object.fromEntries(Object.entries(timings.jsPlanning.localLowerBounds).filter(([file])=>!Object.hasOwn(JSON.parse(before).jsPlanning.localLowerBounds,file)))}));
