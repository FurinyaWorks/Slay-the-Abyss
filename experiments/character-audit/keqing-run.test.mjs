import test from 'node:test';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {keqingRun} from './keqing-run.mjs';
const root=process.env.KEQING_PAID_ROOT;
test('manual paid run earns reward, carries HP, invalidates claim and ends',{skip:!root},async()=>{
 const b=await import(pathToFileURL(root+'/experiments/characters/keqing/battle.mjs')),m=await import(pathToFileURL(root+'/experiments/characters/keqing/mechanics.mjs')),r=await import(pathToFileURL(root+'/experiments/characters/keqing/rewards.mjs'));
 // Deliberately weak fixture isolates progression, not natural balance evidence.
 const route=Array.from({length:3},()=>[{hp:1,block:0,intent:3}]);
 const run=keqingRun({catalog:[]},b,r,m.describe,{seed:37,mode:'run'},route);
 function act(c){return run.dispatch({revision:run.view().revision,...c});}
 act({type:'end'});assert.equal(run.view().hp,57);
 for(let i=0;i<3;i++){
  for(let guard=0;guard<30&&!['reward','complete','defeat'].includes(run.view().outcome);guard++){
   const v=run.view();if(v.pending){act({type:'choose',token:v.pending.token,instance:v.pending.options[0].instance});continue;}
   let did=false;for(let slot=1;slot<=v.hand.length;slot++){if(act({type:'play',slot,target:1}).ok){did=true;break;}}
   if(!did)act({type:'end'});
  }
  const v=run.view();assert.equal(v.outcome,i===2?'complete':'reward');
  if(i<2){const snapshot=run.view();assert.equal(act({type:'claim',choice:3}).ok,false);assert.deepEqual(run.view(),snapshot);
   const command={type:i===0?'claim':'proceed',choice:1,revision:v.revision};assert.equal(run.dispatch(command).ok,true);assert.equal(run.view().hp,v.hp);assert.equal(run.view().energy,3);assert.equal(run.view().deckSize,11);assert.equal(run.dispatch(command).ok,false);}
 }
 assert.equal(act({type:'end'}).ok,false);assert.equal(act({type:'proceed'}).ok,false);
});
test('next room construction failure retains reward and death offers nothing',{skip:!root},async()=>{
 const b=await import(pathToFileURL(root+'/experiments/characters/keqing/battle.mjs')),m=await import(pathToFileURL(root+'/experiments/characters/keqing/mechanics.mjs')),r=await import(pathToFileURL(root+'/experiments/characters/keqing/rewards.mjs'));
 let calls=0;const broken={...b,createBattle:args=>{if(++calls>1)throw Error('room unavailable');return b.createBattle(args);}};
 const run=keqingRun({catalog:[]},broken,r,m.describe,{seed:37,mode:'run'},[[{hp:1,block:0,intent:0}],[{hp:1,block:0,intent:0}]]);
 for(let g=0;g<30&&run.view().outcome!=='reward';g++){
  const v=run.view();let did=false;for(let slot=1;slot<=v.hand.length;slot++){if(run.dispatch({type:'play',revision:run.view().revision,slot,target:1}).ok){did=true;break;}}
  if(!did)run.dispatch({type:'end',revision:run.view().revision});
 }
 assert.equal(run.view().outcome,'reward');const before=run.view();const result=run.dispatch({type:'claim',choice:1,revision:before.revision});assert.equal(result.ok,false);assert.deepEqual(run.view(),before);
 const dead=keqingRun({catalog:[]},b,r,m.describe,{seed:37,mode:'run'},[[{hp:999,block:0,intent:999}]]);
 dead.dispatch({type:'end',revision:0});assert.equal(dead.view().outcome,'defeat');assert.equal(dead.view().reward,null);assert.equal(dead.dispatch({type:'proceed',revision:1}).ok,false);
});
