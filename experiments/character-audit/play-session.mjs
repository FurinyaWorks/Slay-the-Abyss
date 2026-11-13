// Transactional UI shell. All combat rules remain in the supplied model adapter.
export function createSession(adapter,{seed=37,mode='starter'}={}) {
 if(!Number.isInteger(seed)||seed<1||seed>0xffffffff)throw Error('seed must be 1..4294967295');
 if(!['starter','all'].includes(mode))throw Error('unsupported deck mode');
 let state=adapter.start(seed,mode),revision=0;
 const guard=()=>adapter.assertCurrent?.();
 function view(){guard();return structuredClone({revision,mode,seed,...adapter.view(structuredClone(state))});}
 function dispatch(command){
  guard();
  if(!command||!Number.isSafeInteger(command.revision)||command.revision!==revision)return {ok:false,reason:'stale or invalid revision',view:view()};
  const {type}=command;
  if(!['play','end','cancel','reset'].includes(type))return {ok:false,reason:'unsupported command',view:view()};
  if(type!=='reset'&&adapter.outcome(state)!=='playing')return {ok:false,reason:'battle ended; reset or quit',view:view()};
  let next;
  try {
   if(type==='cancel')next=structuredClone(state); // cancel before submission; not undo
   else if(type==='reset')next=adapter.start(seed,mode);
   else if(type==='end')next=adapter.end(structuredClone(state));
   else {
    if(!Number.isInteger(command.slot)||command.slot<1||command.slot>adapter.view(state).hand.length)throw Error('invalid hand slot');
    if(command.target!==undefined&&(!Number.isInteger(command.target)||command.target<1||command.target>adapter.view(state).enemies.length))throw Error('invalid target slot');
    next=adapter.play(structuredClone(state),command.slot-1,command.target===undefined?undefined:command.target-1);
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
 const words=line.trim().split(/\s+/);const op=words[0];
 if(['show','catalog','q'].includes(op)&&words.length===1)return {type:op};
 const types={p:'play',e:'end',c:'cancel',r:'reset'};
 if(!types[op]||!words.slice(1).every(x=>/^\d+$/.test(x)))throw Error('invalid command syntax');
 if(op==='p'?![3,4].includes(words.length):words.length!==2)throw Error('invalid argument count');
 const nums=words.slice(1).map(Number);if(nums.some(n=>!Number.isSafeInteger(n)))throw Error('invalid integer');
 return {type:types[op],revision:nums[0],...(op==='p'?{slot:nums[1],...(nums.length===3?{target:nums[2]}:{})}:{})};
}
