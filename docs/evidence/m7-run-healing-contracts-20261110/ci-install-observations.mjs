import {readFileSync as read,writeFileSync as write} from 'node:fs';
import {createHash} from 'node:crypto';
const root='docs/evidence/m7-run-healing-contracts-20261110',hash=b=>createHash('sha256').update(b).digest('hex');
const labels=['ci-owner','ci-source','ci-defect','ci-silent-stable','ci-seven','ci-formation','ci-complete','ci-host-final','ci-runtime','ci-windows-final'];
const unstable=JSON.parse(read(`${root}/ci-silent-receipt.json`));
const observations=labels.map(label=>JSON.parse(read(`${root}/${label}-receipt.json`)));
const timings=JSON.parse(read('scripts/ci-test-timings.json'));
for(const row of observations){
 if(row.exitCode!==0||!row.inputFilesUnchanged||row.tests!==row.pass||row.fail+row.cancelled+row.skipped!==0)throw Error('Incomplete '+row.file);
 const prior=timings.jsPlanning.localLowerBounds[row.file];const durationMs=Math.ceil(Math.max(row.wallMs,row.nodeReportedDurationMs,prior?.durationMs??0,unstable.file===row.file?unstable.wallMs:0));
 if(prior&&prior.durationMs>=durationMs)continue;
 timings.jsPlanning.localLowerBounds[row.file]={durationMs,environment:'cloud Linux local',kind:'Local complete-run planning floor only; not a hosted measurement, execution permission or timeout change.',tests:row.tests,coverage:`${row.tests}/${row.tests} complete file passed; 0 failed, cancelled or skipped.`,nodeReportedDurationMs:row.nodeReportedDurationMs,wallMs:row.wallMs,sourceLog:row.logPath,sourceLogSha256:row.logSha256,sourceLogUncompressedSha256:row.logUncompressedSha256,testSha256:row.testSha256,inputReceipt:row.inputPath,inputReceiptSha256:row.inputSha256,sourceReceipt:`${root}/${row.label}-receipt.json`,sourceReceiptSha256:hash(read(`${root}/${row.label}-receipt.json`)),measurementScope:'Complete local run; independent narrow validation may have been active. Conservative planning cost, not an isolated or hosted benchmark.'};
}
write('scripts/ci-test-timings.json',JSON.stringify(timings,null,2)+'\n');
write(`${root}/ci-complete-process-observations.json`,JSON.stringify({schemaVersion:1,scope:'Ten complete local file processes; not Full or hosted CI. Historical fixtures unchanged. Raw byte receipts preserve actual Linux execution; LF-normalized fields identify text across Windows checkouts. The unstable sparse-checkout observation is retained separately and is not promoted as final validation.',observations,unstableObservations:[JSON.parse(read(`${root}/ci-silent-receipt.json`))]},null,2)+'\n');
