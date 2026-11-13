import { replayInputs } from './replay-inputs.mjs';
import { writeFileSync } from 'node:fs';import { gzipSync } from 'node:zlib';
import { trial } from './accessibility.mjs';
const rows=[];
for(const size of [20,40])for(const intent of [8,14])for(const policy of ['defend_bank','immediate'])for(const extraDrawCards of [0,1,2])for(const seed of [...Array.from({length:25},(_,i)=>i+1),...Array.from({length:25},(_,i)=>1001+i)])rows.push(trial({size,intent,policy,extraDrawCards,seed}));
const groups=[];
for(const size of [20,40])for(const intent of [8,14])for(const policy of ['defend_bank','immediate'])for(const extraDrawCards of [0,1,2])for(const cohort of ['exploratory','known_regression']) {
 const rs=rows.filter(r=>r.size===size&&r.intent===intent&&r.policy===policy&&r.extraDrawCards===extraDrawCards&&(cohort==='known_regression'?r.seed>=1001:r.seed<1001));
 const losses=rs.map(r=>r.damageLost).sort((a,b)=>a-b);
 groups.push({size,actualSize:size+extraDrawCards,intent,policy,extraDrawCards,cohort,n:rs.length,wins:rs.filter(r=>r.outcome==='won').length,deaths:rs.filter(r=>r.outcome==='lost').length,truncated:rs.filter(r=>r.outcome==='truncated').length,neverSawCore:rs.filter(r=>r.firstSeen===null).length,neverCharged:rs.filter(r=>r.firstCharged===null).length,lossP50:losses[12],lossP90:losses[22],coreUnpayable:rs.reduce((n,r)=>n+r.coreUnpayable,0)});
}
const report={inputs:replayInputs('draw-experiment.mjs'),version:'ganyu-draw-experiment-0.3',hypothesis:'1 energy draw2 may improve core availability but consumes energy, a draw slot, and increases deck size',comparison:'adds cards, does not replace or grant them naturally; same seeds do not imply same draws after deck change',notBalanceApproval:true,seeds:{exploratory:'1..25',knownRegression:'1001..1025 (seen during earlier candidate design; not untouched holdout)'},maxTurns:30,samples:rows.length,groups,rows};
writeFileSync(new URL('./draw-experiment-results.json.gz',import.meta.url),gzipSync(JSON.stringify(report,null,2)+'\n'));
console.log(JSON.stringify(groups,null,2));
