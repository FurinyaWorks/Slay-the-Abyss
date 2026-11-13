import {paidSession} from './keqing-paid-session.mjs';
// Fixed synthetic rooms, not production map or balanced progression.
export function keqingRun(adapter,battle,rewards,text,{seed,mode},route=[
 [{hp:45,block:0,intent:8}], [{hp:24,block:0,intent:6},{hp:24,block:0,intent:6}], [{hp:45,block:18,intent:10}]
]){
 let room=0,revision=0,deck=[...battle.starterIds];
 function make(index,ids,hp){
  const state=battle.createBattle({seed:(seed+index)>>>0,deckIds:ids,enemies:structuredClone(route[index])});state.hp=hp;
  return paidSession({...adapter,start:()=>state},battle,text,{seed:(seed+index)>>>0,mode:'starter'});
 }
 let session=make(0,deck,60);
 function offer(){return rewards.offerReward((seed^0x5a5a^(room+1))>>>0);}
 function view(){const v=session.view(),won=v.outcome==='victory';
  return {...v,revision,mode,seed,room:room+1,rooms:route.length,deckSize:deck.length,
   outcome:won?(room===route.length-1?'complete':'reward'):v.outcome,
   pending:v.pending?{...v.pending,token:`room-${room+1}:${v.pending.token}`}:null,
   reward:won&&room<route.length-1?offer().map((id,i)=>({choice:i+1,id,text:text(id,false)})):null};}
 function dispatch(c){const before=view();try{
  if(!c||!Number.isSafeInteger(c.revision)||c.revision!==revision)throw Error('stale or invalid revision');
  if(before.outcome==='reward'){
   if(!['claim','proceed'].includes(c.type))throw Error('claim or skip required');
   const offered=offer();if(c.type==='claim'&&(!Number.isInteger(c.choice)||c.choice<1||c.choice>offered.length))throw Error('invalid reward choice');
   const nextDeck=rewards.acceptReward(deck,offered,c.type==='claim'?offered[c.choice-1]:null);
   const next=make(room+1,nextDeck,before.hp);next.view(); // failure cannot consume reward or deck
   deck=nextDeck;session=next;room++;revision++;return {ok:true,action:c.type,view:view()};
  }
  if(['complete','defeat','faulted'].includes(before.outcome))throw Error('journey ended');
  const v=session.view(),command={...c,revision:v.revision};
  if(c.type==='choose'){
   if(!before.pending||c.token!==before.pending.token)throw Error('invalid room choice token');
   command.token=v.pending.token;
  }
  const result=session.dispatch(command);
  // Post-choice fault is committed by model, so propagate its changed revision too.
  if(session.view().revision!==v.revision)revision++;
  return {...result,view:view()};
 }catch(e){return {ok:false,reason:e.message,view:view()};}}
 return {view,dispatch,catalog:session.catalog};
}
