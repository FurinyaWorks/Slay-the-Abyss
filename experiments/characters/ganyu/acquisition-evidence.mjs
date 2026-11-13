import {writeFileSync,readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {catalogue} from './engine.mjs';import {createResearchRun,act,openReward,selectionToken,claimReward,proceed,poolDigest} from './acquisition.mjs';
const expected=catalogue.cards.filter(c=>c.rarity!=='basic').map(c=>c.id),rows=[],seen=new Set();
for(let seed=1;seed<=1000&&seen.size<expected.length;seed++){
 let r=createResearchRun([[{hp:1,block:0,intent:0}],[{hp:999,block:0,intent:0}]],{rewardSeed:seed,deck:[{id:'ganyu-01'}]});
 r=openReward(act(r,{type:'play',index:0,target:0}));
 for(let choice=0;choice<3;choice++){
  const id=r.offer.cards[choice];if(seen.has(id))continue;
  const selected=claimReward(r,selectionToken(r),choice),next=proceed(selected),handIndex=next.battle.hand.findIndex(c=>c.id===id);
  const out=act(next,{type:'play',index:handIndex,target:0});
  rows.push({id,seed,offer:r.offer.cards,choice,deckBefore:r.deck.length,deckAfter:selected.deck.length,nextDrawn:handIndex>=0,playedZone:out.battle.exhausted.some(c=>c.id===id)?'exhausted':'discard',rewardRngAfter:r.rewardSeed,nextDrawRng:next.battle.drawSeed});seen.add(id);
 }
}
if(seen.size!==expected.length)throw new Error('unreachable candidate');
const inputs={};for(const file of ['acquisition.mjs','acquisition-evidence.mjs','engine.mjs','cards.json','relic.json','battle.mjs','deck.mjs'])inputs[file]=createHash('sha256').update(readFileSync(new URL(file,import.meta.url))).digest('hex');
writeFileSync(new URL('./acquisition-evidence.json',import.meta.url),JSON.stringify({scope:'synthetic lifecycle reachability, not natural production rewards or balance',poolDigest,inputs,eligible:expected.length,covered:seen.size,fixture:'one starter attack, 1hp first enemy then 999hp inert target; no hand insertion',rows},null,2)+'\n');
console.log(`covered ${seen.size}/${expected.length} eligible candidates via earned offers`);
