// Reproducible synthetic access evidence, not natural draft or balance approval.
import {catalog} from './model.mjs';
import {newCampaign,campaignAction} from './campaign.mjs';
import {observe,choose} from './research.mjs';
const first=new Map();let won=0,rejected=0;
for(let seed=1;seed<=512;seed++){
 let c=newCampaign(seed);
 for(let i=0;i<200&&c.phase==='battle';i++){const a=choose(observe(c.battle),'guard'),r=campaignAction(c,a?{type:'play',...a}:{type:'end'});if(!r.ok){rejected++;break;}c=r.state;}
 if(c.phase==='reward'){won++;for(const id of c.offer)if(!first.has(id))first.set(id,c);}
}
const access=catalog.rewardCandidates.map(id=>{
 let c=first.get(id);if(!c)return {id,offered:false,played:false};const seed=c.seed,card=catalog.cards.find(x=>x.id===id);c=campaignAction(c,{type:'reward',card:id}).state;
 for(let i=0;i<200&&c.phase==='battle';i++){
  const index=c.battle.hand.indexOf(id),a=index>=0&&c.battle.energy>=card.cost?{index,target:c.battle.enemies.findIndex(e=>e.hp>0)}:choose(observe(c.battle),'guard');
  const selected=a?c.battle.hand[a.index]:null,r=campaignAction(c,a?{type:'play',...a}:{type:'end'});if(!r.ok)return {id,seed,offered:true,played:false,rejection:r.reason};c=r.state;
  if(selected===id)return {id,seed,offered:true,played:true,action:i+1,hp:c.battle.hp};
 }
 return {id,seed,offered:true,played:false};
});
const duplicates=[];for(let i=0;i<catalog.cards.length;i++)for(let j=i+1;j<catalog.cards.length;j++){
 const a=catalog.cards[i],b=catalog.cards[j];const key=c=>JSON.stringify([c.kind,c.cost,c.exhaust,c.base,c.upgrade]);if(key(a)===key(b))duplicates.push([a.id,b.id]);
}
const campaignRuns=[];
for(const mode of ['skip','first-offer'])for(let seed=1;seed<=64;seed++){
 let c=newCampaign(seed),actions=0,illegal=0;
 while(['battle','reward'].includes(c.phase)&&actions++<600){
  const a=c.phase==='reward'?{type:'reward',card:mode==='skip'?null:c.offer[0]}:(()=>{const move=choose(observe(c.battle),'guard');return move?{type:'play',...move}:{type:'end'};})();
  const r=campaignAction(c,a);if(!r.ok){illegal++;break;}c=r.state;
 }
 campaignRuns.push({mode,seed,phase:c.phase,stage:c.stage,hp:c.battle.hp,actions,illegal,choices:c.choices.map(x=>x.selected)});
}
console.log(JSON.stringify({version:catalog.version,candidates:catalog.cards.length,rewardCandidates:catalog.rewardCandidates.length,kindCounts:Object.fromEntries(['attack','skill','power'].map(k=>[k,catalog.cards.filter(c=>c.kind===k).length])),sourceVerified:catalog.cards.filter(c=>c.naming.sourceVerified).length,humanApproved:catalog.cards.filter(c=>c.naming.humanApproved).length,exactMechanicalDuplicates:duplicates,campaignRuns,seedRange:[1,512],firstBattleWins:won,rejectedActions:rejected,access,limits:['All rewards uniformly sampled, no rarity weighting or natural map.','One manually prioritized acquired card, no multi-card draft strategy.','No persistent upgrade instances; access proves base only.','Identical signatures only; absence of duplicates is not absence of domination.','Role descriptions and STS comparison names do not verify primary-source quotations.']},null,2));
