import {cards} from './mechanics.mjs';
import {createBattle,starterIds,playerView,previewVisible,useCard,finishTurn} from './battle.mjs';
import {encounters,policies} from './pressure-v2.mjs';
const incoming=s=>s.enemies.reduce((n,e)=>n+(e.hp>0?Math.max(0,e.intent-(e.attackReduction??0)):0),0);
const value=(s,w)=>-s.enemies.reduce((n,e)=>n+e.hp+e.block,0)-w*Math.max(0,incoming(s)-s.block);
// Fixed myopic utility. Draw is an uncertain opportunity, never a forecast of card identities.
export function chooseObservedAction(view,policy='balanced') {
 if(!Object.hasOwn(policies,policy))throw new Error('invalid policy');
 if(view.attackDiscount)throw new Error('discount action-budget policy unsupported');
 const weight=policies[policy],baseline=value(view,weight);let best=null,score=0;
 for(const c of view.hand){const def=cards[c.id];if(!def)throw new Error('system-card policy unsupported');if(def.cost===0)throw new Error('zero-cost action-budget policy unsupported');if(def.cost>view.energy)continue;const effects=def.effects[c.upgraded?'upgraded':'base'];const d=effects.find(e=>e.op==='draw');
  if(view.powers?.exhaustDraw && def.exhaust && !view.exhaustPowerUsed)throw new Error('exhaust-triggered draw policy unsupported');
  if(effects.some(e=>e.op==='wedgeDiscount'))throw new Error('discount action-budget policy unsupported');
  if(effects.some(e=>['moveCard','chooseDiscard','inspect','purgeStatus'].includes(e.op)))throw new Error('explicit choice policy unsupported');
  if(d){const count=d.wedgeAmount&&view.wedgeUntil!==null?d.wedgeAmount:d.amount;
   const capacity=10-(view.hand.length-1);const available=view.drawCount+view.discardCount;
   const opportunity=(!d.firstOnly||(view.playedThisTurn??0)===0)&&!view.drawLocked&&view.energy>def.cost?Math.min(count,capacity,available)*2:0;
   // Source opportunity cost is explicit; no guessed drawn skill or future damage reward.
   const candidate=opportunity-def.cost-(d.wedgeAmount&&view.wedgeUntil!==null?1:0);
   if(candidate>score){score=candidate;best={instance:c.instance,target:view.enemies.findIndex(e=>e.hp>0)};}continue;
  }
  for(const [target,e] of view.enemies.entries()){if(!e.hp)continue;const after=previewVisible(view,c.instance,target);const candidate=value(after,weight)-baseline;
   if(candidate>score){score=candidate;best={instance:c.instance,target};}
  }
 }
 return best;
}
export function runObservedCombat({seed,deck=[...starterIds],encounter,policy,hp=60,maxTurns=30}){
 if(!Object.hasOwn(encounters,encounter)||!Object.hasOwn(policies,policy))throw new Error('invalid scenario');
 if(!Number.isInteger(hp)||hp<1||hp>60||!Number.isInteger(maxTurns)||maxTurns<1)throw new Error('invalid bounds');
 let s=createBattle({seed,deckIds:deck,enemies:encounters[encounter]});s.hp=hp;
 const result={seed,deck:[...deck],encounter,policy,startHp:hp,turns:0,played:{},actions:[]};
 while(s.phase==='player'&&result.turns<maxTurns){result.turns++;let count=0;
  while(s.phase==='player'){
   const step=chooseObservedAction(playerView(s),policy);if(!step)break;
   if(++count>3)throw new Error('positive-cost action bound violated');
   const c=s.hand.find(c=>c.instance===step.instance),energy=s.energy;
   s=useCard(s,step.instance,step.target);if(s.energy>=energy)throw new Error('action made no payment');
   result.played[c.id]=(result.played[c.id]??0)+1;result.actions.push({turn:s.turn,id:c.id,instance:c.instance,target:step.target,energy:s.energy});
   // Obtain a fresh view only AFTER real execution/draw, not from an assumed successor.
  }
  if(s.phase==='player')s=finishTurn(s);
 }
 return {...result,outcome:s.phase==='player'?'truncated':s.phase,endHp:s.hp,finalInstanceCount:s.hand.length+s.draw.length+s.discard.length+s.exhaust.length};
}
