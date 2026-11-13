// Manual orchestration only. Card, enemy-hit, draw and reward rules stay in pinned models.
export function zhongliRun({battle,journey,model},{poolVersion='v37'}={}){
 if(!Object.hasOwn(journey.POOLS,poolVersion))throw Error('missing reviewed reward pool');
 const hits=()=>[3,3,3]; // Explicit fixed synthetic family from original journey; not production AI.
 const outcome=s=>s.phase==='death'?'defeat':s.phase==='complete'?'victory':s.phase==='reward'?'reward':'playing';
 const check=s=>{journey.rewardView(s);if(s.phase==='battle'&&(!s.battle.hp||!s.battle.enemy.hp))throw Error('unsettled terminal battle');};
 function action(input,kind,index){
  check(input);if(input.phase!=='battle')throw Error('not battling');
  const s=structuredClone(input);
  if(kind==='play'){
   if(!Number.isInteger(index)||index<0||index>=s.battle.hand.length)throw Error('invalid hand slot');
   const r=battle.playInstance(s.battle,s.battle.hand[index]);if(!r.ok)throw Error(r.reason);s.battle=r.state;
  }else if(kind==='end')s.battle=battle.nextTurn(s.battle,hits());
  else throw Error('invalid manual action');
  if(!s.battle.hp||!s.battle.enemy.hp){
   s.phase=!s.battle.hp?'death':s.room===3?'complete':'reward';
   s.offer=s.phase==='reward'?journey.offers(s.seed,s.room,s.poolVersion):[];
   s.history.push({room:s.room,manual:true,family:'multi',turnsStarted:s.battle.turn,endHp:s.battle.hp,outcome:s.phase,offer:[...s.offer]});
  }
  check(s);return s;
 }
 return {start:seed=>journey.journeyStart(seed,{poolVersion}),outcome,
  play:(s,index)=>action(s,'play',index),end:s=>action(s,'end'),
  reward:(s,type,choice)=>{
   check(s);if(s.phase!=='reward')throw Error('no reward');
   if(type!=='claim'&&type!=='proceed')throw Error('rewards already visible; claim or proceed immediately starts next room');
   if(type==='claim'&&(!Number.isInteger(choice)||choice<0||choice>=s.offer.length))throw Error('invalid reward choice');
   return journey.takeReward(s,type==='claim'?choice+1:0);
  },
  view:s=>{
   check(s);const v=battle.visibleState(s.battle,hits());
   return {...v,hand:v.hand.map((c,i)=>({slot:i+1,id:c.id,instance:c.instance,text:c.text})),
    enemies:[{target:1,...v.enemy,rawIntent:v.enemy.hp?hits():[],intent:v.enemy.hp?hits().map(n=>model.incomingAttack(n,v.enemy.weak??0)):[]}],
    outcome:outcome(s),room:s.room,rooms:3,poolVersion:s.poolVersion,persistentDeckSize:s.deck.length,
    zones:{draw:s.battle.draw.length,discard:s.battle.discard.length,exhaust:s.battle.exhaust.length,powers:s.battle.powers.length},
    relic:{id:battle.RELIC.id,text:battle.RELIC.description,initialized:s.battle.relicApplied},
    reward:s.phase==='reward'?{open:true,claimed:false,immediateNextRoom:true,cards:s.offer.map((id,i)=>({choice:i+1,id,text:model.textFor(id)}))}:null};
  }};
}
