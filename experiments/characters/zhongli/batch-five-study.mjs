import {journeyStart,fightRoom,takeReward,rewardView,selectReward,offers,POOLS} from './journey.mjs';
const groups=[];for(const family of ['large','multi'])for(const policy of ['skip','suppressedPayoff','exposedReserve','pillarAccess']){
 const rows=[];for(let seed=30001;seed<=30010;seed++){
  let s=journeyStart(seed,{poolVersion:'v27'});while(s.phase==='battle'){s=fightRoom(s,'defense',family);if(s.phase==='reward')s=takeReward(s,selectReward(rewardView(s),policy));}
  rows.push({seed,outcome:s.phase,hp:s.battle.hp,deck:s.deck,history:s.history});
 }
 const losses=rows.map(r=>60-r.hp).sort((a,b)=>a-b);groups.push({family,policy,n:10,complete:rows.filter(r=>r.outcome==='complete').length,deaths:rows.filter(r=>r.outcome==='death').length,truncated:rows.filter(r=>r.outcome==='truncated').length,acquired:Object.fromEntries(['zl09','zl13','zl21','zl41','zl42','zl43'].map(id=>[id,rows.filter(r=>r.deck.includes(id)).length])),lossP50:losses[4],lossP90:losses[8],rows});
}
const inclusion=Object.fromEntries(POOLS.v27.map(id=>[id,0]));for(let seed=1;seed<=10000;seed++)for(const room of [1,2])for(const id of offers(seed,room,'v27'))inclusion[id]++;
const witnesses=[];for(const [policy,id] of [['suppressedPayoff','zl41'],['exposedReserve','zl42'],['pillarAccess','zl43']]){
 let seed=1;while(seed<=10000&&!(offers(seed,1,'v27').includes(policy==='suppressedPayoff'?'zl09':policy==='exposedReserve'?'zl13':'zl21')&&offers(seed,2,'v27').includes(id)))seed++;if(seed>10000)throw new Error('no bounded witness');
 let s=journeyStart(seed,{poolVersion:'v27'});while(s.phase==='battle'){s=fightRoom(s,'defense','multi');if(s.phase==='reward')s=takeReward(s,selectReward(rewardView(s),policy));}
 witnesses.push({policy,id,seed,selection:'first matching offer(s)1..10000; biased acquisition witness only, excluded from80',outcome:s.phase,hp:s.battle.hp,deck:s.deck,history:s.history});
}
console.log(JSON.stringify({witnesses,scope:'80 normal-HP synthetic three-room runs. Original common research restriction; no enemy armor introduced. No full rarity or natural balance claim.',seeds:'30001..30010 exploratory no tuning',probability:{pool:POOLS.v27,common:1,uncommon:0,rare:0,idealUniformInclusion:3/39,empiricalOffers:20000,inclusion,warning:'finite LCG bias and two reward windows; not exact uniform'},groups},null,2));
