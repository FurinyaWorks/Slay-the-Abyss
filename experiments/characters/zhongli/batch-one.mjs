import {trial} from './pressure.mjs';
import {STARTER} from './battle.mjs';
const result={version:'zhongli-role-research-0.3',scope:'Fixed chosen extra card, not natural reward acquisition. Unmodified 0.2 numerical baseline. No claims about G5/G6/G7 approval.',seeds:'2001..2010; exploratory, never used to tune values',groups:[]};
for(const family of ['low','growing','large','multi'])for(const policy of ['offense','defense'])for(const extra of [null,'zl07','zl08']){
  const deck=extra?[...STARTER,extra]:STARTER;
  const rows=Array.from({length:10},(_,i)=>trial(2001+i,family,policy,true,false,deck));
  const losses=rows.map(r=>r.loss).sort((a,b)=>a-b);
  result.groups.push({family,policy,extra,deckSize:deck.length,n:10,wins:rows.filter(r=>r.outcome==='win').length,deaths:rows.filter(r=>r.outcome==='death').length,truncated:rows.filter(r=>r.outcome==='truncated').length,lossP50:losses[4],lossP90:losses[8],rows});
}
console.log(JSON.stringify(result));
