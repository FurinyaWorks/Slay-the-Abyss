import test from 'node:test';import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';import {paidSession} from './keqing-paid-session.mjs';import {parseCommand} from './play-session.mjs';
const root=process.env.KEQING_PAID_ROOT;
test('real paid UI exposes only committed bounded choices and rejects repeat/refund',{skip:!root},async()=>{
 const b=await import(pathToFileURL(root+'/experiments/characters/keqing/battle.mjs'));
 const m=await import(pathToFileURL(root+'/experiments/characters/keqing/mechanics.mjs'));
 for(const id of ['KQ043','KQ044']){
  const deckIds=[id,...b.starterIds],adapter={start:()=>b.createBattle({deckIds,order:deckIds.map((_,i)=>i)}),catalog:[]};
  const session=paidSession(adapter,b,m.describe,{seed:37,mode:'starter'});
  let r=session.dispatch({type:'play',revision:0,slot:1});assert.equal(r.ok,true);assert.equal(r.view.energy,2);assert.equal(r.view.outcome,'choice');
  assert.equal('rng' in r.view,false);assert.equal('draw' in r.view,false);
  const pending=r.view.pending,revision=r.view.revision;
  for(const type of ['reset','cancel','end','play'])assert.equal(session.dispatch({type,revision,slot:1}).ok,false);
  assert.equal(session.dispatch({type:'choose',revision,token:pending.token,instance:'invalid'}).ok,false);
  const c=parseCommand('j '+JSON.stringify({type:'choose',revision,token:pending.token,instance:pending.options[0].instance}));
  r=session.dispatch(c);assert.equal(r.ok,true);assert.equal(r.view.pending,null);assert.equal(session.dispatch(c).ok,false);
 }
});
