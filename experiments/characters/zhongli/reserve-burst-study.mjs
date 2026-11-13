import {journeyStart,fightRoom,takeReward,rewardView,selectReward,offers,POOLS} from './journey.mjs';
const groups=[];for(const family of ['large','multi'])for(const policy of ['skip','reserveBurst']){
 const rows=[];for(let seed=23001;seed<=23010;seed++){
  let s=journeyStart(seed,{poolVersion:'v20'});while(s.phase==='battle'){s=fightRoom(s,'defense',family);if(s.phase==='reward')s=takeReward(s,selectReward(rewardView(s),policy));}
  rows.push({seed,outcome:s.phase,hp:s.battle.hp,deckSize:s.deck.length,history:s.history});
 }
 const losses=rows.map(r=>60-r.hp).sort((a,b)=>a-b);groups.push({family,policy,n:10,complete:rows.filter(r=>r.outcome==='complete').length,deaths:rows.filter(r=>r.outcome==='death').length,truncated:rows.filter(r=>r.outcome==='truncated').length,acquired:rows.filter(r=>r.history.some(h=>h.choice==='zl30')).length,lossP50:losses[4],lossP90:losses[8],rows});
}
const inclusion=Object.fromEntries(POOLS.v20.map(id=>[id,0]));for(let seed=1;seed<=10000;seed++)for(const room of [1,2])for(const id of offers(seed,room,'v20'))inclusion[id]++;
let witnessSeed=1;while(witnessSeed<=10000&&!offers(witnessSeed,1,'v20').includes('zl30'))witnessSeed++;if(witnessSeed>10000)throw new Error('no witness');
let witness=journeyStart(witnessSeed,{poolVersion:'v20'});while(witness.phase==='battle'){witness=fightRoom(witness,'defense','multi');if(witness.phase==='reward')witness=takeReward(witness,selectReward(rewardView(witness),'reserveBurst'));}
const acquisitionWitness={seed:witnessSeed,selection:'first room1 offer of30 in bounded1..10000; biased reachability only, excluded from40',outcome:witness.phase,hp:witness.battle.hp,deck:witness.deck,history:witness.history};
console.log(JSON.stringify({acquisitionWitness,scope:'40 synthetic runs, restricted v20 all-common, visible full-turn policy projects current reserve burst only; no future enemy information.',seeds:'23001..23010 exploratory no tuning',probability:{pool:POOLS.v20,common:1,uncommon:0,rare:0,idealUniformInclusion:3/26,empiricalOffers:20000,empiricalSeeds:'1..10000 x rooms1/2',inclusion,warning:'finite LCG bias, acquisition not guaranteed'},groups},null,2));
