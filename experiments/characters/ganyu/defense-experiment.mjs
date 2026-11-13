import { replayInputs } from './replay-inputs.mjs';
import { writeFileSync } from 'node:fs';import { gzipSync } from 'node:zlib';import { trial } from './accessibility.mjs';
const cases=[{label:'baseline',extraDrawCards:0,extraDefDrawCards:0},{label:'pure-draw',extraDrawCards:1,extraDefDrawCards:0},{label:'defensive-draw',extraDrawCards:0,extraDefDrawCards:1}];
const rows=[];
for(const size of [20,40])for(const intent of [8,14])for(const policy of ['defend_bank','immediate'])for(const c of cases)for(const seed of [...Array.from({length:25},(_,i)=>i+1),...Array.from({length:25},(_,i)=>1001+i)])rows.push({...trial({size,intent,policy,...c,seed}),case:c.label});
const groups=[];
for(const size of [20,40])for(const intent of [8,14])for(const policy of ['defend_bank','immediate'])for(const c of cases)for(const cohort of ['exploratory','holdout']) {
 const rs=rows.filter(r=>r.size===size&&r.intent===intent&&r.policy===policy&&r.case===c.label&&(cohort==='holdout'?r.seed>=1001:r.seed<1001));
 const losses=rs.map(r=>r.damageLost).sort((a,b)=>a-b);
 groups.push({size,intent,policy,case:c.label,cohort,n:rs.length,wins:rs.filter(r=>r.outcome==='won').length,deaths:rs.filter(r=>r.outcome==='lost').length,truncated:rs.filter(r=>r.outcome==='truncated').length,neverSawCore:rs.filter(r=>r.firstSeen===null).length,neverCharged:rs.filter(r=>r.firstCharged===null).length,lossP50:losses[12],lossP90:losses[22],coreUnpayable:rs.reduce((n,r)=>n+r.coreUnpayable,0)});
}
const report={inputs:replayInputs('defense-experiment.mjs'),version:'ganyu-defense-draw-0.4',hypothesis:'block+draw trades slower cycling for less lost defense than pure draw',notBalanceApproval:true,comparison:'manually add one reward candidate; deck +1, not natural rewards; policy prioritizes defense, so compare both policies and do not generalize',maxTurns:30,samples:rows.length,groups,rows};
writeFileSync(new URL('./defense-experiment-results.json.gz',import.meta.url),gzipSync(JSON.stringify(report,null,2)+'\n'));
console.log(JSON.stringify(groups,null,2));
