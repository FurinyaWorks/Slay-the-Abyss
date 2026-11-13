// Limited synthetic continuous-combat probe. No future deck or next intent access.
import { fileURLToPath } from 'node:url';
import { catalog } from './model.mjs';
import { newBattle, battlePlay, advance, outcome, intent } from './battle.mjs';
export function observe(s) {
  return { hp:s.hp, energy:s.energy, block:s.block, mask:s.mask,
    hand:[...s.hand], exhaustedCount:s.exhaust.length, exitInDiscard:s.discard.some(id=>catalog.cards.find(c=>c.id===id)?.base.some(e=>(e.op==='mask'&&e.value===0)||e.op==='exitEnergy')), enemies:s.enemies.map(e=>({hp:e.hp,block:e.block,intent:intent(s,e)})) };
}
export function choose(view, policy) {
  if (!['burst','guard','never-mask'].includes(policy)) throw Error('policy');
  const alive=view.enemies.map((e,i)=>({...e,index:i})).filter(e=>e.hp>0);
  const incoming=alive.reduce((n,e)=>n+e.intent,0);
  const target=alive.sort((a,b)=>a.hp+a.block-b.hp-b.block)[0];
  if (!target) return null;
  const attacks=view.hand.filter(id=>catalog.cards.find(c=>c.id===id)?.kind==='attack').length;
  const choices=[];
  view.hand.forEach((id,index)=>{
    const card=catalog.cards.find(c=>c.id===id);if(!card||card.cost>view.energy)return;
    let score=-Infinity;
    if(id==='x06'&&view.mask>0)score=view.hp<=2?1000:(policy==='guard'&&incoming>view.block?30:-10);
    if(card.kind==='attack'){
      let damage=card.base.find(e=>e.op==='blockDamage'||e.op==='damageHits'||e.op==='lastMaskDamage'||e.op==='threatDamage'||e.op==='exhaustDamage'||e.op==='damage'||e.op==='plunge'||e.op==='damageAll').value+(view.mask?catalog.maskRules.attackBonus:0);
      if(id==='x35')damage*=2;
      if(id==='x37')damage=Math.min(14,view.block)+(view.mask?catalog.maskRules.attackBonus:0);
      if(id==='x28'&&view.mask===1)damage+=10;
      if(id==='x25'&&target.intent>0)damage+=4;
      if(id==='x21')damage=Math.min(18,view.exhaustedCount*3)+(view.mask?catalog.maskRules.attackBonus:0);
      const victims=(id==='x12'||id==='x18'||id==='x05'&&view.mask)?alive:[target];
      score=victims.reduce((n,e)=>n+Math.min(e.hp,Math.max(0,damage-e.block))+Math.min(e.block,damage)*0.8+(damage>=e.hp+e.block?e.intent*3:0),0);
      if(id==='x15')score=Math.min(target.hp,damage)+target.block*0.8+(damage>=target.hp?target.intent*3:0);
      if(id==='x07')score+=Math.min(5,Math.max(0,incoming-view.block))*(policy==='guard'?2:1);
    }
    if(id==='x02')score=Math.min(5,Math.max(0,incoming-view.block))*(policy==='guard'?3:1);
    if(id==='x04'&&!view.mask&&policy!=='never-mask'&&view.hp>2&&view.energy>=2&&attacks>0){
      const safe=view.hp>incoming+6;score=policy==='burst'?18:(safe&&attacks>=2?14:-10);
    }
    if(id==='x09')score=view.mask>0&&view.hp<=2?1000:(view.energy>=2&&view.hand.length<5?6:-10);
    if(id==='x10'&&!view.mask&&policy!=='never-mask'&&view.hp>incoming+4&&view.energy>=2&&attacks>0)score=Math.min(8,Math.max(0,incoming-view.block))*2+4;
    if(id==='x13')score=Math.min(view.mask?8:4,Math.max(0,incoming-view.block))*(policy==='guard'?3:1);
    // Fixed greedy proxy values a power only while already masked and not dying to its tick.
    if(id==='x14'&&view.mask>0&&view.hp>2&&policy!=='burst')score=7;
    if(id==='x16')score=Math.min(3,Math.max(0,incoming-view.block))*(policy==='guard'?3:1)+(view.exitInDiscard&&view.mask>0&&view.energy>=2?15:0);
    if(id==='x17'&&view.hp>3&&view.energy===0&&attacks>0)score=policy==='burst'?20:(view.hp>incoming+5?10:-10);
    if(id==='x20'&&view.mask===0&&view.hand.length<10)score=8;
    if(id==='x19'){
      const fuel=view.hand.filter((other,i)=>i!==index&&catalog.cards.find(c=>c.id===other)?.kind==='skill').length;
      score=Math.min(fuel*4,Math.max(0,incoming-view.block))*(policy==='guard'?2:1)-fuel*2;
    }
    if(id==='x22')score=Math.min(10,view.exhaustedCount*2,Math.max(0,incoming-view.block))*(policy==='guard'?3:1);
    if(id==='x23')score=Math.min(view.energy*5,Math.max(0,incoming-view.block))*(policy==='guard'?2:1)-view.energy*2;
    if(id==='x24'&&attacks>0&&view.energy>=2&&incoming>view.block)score=policy==='guard'?9:1;
    if(id==='x26'&&alive.every(e=>e.intent===0)&&view.hand.length<10)score=8;
    if(id==='x27')score=view.mask===1&&view.hp<=2?1000:Math.min(7,Math.max(0,incoming-view.block))*(policy==='guard'?3:1);
    if(id==='x29'&&view.mask>0&&view.energy>=2&&policy==='guard')score=5;
    if(id==='x30'&&view.mask===0&&card.cost<=view.energy)score+=3;
    if(id==='x31')score+=Math.min(4,target.intent)*(policy==='guard'?2:1);
    if(id==='x32')score=Math.min(4,Math.max(0,incoming-view.block))*(policy==='guard'?3:1)+(view.block+4>=incoming?3:0);
    if(id==='x33'&&view.mask===0&&incoming<=view.block&&policy==='guard')score=6;
    if(id==='x34'&&view.mask>0)score=view.hp<=2?1000:(policy==='guard'?12:1);
    if(id==='x36'&&view.mask>0&&view.energy>=3&&attacks>0&&policy==='guard')score=7;
    if(score>0)choices.push({index,target:target.index,score});
  });
  return choices.sort((a,b)=>b.score-a.score||a.index-b.index)[0]??null;
}
export function runCampaign({seed,policy,exit=false,upgradeMask=false}) {
  const deck=[...catalog.starter,...(exit?['x06']:[])];let hp=catalog.maxHp;const fights=[];
  for(const [number,encounter] of ['duel','swarm','armor'].entries()){
    let s=newBattle({seed:(seed+number*100003)>>>0,encounter,hp,deck});
    let plays=0,firstMask=null,firstExitSeen=null,failedActions=0,truncated=false;
    const initialHp=hp;
    for(let turns=0;turns<60&&outcome(s)==='playing';turns++){
      if(s.hand.includes('x06')&&firstExitSeen===null)firstExitSeen=s.turn;
      for(let actions=0;actions<20;actions++){
        const action=choose(observe(s),policy);if(!action)break;
        const id=s.hand[action.index];const result=battlePlay(s,{...action,upgraded:upgradeMask&&id==='x04'});
        if(!result.ok){failedActions++;break;}s=result.state;plays++;
        if(s.hand.includes('x06')&&firstExitSeen===null)firstExitSeen=s.turn;
        if(id==='x04'&&firstMask===null)firstMask=s.turn;
        if(outcome(s)!=='playing')break;
        if(actions===19)truncated=true;
      }
      if(outcome(s)==='playing')s=advance(s);
      if(turns===59&&outcome(s)==='playing')truncated=true;
    }
    hp=s.hp;fights.push({encounter,initialHp,remainingHp:hp,lost:initialHp-hp,outcome:outcome(s),turn:s.turn,plays,firstMask,firstExitSeen,failedActions,truncated});
    if(outcome(s)!=='victory')break;
  }
  return {seed,policy,exit,upgradeMask,fights,cleared:fights.length===3&&fights.every(f=>f.outcome==='victory'),remainingHp:hp};
}
export function report() {
  const samples=[];
  for(const group of ['development','diagnostic','held-out'])for(const seed of Array.from({length:32},(_,i)=>(group==='development'?1:group==='diagnostic'?1001:5001)+i))
    for(const policy of ['burst','guard','never-mask'])for(const exit of [false,true])for(const upgradeMask of [false,true])
      samples.push({group,...runCampaign({seed,policy,exit,upgradeMask})});
  const summary=[];
  for(const group of ['development','diagnostic','held-out'])for(const policy of ['burst','guard','never-mask'])for(const exit of [false,true])for(const upgradeMask of [false,true]){
    const rows=samples.filter(r=>r.group===group&&r.policy===policy&&r.exit===exit&&r.upgradeMask===upgradeMask);
    summary.push({group,policy,exit,upgradeMask,n:rows.length,cleared:rows.filter(r=>r.cleared).length,meanFinalHp:rows.reduce((n,r)=>n+r.remainingHp,0)/rows.length,failedActions:rows.reduce((n,r)=>n+r.fights.reduce((m,f)=>m+f.failedActions,0),0),truncated:rows.filter(r=>r.fights.some(f=>f.truncated)).length});
  }
  return {version:'xiao-synthetic-sequence-0.1',scope:'Three synthetic fights; carried HP; no healing, rewards or shops; not G6 natural construction.',policyVisibility:'Current hand, resources and current enemy intents only; never draw/discard order, RNG or future intents.',summary,samples};
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(report(),null,2));
