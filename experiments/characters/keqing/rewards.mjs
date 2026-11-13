import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cards } from './mechanics.mjs';
import { createBattle, starterIds, playerView, useCard, finishTurn } from './battle.mjs';
import { choosePlan } from './pressure-v2.mjs';
import { encounters, policies } from './pressure.mjs';
export const rewardPool=Object.freeze(Object.entries(cards).filter(([,card]) => card.channel === 'reward_candidate').map(([id]) => id));
export const rewardSeeds=Object.freeze([3001,3011,3019,3023,3037,3041,3049,3061]);
export function offerReward(seed) {
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff) throw new Error('invalid reward seed');
  const pool=[...rewardPool]; let rng=seed>>>0;
  for(let i=pool.length-1;i>0;i--) {
    rng=(Math.imul(1664525,rng)+1013904223)>>>0;
    const j=rng%(i+1); [pool[i],pool[j]]=[pool[j],pool[i]];
  }
  return pool.slice(0,2);
}
export function acceptReward(deck,offer,choice=null) {
  if(!Array.isArray(deck)||deck.length<10||deck.length>75||deck.some(id=>!Object.hasOwn(cards,id))) throw new Error('invalid deck');
  if(!Array.isArray(offer)||offer.length!==2||new Set(offer).size!==2||offer.some(id=>!rewardPool.includes(id))) throw new Error('invalid offer');
  if(choice!==null&&!offer.includes(choice)) throw new Error('not offered');
  if(choice!==null&&deck.length===75) throw new Error('deck full');
  return choice===null?[...deck]:[...deck,choice];
}
export function runCombat({seed,deck=[...starterIds],encounter,policy,hp=60,maxTurns=30}) {
  if(!Object.hasOwn(encounters,encounter)) throw new Error('invalid encounter');
  if(!Object.hasOwn(policies,policy)) throw new Error('invalid policy');
  if (deck.some(id=>!Object.hasOwn(cards,id)||cards[id]?.cost===0||cards[id]?.effects.base.some(e=>e.op==='draw'||e.op==='moveCard'||e.op==='wedgeDiscount'||e.op==='inspect'||e.op==='purgeStatus'))) throw new Error('draw deck requires an observation-replanning policy; legacy experiment unsupported');
  let s=createBattle({seed,deckIds:deck,enemies:encounters[encounter]});
  if(!Number.isInteger(hp)||hp<1||hp>60||!Number.isInteger(maxTurns)||maxTurns<1) throw new Error('invalid bounds');
  s.hp=hp;
  const result={seed,encounter,policy,deck:[...deck],startHp:hp,turns:0,played:{},rewardDraws:{},tailInfusionDefense:0};
  while(s.phase==='player'&&result.turns<maxTurns) {
    result.turns++;
    for(const c of s.hand) if(rewardPool.includes(c.id)) result.rewardDraws[c.id]=(result.rewardDraws[c.id]??0)+1;
    const plan=choosePlan(playerView(s),policy);
    for(const step of plan) {
      const c=s.hand.find(c=>c.instance===step.instance);
      if(c.id==='KQ007'&&s.infusion>0&&s.energy===1) result.tailInfusionDefense++;
      result.played[c.id]=(result.played[c.id]??0)+1;
      s=useCard(s,step.instance,step.target);
    }
    if(s.phase==='player') s=finishTurn(s);
  }
  return {...result,outcome:s.phase==='player'?'truncated':s.phase,endHp:s.hp,loss:hp-s.hp,finalInstanceCount:s.hand.length+s.draw.length+s.discard.length+s.exhaust.length};
}
export function buildRewardReport() {
  const rows=[];
  for(const seed of rewardSeeds) for(const policy of ['aggressive','balanced','defensive']) {
    const opening=runCombat({seed,encounter:'solo',policy});
    const offer=offerReward(seed ^ 0x5a5a);
    if(opening.outcome!=='won') {rows.push({seed,policy,offer,opening,branches:[],blocked:'opening did not win'});continue;}
    const branches=[];
    for(const choice of [null,...offer]) for(const encounter of ['pair','heavy']) {
      const deck=acceptReward(starterIds,offer,choice);
      branches.push({choice,after:runCombat({seed:seed+1,deck,encounter,policy,hp:opening.endHp})});
    }
    rows.push({seed,policy,offer,opening,branches});
  }
  const hash=createHash('sha256');
  for(const file of ['mechanics.mjs','battle.mjs','pressure.mjs','pressure-v2.mjs','rewards.mjs']) hash.update(readFileSync(new URL(file,import.meta.url)));
  return {version:'KQ-reward-probe-2',seeds:rewardSeeds,sourceDigest:hash.digest('hex'),scope:'Offline two-offer/skip branches after an earned first win; not player reward selection, full natural draft, actual monster families, or balance approval. Branches are independent counterfactuals, not serial battles.',rows};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const report=buildRewardReport();
  writeFileSync(new URL('reward-results-v2.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({openings:report.rows.length,branches:report.rows.flatMap(r=>r.branches).length,digest:report.sourceDigest}));
}
