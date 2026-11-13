import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattle,starterIds,createChoiceSession,useCard,playerView} from './battle.mjs';
for(const id of ['KQ043','KQ044'])for(const upgraded of [false,true])for(const recycle of [false,true])test(`paid continuation ${id} ${upgraded} recycle=${recycle}`,()=>{
 const deckIds=[id,...starterIds],s=createBattle({deckIds,order:deckIds.map((_,i)=>i)});s.hand[0].upgraded=upgraded;
 if(recycle){s.discard.push(...s.draw);s.draw=[];}
 const before=structuredClone(s),session=createChoiceSession(s),first=session.begin(0,'starter-0',0);
 assert.deepEqual(s,before);assert.equal(first.energy,2);
 assert.equal('draw' in first,false);assert.equal('rng' in first,false);
 if(first.pending){
   assert.equal(first.phase,'choice');assert.equal(first.hand.some(c=>c.instance==='starter-0'),false);
   assert.equal(first.pending.inUse.instance,'starter-0');
   const snapshot=session.view();
   for(const action of [()=>session.end(1),()=>session.begin(1,'starter-1',0),()=>session.resume(0,first.pending.token,'starter-1'),()=>session.resume(1,'wrong','starter-1'),()=>session.resume(1,first.pending.token,'missing')]){assert.throws(action);assert.deepEqual(session.view(),snapshot);}
   const selected=first.pending.options.at(-1).instance;
   first.pending.options[0].id='poison';first.hand.length=0;assert.deepEqual(session.view(),snapshot);
   const resolved=session.resume(1,snapshot.pending.token,selected);
   const expected=playerView(useCard(s,'starter-0',0,{choose:()=>selected}));
   const {revision,pending,discardChoices,...visible}=resolved;assert.equal(revision,2);assert.equal(pending,null);assert.deepEqual(visible,expected);
   assert.throws(()=>session.resume(1,snapshot.pending.token,selected));
 }else{assert.equal(id,'KQ044');assert.equal(recycle,true);const {revision,pending,discardChoices,...visible}=first;assert.deepEqual(visible,playerView(useCard(s,'starter-0',0,{choose:()=>{throw Error('no options')}})));}
});
test('paid inspect empty/locked and insufficient energy never expose hidden choices',()=>{
 for(const locked of [false,true]){
  const deckIds=['KQ044',...starterIds],s=createBattle({deckIds,order:deckIds.map((_,i)=>i)});
  if(locked)s.drawLocked=true;else s.hand.push(...s.draw.splice(0,5));
  const session=createChoiceSession(s),v=session.begin(0,'starter-0',0);
  // Playing removes one hand slot: ten-card input still leaves room for inspect.
  if(locked){assert.equal(v.pending,null);assert.equal(v.hand.length,4);}
  else {assert.equal(v.pending.options.length,1);assert.equal(v.hand.length,9);}
 }
 const s=createBattle({deckIds:['KQ043',...starterIds],order:Array.from({length:11},(_,i)=>i)});s.energy=0;
 const session=createChoiceSession(s),before=session.view();assert.throws(()=>session.begin(0,'starter-0',0),/energy/);assert.deepEqual(session.view(),before);
});
test('caller mutation after begin cannot alter continuation or reveal view',()=>{
 const deckIds=['KQ043',...starterIds],s=createBattle({deckIds,order:deckIds.map((_,i)=>i)}),baseline=structuredClone(s);
 const session=createChoiceSession(s),v=session.begin(0,'starter-0',0),key=v.pending.options[0].instance;
 s.draw.length=0;s.hp=0;s.hand[0].id='invalid';
 const {revision,pending,discardChoices,...visible}=session.resume(1,v.pending.token,key);
 assert.deepEqual(visible,playerView(useCard(baseline,'starter-0',0,{choose:()=>key})));
});

test('session exposes detached public discard for move, never hidden draw',()=>{
 const deckIds=['KQ045',...starterIds],s=createBattle({deckIds,order:deckIds.map((_,i)=>i)});s.discard.push(...s.hand.splice(1,1));
 const session=createChoiceSession(s),v=session.view(),key=v.discardChoices[0].instance;v.discardChoices[0].id='bad';
 const out=session.begin(0,'starter-0',0,{move:key});
 assert.equal(out.discardChoices.some(c=>c.instance===key),false);assert.equal('draw' in out,false);
 assert.equal(s.discard[0].id==='bad',false);
});
