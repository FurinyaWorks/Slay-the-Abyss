import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cards } from './mechanics.mjs';
import { createBattle, useCard, finishTurn, playerView, previewVisible } from './battle.mjs';
export const encounters = Object.freeze({
  solo: [{hp:45,block:0,intent:8}],
  pair: [{hp:24,block:0,intent:6},{hp:24,block:0,intent:6}],
  armor: [{hp:45,block:18,intent:10}],
  heavy: [{hp:65,block:0,intent:18}],
});
export const policies = Object.freeze({ aggressive: 0.25, balanced: 1, defensive: 2 });
const incoming = state => state.enemies.reduce((total,e)=>total+(e.hp>0?e.intent:0),0);
export function choosePlan(view, policy='balanced') {
  if (!(policy in policies)) throw new Error('unknown policy');
  const weight = policies[policy];
  const startHp = view.enemies.reduce((total,e)=>total+e.hp,0);
  let best = { score: -Infinity, steps: [] };
  function visit(state, steps) {
    const damage = startHp-state.enemies.reduce((total,e)=>total+e.hp,0);
    const loss = Math.max(0,incoming(state)-state.block);
    // Objective uses only this turn. Terminal death is penalized, not hidden next draws.
    const score = damage - weight*loss - (loss>=state.hp?1000:0);
    if (score > best.score || (score === best.score && steps.length<best.steps.length)) best={score,steps};
    if (state.phase==='won' || steps.length>=3) return;
    for(const card of state.hand) {
      if(cards[card.id].cost>state.energy) continue;
      const targets=card.id==='KQ002'||card.id==='KQ005'?[0]:state.enemies.flatMap((e,i)=>e.hp>0?[i]:[]);
      for(const target of targets) {
        const step={instance:card.instance,target};
        visit(previewVisible(state,step.instance,target),[...steps,step]);
      }
    }
  }
  visit(view,[]);
  return best.steps;
}
export function simulate({seed,encounter='solo',policy='balanced',relic=true,hp=60,maxTurns=30}) {
  if(!(encounter in encounters)) throw new Error('unknown encounter');
  if(!Number.isInteger(hp)||hp<1||hp>60||!Number.isInteger(maxTurns)||maxTurns<1) throw new Error('invalid simulation bounds');
  let state=createBattle({seed,enemies:encounters[encounter],relic});
  state.hp=hp;
  const metric={seed,encounter,policy,relic,startHp:hp,turns:0,firstSetup:null,firstRecast:null,firstDetonate:null,setup:0,recast:0,detonate:0,unfundedCards:0,unmarkedHeavy:0,expiredWedges:0,playCount:{},outcome:null,loss:null};
  while(state.phase==='player' && metric.turns<maxTurns) {
    metric.turns++;
    metric.unfundedCards+=state.hand.filter(c=>cards[c.id].cost>state.energy).length;
    const plan=choosePlan(playerView(state),policy);
    for(const step of plan) {
      const item=state.hand.find(c=>c.instance===step.instance);
      const kind=item.id==='KQ003'?(state.wedgeUntil===null?'setup':'recast'):(item.id==='KQ004'&&state.wedgeUntil!==null?'detonate':null);
      if(item.id==='KQ004'&&state.wedgeUntil===null) metric.unmarkedHeavy++;
      if(kind) { metric[kind]++; metric[`first${kind[0].toUpperCase()}${kind.slice(1)}`]??=state.turn; }
      metric.playCount[item.id]=(metric.playCount[item.id]??0)+1;
      state=useCard(state,step.instance,step.target);
    }
    if(state.phase==='player') {
      if(state.wedgeUntil===state.turn) metric.expiredWedges++;
      state=finishTurn(state);
    }
  }
  metric.outcome=state.phase==='player'?'truncated':state.phase;
  metric.loss=hp-state.hp;
  metric.endHp=state.hp;
  return metric;
}
export function summarize(rows) {
  const loss=rows.map(r=>r.loss).sort((a,b)=>a-b);
  const percentile=p=>loss[Math.max(0,Math.ceil(p*loss.length)-1)]??null;
  return {n:rows.length,won:rows.filter(r=>r.outcome==='won').length,lost:rows.filter(r=>r.outcome==='lost').length,truncated:rows.filter(r=>r.outcome==='truncated').length,lossP50:percentile(.5),lossP90:percentile(.9),recastBattles:rows.filter(r=>r.recast>0).length,detonateBattles:rows.filter(r=>r.detonate>0).length,expiredWedges:rows.reduce((n,r)=>n+r.expiredWedges,0)};
}
export function buildReport() {
  const seedSets={diagnostic:[11,29,47,83],holdout:[1009,1013,1031,1061]};
  const rows=[];
  for(const [set,seeds] of Object.entries(seedSets)) for(const seed of seeds) for(const encounter of Object.keys(encounters)) for(const policy of Object.keys(policies)) for(const relic of [false,true]) rows.push({set,...simulate({seed,encounter,policy,relic})});
  const groups={};
  for(const row of rows) { const key=`${row.set}/${row.encounter}/${row.policy}/relic-${row.relic}`; (groups[key]??=[]).push(row); }
  const campaigns=[];
  for(const [set,seeds] of Object.entries(seedSets)) for(const seed of seeds) for(const policy of Object.keys(policies)) {
    let hp=60; const battles=[];
    for(const [index,encounter] of ['solo','pair','armor'].entries()) {
      const battle=simulate({seed:seed+index,encounter,policy,hp});
      battles.push(battle); hp=battle.endHp;
      if(battle.outcome!=='won') break;
    }
    campaigns.push({set,seed,policy,battles,finished:battles.length===3&&battles.every(b=>b.outcome==='won'),endHp:hp});
  }
  const digest=createHash('sha256');
  for(const file of ['mechanics.mjs','battle.mjs','pressure.mjs']) digest.update(readFileSync(new URL(file,import.meta.url)));
  return {version:'KQ-pressure-1',sourceDigest:digest.digest('hex'),scope:'5-card starter-only fixed-intent offline model; not natural rewards, official enemies, player fun or balance approval',seedSets,informationBoundary:'policy sees current hand, enemy HP/block/current fixed intent, resources and relic; no draw order or RNG',sampling:'deterministic diagnostic seeds, not IID population sample; no confidence interval or population win-rate claim',rows,groups:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,summarize(v)])),campaigns};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const report=buildReport();
  writeFileSync(new URL('pressure-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({single:summarize(report.rows),campaigns:report.campaigns.length,finished:report.campaigns.filter(c=>c.finished).length,sourceDigest:report.sourceDigest}));
}
