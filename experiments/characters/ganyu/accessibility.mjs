// Visible-hand policies only. Fixed artificial encounters, NOT reward/run simulation.
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { catalogue, play, endTurn } from './engine.mjs';
import { createBattle, nextBattleTurn } from './battle.mjs';
const cost = c => catalogue.cards.find(x=>x.id===c.id)[c.upgraded?'upgrade':'base'].cost;
export function choose(view, policy) {
  const legal=view.hand.map((c,i)=>({c,i})).filter(x=>cost(x.c)<=view.energy);
  const living=view.enemies.map((e,i)=>({e,i})).filter(x=>x.e.hp>0);
  const target=living.reduce((a,b)=>a.e.hp+a.e.block<b.e.hp+b.e.block?a:b).i;
  const arrow=legal.find(x=>x.c.id==='ganyu-03');
  const lethal=arrow && view.enemies[target].hp+view.enemies[target].block<=7;
  if(arrow && (view.charge===2 || lethal))return {index:arrow.i,target};
  const incoming=living.reduce((n,x)=>n+(Array.isArray(x.e.intent)?x.e.intent.reduce((a,b)=>a+b,0):x.e.intent),0);
  const defense=legal.find(x=>x.c.id==='ganyu-04') ?? legal.find(x=>x.c.id==='ganyu-02');
  if(policy==='defend_bank' && defense && view.block<incoming)return {index:defense.i,target:null};
  const attack=legal.find(x=>x.c.id==='ganyu-01') ?? (policy==='immediate'?arrow:null);
  if(attack && (policy==='immediate' || view.charge===2 || view.energy>2))return {index:attack.i,target};
  if(defense && view.block<incoming)return {index:defense.i,target:null};
  return null;
}
export function trial({size,seed,ordered=false,policy='defend_bank',intent=8}) {
  let deck=catalogue.starting_deck.map(id=>({id}));
  while(deck.length<size)deck.push({id:deck.length%2?'ganyu-01':'ganyu-02'});
  if(ordered)deck=[...deck.filter(c=>c.id!=='ganyu-03'),{id:'ganyu-03'}];
  let s=createBattle([{hp:70,block:0,intent}],seed,deck,ordered);
  const metric={size,seed,ordered,policy,intent,firstSeen:null,firstCharged:null,saturatedWaitingTurns:0,coreUnpayable:0,damageLost:0,turns:0,outcome:null};
  while(s.phase==='player' && s.turn<=30) {
    const hadCore=s.hand.some(c=>c.id==='ganyu-03');
    if(hadCore && metric.firstSeen===null)metric.firstSeen=s.turn;
    if(!hadCore && s.charge===2)metric.saturatedWaitingTurns++;
    for(let i=0;i<10;i++) {
      // No draw/discard/seed/hidden order supplied to decision policy.
      const decision=choose({hand:s.hand,enemies:s.enemies,energy:s.energy,charge:s.charge,block:s.block},policy);
      if(!decision)break;
      const card=s.hand[decision.index];
      if(card.id==='ganyu-03' && s.charge===2 && metric.firstCharged===null)metric.firstCharged=s.turn;
      s=play(s,decision.index,decision.target);
      if(s.phase==='won')break;
    }
    if(s.hand.some(c=>c.id==='ganyu-03') && s.energy<1)metric.coreUnpayable++;
    if(s.phase==='player')s=endTurn(s);
    metric.turns=s.turn;
    if(s.phase==='between')s=nextBattleTurn(s);
  }
  metric.damageLost=60-s.hp;metric.outcome=s.phase==='player'?'truncated':s.phase;
  return metric;
}
export function runMatrix() {
  const rows=[];
  for(const size of [10,20,30,40])for(const intent of [0,8,14])for(const policy of ['defend_bank','immediate']) {
    rows.push(trial({size,seed:37,ordered:true,policy,intent}));
    for(const seed of [...Array.from({length:25},(_,i)=>i+1),...Array.from({length:25},(_,i)=>1001+i)])rows.push(trial({size,seed,policy,intent}));
  }
  const groups=[];
  for(const size of [10,20,30,40])for(const intent of [0,8,14])for(const policy of ['defend_bank','immediate'])for(const cohort of ['exploratory','holdout']) {
    const rs=rows.filter(r=>r.size===size && r.intent===intent && r.policy===policy && !r.ordered && (cohort==='holdout'?r.seed>=1001:r.seed<1001));
    const losses=rs.map(r=>r.damageLost).sort((a,b)=>a-b);
    groups.push({size,intent,policy,cohort,n:rs.length,wins:rs.filter(r=>r.outcome==='won').length,deaths:rs.filter(r=>r.outcome==='lost').length,truncated:rs.filter(r=>r.outcome==='truncated').length,neverSawCore:rs.filter(r=>r.firstSeen===null).length,neverCharged:rs.filter(r=>r.firstCharged===null).length,lossP50:losses[Math.ceil(rs.length*0.5)-1],lossP90:losses[Math.ceil(rs.length*0.9)-1],saturatedWaitingTurns:rs.reduce((n,r)=>n+r.saturatedWaitingTurns,0),coreUnpayable:rs.reduce((n,r)=>n+r.coreUnpayable,0)});
  }
  return {version:'ganyu-accessibility-0.2',kind:'fixed-artificial-single-enemy-stress',notNaturalAcquisition:true,seeds:{exploratory:'1..25',holdout:'1001..1025',bottom:37},rng:'xorshift32 draw-only',maxTurns:30,policyVisible:'hand, enemy hp/block/intent, energy, charge, block only',samples:rows.length,groups,rows};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
 const report=runMatrix();writeFileSync(new URL('./accessibility-results.json.gz',import.meta.url),gzipSync(JSON.stringify(report,null,2)+'\n'));
 console.log(JSON.stringify({samples:report.samples,groups:report.groups},null,2));
}
