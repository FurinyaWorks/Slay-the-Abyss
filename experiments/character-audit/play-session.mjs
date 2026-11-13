// Transactional UI shell. All combat rules remain in the supplied model adapter.
export function createSession(adapter,{seed=37,mode='starter'}={}) {
 if(!Number.isInteger(seed)||seed<1||seed>0xffffffff)throw Error('seed must be 1..4294967295');
 if(!['starter','all','run'].includes(mode))throw Error('unsupported deck mode');
 if(adapter.paidFactory)return adapter.paidFactory(adapter,{seed,mode});
 let state=adapter.start(seed,mode),revision=0;
 const guard=()=>adapter.assertCurrent?.();
 function view(){guard();return structuredClone({revision,mode,seed,...adapter.view(structuredClone(state))});}
 function dispatch(command){
  guard();
  if(!command||!Number.isSafeInteger(command.revision)||command.revision!==revision)return {ok:false,reason:'stale or invalid revision',view:view()};
  const {type}=command;
  if(!['play','end','cancel','reset','open','skip','claim','proceed'].includes(type))return {ok:false,reason:'unsupported command',view:view()};
  if(type!=='reset'&&!['playing','reward'].includes(adapter.outcome(state)))return {ok:false,reason:'battle ended; reset or quit',view:view()};
  let next;
  try {
   if(type==='cancel')next=structuredClone(state); // cancel before submission; not undo
   else if(type==='reset')next=adapter.start(seed,mode);
   else if(['open','skip','claim','proceed'].includes(type)){
    if(adapter.outcome(state)!=='reward'||!adapter.reward)throw Error('no pending reward');
    if(type==='claim'&&(!Number.isInteger(command.choice)||command.choice<1||command.choice>3))throw Error('invalid reward choice');
    next=adapter.reward(structuredClone(state),type,command.choice-1);
   }
   else if(type==='end')next=adapter.end(structuredClone(state));
   else {
    if(!Number.isInteger(command.slot)||command.slot<1||command.slot>adapter.view(state).hand.length)throw Error('invalid hand slot');
    if(command.target!==undefined&&(!Number.isInteger(command.target)||command.target<1||command.target>adapter.view(state).enemies.length))throw Error('invalid target slot');
    next=adapter.play(structuredClone(state),command.slot-1,command.target===undefined?undefined:command.target-1,command.options);
   }
   // Evaluate rendering before committing, so malformed adapter output cannot half-commit.
   const rendered=adapter.view(structuredClone(next));guard();
   state=next;revision++;
   return {ok:true,action:type,view:structuredClone({revision,mode,seed,...rendered})};
  }catch(e){guard();return {ok:false,reason:e.message,view:view()};}
 }
 return {view,dispatch,catalog:()=>{guard();return structuredClone(adapter.catalog);}};
}
export function parseCommand(line){
 if(line.trim().startsWith('j ')){const c=JSON.parse(line.trim().slice(2));if(!c||Array.isArray(c)||!['play','choose'].includes(c.type)||Object.keys(c).some(k=>!(c.type==='choose'?['type','revision','token','instance']:['type','revision','slot','target','options']).includes(k)))throw Error('invalid JSON play command');return c;}
 const words=line.trim().split(/\s+/);const op=words[0];
 if(['show','catalog','q'].includes(op)&&words.length===1)return {type:op};
 const types={p:'play',e:'end',c:'cancel',r:'reset',o:'open',s:'skip',k:'claim',n:'proceed'};
 if(!types[op]||!words.slice(1).every(x=>/^\d+$/.test(x)))throw Error('invalid command syntax');
 if(op==='p'?![3,4].includes(words.length):op==='k'?words.length!==3:words.length!==2)throw Error('invalid argument count');
 const nums=words.slice(1).map(Number);if(nums.some(n=>!Number.isSafeInteger(n)))throw Error('invalid integer');
 return {type:types[op],revision:nums[0],...(op==='p'?{slot:nums[1],...(nums.length===3?{target:nums[2]}:{})}:op==='k'?{choice:nums[1]}:{})};
}
