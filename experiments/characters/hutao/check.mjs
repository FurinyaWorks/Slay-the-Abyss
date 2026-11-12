// Offline deterministic pilot check ONLY. Does not import production Lua or prove game balance.
// Run: node experiments/characters/hutao/check.mjs
import fs from "node:fs";
const model=JSON.parse(fs.readFileSync(new URL("./v5-alpha.json", import.meta.url),"utf8"));
const audit=function audit(model){
 const fail=(m)=>{throw new Error(m)};
 const all=model.cards, byId=Object.fromEntries(all.map(c=>[c.id,c]));
 if(new Set(all.map(c=>c.id)).size!==all.length)fail("duplicate card ID");
 if(new Set(all.map(c=>c.name)).size!==all.length)fail("duplicate card name");
 if(model.starter.reduce((a,x)=>a+x[1],0)!==10)fail("starter size");
 for(const [id,n] of model.starter)if(!byId[id] || n<1)fail("invalid starter");
 if(all.length!==11||all.filter(c=>c.rarity==="basic").length!==6)fail("pilot scope");
 const known = new Set(["damage_one","damage_all","gain_block","draw","pay_hp","apply_self_state","apply_enemy_state","heal_if_hit","if_low_hp","if_any_enemy_has","consume_enemy_state_damage"]);
 function validateEffects(effects){
  for (const e of effects){if(!known.has(e.op))fail("unrecognized effect "+e.op);if(e.effects)validateEffects(e.effects)}
 }
 for(const c of all){
  if(!c.source?.kind || !c.role || !Number.isInteger(c.cost) || c.cost<0)fail("incomplete metadata "+c.id);
  if(!c.base?.length || !c.upgraded?.length)fail("missing effects "+c.id);
  validateEffects(c.base);validateEffects(c.upgraded);
  if(c.source.kind==="official_skill_adapted" && !c.source.url) fail("missing official source");
 }
 const status=model.character_rules;
 const env=model.environment;
 const actionsLog=[];
 function one(s,n){
  if(s.enemyHp<=0)return false;
  const consumed=Math.min(s.enemyBlock, n);
  s.enemyBlock-=consumed;
  s.enemyHp=Math.max(0,s.enemyHp-(n-consumed));
  return true;
 }
 function step(s,id){
  const card=byId[id];
  if(!card || !s.hand.includes(id))fail("card not in hand "+id);
  const effects=card.base;
  const cost=card.cost;
  const totalPay=effects.filter(e=>e.op==="pay_hp").reduce((n,e)=>n+e.n,0);
  if(s.energy<cost || s.hp<=totalPay)return false; // atomic rejection; no mutation
  s.energy-=cost;
  s.hand.splice(s.hand.indexOf(id),1);
  if(totalPay>0){
   s.hp-=totalPay;
   if(!s.relicUsed){s.block+=env.relic.block;s.relicUsed=true;}
  }
  const snapshotLow=2*s.hp<=env.max_hp;
  const attackBonus = card.type==="attack" && s.butterfly>0 ?
      (snapshotLow?status.butterfly.attack_bonus_on_first_live_hit_per_card.hp_half_or_below:status.butterfly.attack_bonus_on_first_live_hit_per_card.hp_above_half):0;
  let rootBonusUsed=false, didHit=false, actualHpDamage=0;
  function effectList(es){
   for(const e of es){
    switch(e.op){
     case "pay_hp": break; // already preflighted and paid
     case "damage_one": case "damage_all":{
       const before=s.enemyHp;
       const bonus=rootBonusUsed?0:attackBonus;
       const wasHit=one(s,e.n+bonus);
       didHit=didHit||wasHit;
       actualHpDamage+=Math.max(0,before-s.enemyHp);
       rootBonusUsed=true;
       break;
     }
     case "gain_block":s.block+=e.n;break;
     case "apply_self_state":s.butterfly=Math.max(s.butterfly,e.end_phases);break;
     case "apply_enemy_state":if(s.enemyHp>0)s.bloom=e.ticks;break;
     case "heal_if_hit":
       if(didHit){
         const request=snapshotLow?e.low_hp:e.high_hp;
         const healed=Math.min(request,s.healRemaining,env.max_hp-s.hp);
         s.hp+=healed;s.healRemaining-=healed;
       }
       break;
     case "if_low_hp":if(snapshotLow)effectList(e.effects);break;
     case "if_any_enemy_has":if(e.state==="blood_blossom" && s.bloom>0)effectList(e.effects);break;
     case "draw":s.draws+=e.n;break;
     case "consume_enemy_state_damage":
       if(s.enemyHp>0 && s.bloom>0){const damage=s.bloom*e.damage_per_remaining_tick;s.bloom=0;one(s,damage)}
       break;
     default:fail("missing executor "+e.op);
    }
   }
  }
  effectList(effects);
  if(card.tags.includes("charged") && s.butterfly>0 && didHit && actualHpDamage>0 && s.enemyHp>0) s.bloom=2;
  return true;
 }
 function replay(sample,choice){
  const state={hp:sample.hero_hp,enemyHp:sample.enemy_hp,enemyBlock:0,energy:env.energy_per_turn,block:0,healRemaining:env.shared_healing_cap_per_combat,relicUsed:false,butterfly:0,bloom:0,draws:0,hand:[...sample.hand]};
  for(const id of sample[choice+"_line"])if(!step(state,id))fail("illegal play "+id);
  if(state.enemyHp>0 && state.bloom>0){
    one(state,status.blood_blossom.damage_per_tick);
    state.bloom-=1;
  }
  const enemyAttackPrevented=state.enemyHp<=0;
  if(!enemyAttackPrevented)state.hp=Math.max(0,state.hp-Math.max(0,sample.enemy_intent_attack-state.block));
  if(state.butterfly>0)state.butterfly-=1;
  return {hero_hp:state.hp,enemy_hp:state.enemyHp,enemy_attack_prevented:enemyAttackPrevented};
 }
 for(const scenario of model.manual_scenarios){
  const r=replay(scenario,"risk"),s=replay(scenario,"safe");
  for(const [k,v] of Object.entries(scenario.expected.risk))if(r[k]!==v)fail(`${scenario.id} risk ${k} expected ${v} got ${r[k]}`);
  for(const [k,v] of Object.entries(scenario.expected.safe))if(s[k]!==v)fail(`${scenario.id} safe ${k} expected ${v} got ${s[k]}`);
  actionsLog.push({case:scenario.id,risk:r,safe:s});
 }
 const p=model.manual_scenarios[0];
 const invalid={hp:2,enemyHp:80,enemyBlock:0,energy:3,block:0,healRemaining:12,relicUsed:false,butterfly:0,bloom:0,draws:0,hand:["HT5-011"]};
 const before=JSON.stringify(invalid);
 if(step(invalid,"HT5-011")!==false || JSON.stringify(invalid)!==before)fail("failed self-payment changed state");
 if(!(actionsLog[0].risk.enemy_attack_prevented && actionsLog[0].risk.hero_hp>actionsLog[0].safe.hero_hp && actionsLog[1].safe.hero_hp>actionsLog[1].risk.hero_hp))fail("missing opposite-scenario decision evidence");
 return {card_count:all.length,starter_count:model.starter.reduce((a,x)=>a+x[1],0),effects_checked:all.reduce((a,c)=>a+c.base.length+c.upgraded.length,0),atomic_reject:true,single_enemy_replay:actionsLog,status:"offline pilot contract check; NOT G4 runtime or G5 balance"};
};
console.log(JSON.stringify(audit(model),null,2));
