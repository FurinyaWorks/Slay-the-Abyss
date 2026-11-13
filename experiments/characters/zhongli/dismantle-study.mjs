import {journeyStart,fightRoom,takeReward,rewardView,selectReward,offers,POOLS} from './journey.mjs';
const groups=[];for(const family of ['large','multi'])for(const policy of ['skip','dismantle']){
 const rows=[];for(let seed=16001;seed<=16020;seed++){
  let s=journeyStart(seed,{poolVersion:'v13'});while(s.phase==='battle'){s=fightRoom(s,'defense',family);if(s.phase==='reward')s=takeReward(s,selectReward(rewardView(s),policy));}
  rows.push({seed,outcome:s.phase,hp:s.battle.hp,deck:[...s.deck],history:s.history});
 }
 const losses=rows.map(r=>60-r.hp).sort((a,b)=>a-b);groups.push({family,policy,n:20,complete:rows.filter(r=>r.outcome==='complete').length,deaths:rows.filter(r=>r.outcome==='death').length,truncated:rows.filter(r=>r.outcome==='truncated').length,pillarAcquired:rows.filter(r=>r.deck.includes('zl21')).length,pairAcquired:rows.filter(r=>r.deck.includes('zl21')&&r.deck.includes('zl23')).length,lossP50:losses[9],lossP90:losses[17],rows});
}
const inclusion=Object.fromEntries(POOLS.v13.map(id=>[id,0]));for(let seed=1;seed<=10000;seed++)for(const room of [1,2])for(const id of offers(seed,room,'v13'))inclusion[id]++;
let witnessSeed=1;while(witnessSeed<=10000&&!(offers(witnessSeed,1,'v13').includes('zl21')&&offers(witnessSeed,2,'v13').includes('zl23')))witnessSeed++;if(witnessSeed>10000)throw new Error('no bounded acquisition witness');
let witness=journeyStart(witnessSeed,{poolVersion:'v13'});while(witness.phase==='battle'){witness=fightRoom(witness,'defense','multi');if(witness.phase==='reward')witness=takeReward(witness,selectReward(rewardView(witness),'dismantle'));}
const acquisitionWitness={seed:witnessSeed,selection:'first seed in 1..10000 with room1 offering21 and room2 offering23; selection by offers, deliberately not an unbiased cohort',outcome:witness.phase,hp:witness.battle.hp,deck:witness.deck,history:witness.history};
console.log(JSON.stringify({acquisitionWitness,scope:'80 synthetic three-room runs. Visible reward policy first acquires pillar if offered, then dismantler if offered; otherwise abandons. No injected prerequisite.',seeds:'16001..16020 exploratory no tuning',probability:{pool:POOLS.v13,common:1,uncommon:0,rare:0,idealUniformInclusion:3/19,empiricalOffers:20000,inclusion,warning:'finite LCG bias, pair not guaranteed, two reward windows only'},groups},null,2));
