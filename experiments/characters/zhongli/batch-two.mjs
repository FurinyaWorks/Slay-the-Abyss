/** Controlled one-card addition studies. No natural acquisition claim. */
import {trial} from './pressure.mjs';
import {STARTER} from './battle.mjs';
const groups=[];
for(const family of ['growing','large','multi'])for(const added of [null,'zl09','zl10','zl11']){
 const rows=Array.from({length:10},(_,i)=>trial(4001+i,family,'defense',true,false,added?[...STARTER,added]:STARTER));
 const losses=rows.map(r=>r.loss).sort((a,b)=>a-b);
 groups.push({family,added,n:10,wins:rows.filter(r=>r.outcome==='win').length,deaths:rows.filter(r=>r.outcome==='death').length,truncated:rows.filter(r=>r.outcome==='truncated').length,lossP50:losses[4],lossP90:losses[8],rows});
}
console.log(JSON.stringify({scope:'120 single battles with fixed one-card additions, visible-state defense policy. Not reward/natural construction or balance approval.',seeds:'4001..4010 exploratory previously unused; no tuning',limitations:'deck thickness and shuffle mapping differ; fixed added candidate is guaranteed unlike real rewards; no Artifact or complex enemy effects',groups},null,2));
