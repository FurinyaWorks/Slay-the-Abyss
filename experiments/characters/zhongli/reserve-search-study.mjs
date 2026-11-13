import {journeyStart,fightRoom,takeReward,rewardView,selectReward,offers,POOLS} from './journey.mjs';
const groups=[];for(const family of ['large','multi'])for(const policy of ['skip','reserveSearch']){
 const rows=[];for(let seed=17001;seed<=17010;seed++){
  let s=journeyStart(seed,{poolVersion:'v14'});while(s.phase==='battle'){s=fightRoom(s,'defense',family);if(s.phase==='reward')s=takeReward(s,selectReward(rewardView(s),policy));}
  rows.push({seed,outcome:s.phase,hp:s.battle.hp,deckSize:s.deck.length,history:s.history});
 }
 const losses=rows.map(r=>60-r.hp).sort((a,b)=>a-b);groups.push({family,policy,n:10,complete:rows.filter(r=>r.outcome==='complete').length,deaths:rows.filter(r=>r.outcome==='death').length,truncated:rows.filter(r=>r.outcome==='truncated').length,acquired:rows.filter(r=>r.history.some(h=>h.choice==='zl24')).length,lossP50:losses[4],lossP90:losses[8],rows});
}
const inclusion=Object.fromEntries(POOLS.v14.map(id=>[id,0]));for(let seed=1;seed<=10000;seed++)for(const room of [1,2])for(const id of offers(seed,room,'v14'))inclusion[id]++;
console.log(JSON.stringify({scope:'40 synthetic runs, restricted v14 all-common, visible full-turn policy projects current reserve search only; no future enemy information.',seeds:'17001..17010 exploratory no tuning',probability:{pool:POOLS.v14,common:1,uncommon:0,rare:0,idealUniformInclusion:3/20,empiricalOffers:20000,empiricalSeeds:'1..10000 x rooms1/2',inclusion,warning:'finite LCG bias, acquisition not guaranteed'},groups},null,2));
