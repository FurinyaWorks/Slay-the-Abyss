import {journeyStart,fightRoom,takeReward,rewardView,selectReward,offers,POOLS} from './journey.mjs';
const groups=[];for(const family of ['large','multi'])for(const policy of ['skip','reservePayoff']){
 const rows=[];for(let seed=11001;seed<=11010;seed++){
  let s=journeyStart(seed,{poolVersion:'v8'});while(s.phase==='battle'){s=fightRoom(s,'defense',family);if(s.phase==='reward')s=takeReward(s,selectReward(rewardView(s),policy));}
  rows.push({seed,outcome:s.phase,hp:s.battle.hp,deckSize:s.deck.length,history:s.history});
 }
 const losses=rows.map(r=>60-r.hp).sort((a,b)=>a-b);groups.push({family,policy,n:10,complete:rows.filter(r=>r.outcome==='complete').length,deaths:rows.filter(r=>r.outcome==='death').length,truncated:rows.filter(r=>r.outcome==='truncated').length,acquired:rows.filter(r=>r.history.some(h=>h.choice==='zl18')).length,lossP50:losses[4],lossP90:losses[8],rows});
}
const inclusion=Object.fromEntries(POOLS.v8.map(id=>[id,0]));for(let seed=1;seed<=10000;seed++)for(const room of [1,2])for(const id of offers(seed,room,'v8'))inclusion[id]++;
console.log(JSON.stringify({scope:'40 synthetic runs, restricted v8 all-common, visible full-turn policy projects current reserve payoff only; no future enemy information.',seeds:'11001..11010 exploratory no tuning',probability:{pool:POOLS.v8,common:1,uncommon:0,rare:0,idealUniformInclusion:3/14,empiricalOffers:20000,empiricalSeeds:'1..10000 x rooms1/2',inclusion,warning:'finite LCG bias, acquisition not guaranteed'},groups},null,2));
