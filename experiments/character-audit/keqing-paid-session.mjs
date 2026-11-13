// Owns only UI protocol. Paid state/continuation live in the model session.
export function paidSession(adapter,battle,text,{seed,mode}){
 let model=battle.createChoiceSession(adapter.start(seed,mode));
 const guard=()=>adapter.assertCurrent?.();
 function view(){guard();const v=model.view();return {...v,mode,seed,
  outcome:v.phase==='won'?'victory':v.phase==='lost'?'defeat':v.phase==='choice'?'choice':v.phase==='faulted'?'faulted':'playing',
  hand:v.hand.map((c,i)=>({...c,slot:i+1,text:text(c.id,c.upgraded)})),
  enemies:v.enemies.map((e,i)=>({...e,target:i+1})),
  pending:v.pending?{...v.pending,options:v.pending.options.map(c=>({...c,text:text(c.id,c.upgraded)}))}:null};}
 function dispatch(c){guard();const v=model.view();
  try{
   if(!c||!Number.isSafeInteger(c.revision)||c.revision!==v.revision)throw Error('stale or invalid revision');
   if(c.type==='choose')model.resume(c.revision,c.token,c.instance);
   else if(c.type==='play'){
    if(!Number.isInteger(c.slot)||!v.hand[c.slot-1])throw Error('invalid hand slot');
    if(c.target!==undefined&&(!Number.isInteger(c.target)||!v.enemies[c.target-1]))throw Error('invalid target');
    model.begin(c.revision,v.hand[c.slot-1].instance,c.target===undefined?0:c.target-1,c.options);
   }else if(c.type==='end')model.end(c.revision);
   else throw Error('paid session permits play/end/choose only; no reset/refund');
   return {ok:true,action:c.type,view:view()};
  }catch(e){return {ok:false,reason:e.message,view:view()};}
 }
 return {view,dispatch,catalog:()=>{guard();return structuredClone(adapter.catalog);}};
}
