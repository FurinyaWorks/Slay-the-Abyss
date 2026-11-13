import {journeyStart,fightRoom,takeReward,rewardView,selectReward,offers,POOLS} from './journey.mjs';
const groups=[];
for(const poolVersion of ['v1','v2'])for(const family of ['large','multi'])for(const policy of ['skip','suppress','guarded','access']){
 const rows=[];for(let seed=5001;seed<=5010;seed++){
  let s=journeyStart(seed,{poolVersion});
  while(s.phase==='battle'){s=fightRoom(s,'defense',family);if(s.phase==='reward')s=takeReward(s,selectReward(rewardView(s),policy));}
  rows.push({seed,outcome:s.phase,hp:s.battle.hp,deckSize:s.deck.length,history:s.history});
 }
 const losses=rows.map(r=>60-r.hp).sort((a,b)=>a-b);
 groups.push({poolVersion,family,policy,n:10,complete:rows.filter(r=>r.outcome==='complete').length,deaths:rows.filter(r=>r.outcome==='death').length,truncated:rows.filter(r=>r.outcome==='truncated').length,lossP50:losses[4],lossP90:losses[8],rows});
}
const inclusion=Object.fromEntries(POOLS.v2.map(id=>[id,0]));for(let seed=1;seed<=10000;seed++)for(const room of [1,2])for(const id of offers(seed,room,'v2'))inclusion[id]++;
console.log(JSON.stringify({scope:'160 synthetic three-room runs, versioned restricted all-common offers, not full production rarity. Fixed visible reward preferences.',seeds:'5001..5010 exploratory unseen; no tuning',probability:{pool:POOLS.v2,offersPerReward:3,common:1,uncommon:0,rare:0,idealUniformInclusion:3/8,empiricalOffers:20000,empiricalSeedRange:'1..10000 x rooms1/2; generator diagnostic, not gameplay seeds',inclusion,warning:'LCG shuffle has finite-state bias; 3/8 is ideal-uniform reference, not exact RNG theorem. No guaranteed acquisition.'},groups},null,2));
