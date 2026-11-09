import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {beforeDraftQualityWorkflow as draft,draftQualityWorkflowEdits as edits} from '../../../tests/helpers/draft-quality-workflow.mjs';
import {beforeAutoMergeWorkflow as auto,beforeExecutionTimeoutWorkflow as slack} from '../../../tests/helpers/auto-merge-workflow.mjs';
const w=readFileSync('.github/workflows/quality.yml','utf8');
const base=execFileSync('git',['show','1eb288472d7b33b7450eec97a624ca2ffa526f39:.github/workflows/quality.yml'],{encoding:'utf8'});
const hash=x=>createHash('sha256').update(x).digest('hex');
const cases=[];
function check(name,fn){fn();cases.push({name,result:'pass'});}
check('Projection equals independently read develop Git blob, byte for byte',()=>assert.equal(draft(w),base));
const baselineAuto=auto(w);
check('Every nonempty workflow line changed independently remains rejected or distinct through complete historical chain',()=>{
const lines=w.split('\n'); let n=0;
for(let i=0;i<lines.length;i++){if(!lines[i])continue;const changed=[...lines];changed[i]+=' # independent drift';const m=changed.join('\n');assert.notEqual(draft(m),base,`draft line ${i+1}`);assert.notEqual(auto(m),baselineAuto,`auto line ${i+1}`);n++;}cases.push({probe:'single-line mutations',count:n});});
check('Before-block injection for each reviewed edit cannot erase unrelated drift',()=>{for(const [before] of edits){const m=w+before;assert.notEqual(draft(m),base);assert.notEqual(auto(m),baselineAuto);}});
check('All six reviewed blocks moved out of original locations fail full historical identity',()=>{for(const [,after] of edits){const m=w.replace(after,'')+after;assert.notEqual(draft(m),base);assert.notEqual(auto(m),baselineAuto);}});
check('All per-line mixed EOL variants fail closed or retain exact unrelated EOL drift',()=>{const lines=w.split('\n');for(let i=0;i<lines.length-1;i++){const a=[...lines];a[i]+='\r';const m=a.join('\n');assert.notEqual(draft(m),base);assert.notEqual(auto(m),baselineAuto);}});
check('Old workflow and ancient execution-slack source remain idempotent',()=>{assert.equal(draft(base),base);const ancient=slack(base);assert.equal(slack(ancient),ancient);assert.equal(draft(ancient),ancient);});
const files=['.github/workflows/quality.yml','docs/CI-FAST.md','scripts/ci-impact.mjs','tests/ci-impact.test.mjs','tests/ci-posix-shards.test.mjs','tests/ci-windows-shards.test.mjs','tests/ci-summary-runners.test.mjs','tests/full-quality.test.mjs','tests/helpers/auto-merge-workflow.mjs','tests/helpers/draft-quality-workflow.mjs'];
const result={reviewId:'pr584-independent-draft-history-2026-11-09',reviewedHeadSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),reviewedBaseSha:'1eb288472d7b33b7450eec97a624ca2ffa526f39',scope:'Original PR584 Draft/Fast policy and four-file uncommitted historical-contract repair. Local source review and independent probes only; not remote CI or runtime validation.',conclusion:'pass',unresolved:[],probes:cases,reviewedFiles:Object.fromEntries(files.map(p=>[p,hash(readFileSync(p))])),baseWorkflowSha256:hash(base)};
writeFileSync('.artifacts/pr584/independent-review/review.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(cases,null,2));
