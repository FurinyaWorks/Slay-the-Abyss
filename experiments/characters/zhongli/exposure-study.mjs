import {journeyStart,fightRoom,takeReward,rewardView,selectReward,offers,POOLS} from './journey.mjs';
const groups=[];
for(const poolVersion of ['v2','v3'])for(const policy of ['skip','expose']){
 const rows=[];for(let seed=6001;seed<=6010;seed++){
  let s=journeyStart(seed,{poolVersion});while(s.phase==='battle'){s=fightRoom(s,'defense','large');if(s.phase==='reward')s=takeReward(s,selectReward(rewardView(s),policy));}
  rows.push({seed,outcome:s.phase,hp:s.battle.hp,deckSize:s.deck.length,history:s.history});
 }
 groups.push({poolVersion,policy,n:10,complete:rows.filter(r=>r.outcome==='complete').length,deaths:rows.filter(r=>r.outcome==='death').length,truncated:rows.filter(r=>r.outcome==='truncated').length,acquired:rows.filter(r=>r.history.some(h=>h.choice==='zl13')).length,reachedRoom3:rows.filter(r=>r.history.length===3).length,rows});
}
const inclusion=Object.fromEntries(POOLS.v3.map(id=>[id,0]));for(let seed=1;seed<=10000;seed++)for(const room of [1,2])for(const id of offers(seed,room,'v3'))inclusion[id]++;
console.log(JSON.stringify({scope:'40 synthetic large-family three-room runs; visible defensive action policy. Not production rarity, balance or fun evidence.',seeds:'6001..6010 fresh exploratory no tuning',probability:{pool:POOLS.v3,common:1,uncommon:0,rare:0,idealUniformInclusion:1/3,empiricalOffers:20000,empiricalSeeds:'1..10000 x rooms1/2',inclusion,warning:'finite LCG not exact uniform guarantee; skip/failed run can prevent acquisition'},groups},null,2));
