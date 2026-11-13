import {journeyStart,fightRoom,takeReward,rewardView,selectReward} from './journey.mjs';
const groups=[];
for(const family of ['low','multi','growing','large'])for(const policy of ['skip','hybrid','reserve']){
 const rows=[];
 for(let seed=3001;seed<=3010;seed++){
  let s=journeyStart(seed);
  while(s.phase==='battle'){
   s=fightRoom(s,'defense',family);
   if(s.phase==='reward')s=takeReward(s,selectReward(rewardView(s),policy));
  }
  rows.push({seed,outcome:s.phase,hp:s.battle.hp,deckSize:s.deck.length,history:s.history});
 }
 const losses=rows.map(r=>60-r.hp).sort((a,b)=>a-b);
 groups.push({family,rewardPolicy:policy,n:rows.length,complete:rows.filter(r=>r.outcome==='complete').length,deaths:rows.filter(r=>r.outcome==='death').length,truncated:rows.filter(r=>r.outcome==='truncated').length,lossP50:losses[4],lossP90:losses[8],rows});
}
console.log(JSON.stringify({version:'zhongli-synthetic-journey-0.1',seeds:'3001..3010 unseen, exploratory; not used to tune values',scope:'120 synthetic three-room runs, defense action policy, common-only restricted offers. NOT full rarity or actual game reward generator; not G6/G7 approval.',groups},null,2));
