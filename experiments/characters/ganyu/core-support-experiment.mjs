import { writeFileSync } from 'node:fs';import { gzipSync } from 'node:zlib';import { trial } from './accessibility.mjs';import { replayInputs } from './replay-inputs.mjs';
const cases=[{label:'baseline'},{label:'guard-charge',extraGuardChargeCards:1},{label:'seek',extraSeekCards:1},{label:'both',extraGuardChargeCards:1,extraSeekCards:1}];
const rows=[];
for(const size of [20,40])for(const intent of [8,14])for(const policy of ['defend_bank','immediate'])for(const c of cases)for(let seed=1001;seed<=1025;seed++)rows.push({...trial({size,intent,policy,...c,seed}),case:c.label});
const groups=[];
for(const size of [20,40])for(const intent of [8,14])for(const policy of ['defend_bank','immediate'])for(const c of cases) {
 const rs=rows.filter(r=>r.size===size&&r.intent===intent&&r.policy===policy&&r.case===c.label);
 const losses=rs.map(r=>r.damageLost).sort((a,b)=>a-b);
 groups.push({size,intent,policy,case:c.label,cohort:'known_regression',n:rs.length,wins:rs.filter(r=>r.outcome==='won').length,deaths:rs.filter(r=>r.outcome==='lost').length,truncated:rs.filter(r=>r.outcome==='truncated').length,neverCharged:rs.filter(r=>r.firstCharged===null).length,lossP50:losses[12],lossP90:losses[22],coreUnpayable:rs.reduce((n,r)=>n+r.coreUnpayable,0),seekMiss:rs.reduce((n,r)=>n+r.seekMiss,0)});
}
const report={inputs:replayInputs('core-support-experiment.mjs'),version:'ganyu-support-0.5',seeds:'1001..1025 known regression; not untouched holdout',notNaturalAcquisition:true,information:'player can inspect unordered draw-pile core count, terminal displays it; not future draw order',hypothesis:'separate reliable 2-cost guard-charge and draw-pile-only seek; their combined cost plus arrow is four, not legal in a normal three-energy turn',samples:rows.length,groups,rows};
writeFileSync(new URL('./core-support-experiment-results.json.gz',import.meta.url),gzipSync(JSON.stringify(report,null,2)+'\n'));console.log(JSON.stringify(groups,null,2));
