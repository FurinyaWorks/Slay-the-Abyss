import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn} from './model.mjs';
import {newBattle,battlePlay,advance,outcome,intent} from './battle.mjs';
test('relic triggers once on successful entry, never cancelled/failed entry',()=>{
  let s=state({hand:['x04','x06','x04'],draw:['x01','x02'],startingRelic:true});
  assert.equal(play(s,{index:0,cancel:true}).state.relicUsed,false);
  s=play(s,{index:0}).state;assert.equal(s.relicUsed,true);assert.deepEqual(s.hand,['x06','x04','x01']);assert.equal(s.draw.length,1);
  s=play(s,{index:0}).state;s=play(s,{index:0}).state;assert.equal(s.draw.length,1);
  const low=state({hp:2,hand:['x04'],startingRelic:true});assert.deepEqual(play(low,{index:0}).state,low);
});
test('relic empty deck consumes trigger without deferred refill; fresh combat resets use',()=>{
  let s=state({hand:['x04'],startingRelic:true});s=play(s,{index:0}).state;assert.equal(s.relicUsed,true);assert.equal(s.hand.length,0);
  assert.equal(newBattle().relicUsed,false);
});
test('same seed gives same deck, opening has five, no free turn draw',()=>{
  assert.deepEqual(newBattle({seed:42}),newBattle({seed:42}));const s=newBattle();assert.equal(s.hand.length,5);assert.equal(s.draw.length,5);assert.equal(s.turn,1);
  assert.throws(()=>newBattle({seed:-1}));assert.throws(()=>newBattle({encounter:'invalid'}));
});
test('enemy intent, block and next-turn reset independent oracle',()=>{
  let s=newBattle({encounter:'swarm'});s.block=8;s=advance(s);
  assert.equal(s.hp,66);assert.equal(s.block,0);assert.equal(s.energy,3);assert.equal(s.turn,2);assert.equal(s.hand.length,5);assert.equal(intent(s,s.enemies[0]),7);
});
test('mask lethal stops before enemies, victory stops end-turn costs',()=>{
  let s=newBattle();s.hp=2;s.mask=1;const dead=advance(s);assert.equal(dead.hp,0);assert.equal(dead.turn,1);assert.equal(outcome(dead),'defeat');assert.deepEqual(advance(dead),dead);
  s=newBattle();s.enemies[0].hp=0;s.mask=2;assert.deepEqual(advance(s),s);assert.equal(outcome(s),'victory');
});
test('reshuffle preserves card multiset across repeated pass turns',()=>{
  let s=newBattle({seed:37});for(const e of s.enemies)e.intent=[0];
  for(let i=0;i<10;i++){s=advance(s);assert.deepEqual([...s.hand,...s.draw,...s.discard].sort(),[...catalog.starter].sort());assert.equal(s.hand.length,5);}
});
test('preparation shuffle on rejected/cancelled play rolls back RNG and piles',()=>{
  let s=newBattle();s.hand=['x04'];s.draw=[];s.discard=['x01','x02'];
  assert.deepEqual(battlePlay(s,{index:0,cancel:true}).state,s);s.energy=0;assert.deepEqual(battlePlay(s,{index:0}).state,s);
});
test('relic reshuffle excludes resolving card',()=>{
  let s=newBattle();s.hand=['x04'];s.draw=[];s.discard=['x01'];s=battlePlay(s,{index:0}).state;
  assert.deepEqual(s.hand,['x01']);assert.deepEqual(s.discard,['x04']);assert.equal(s.relicUsed,true);
});
test('bad intent and RNG reject atomically without corrupting life or block',()=>{
  for(const mutate of [s=>s.enemies[0].intent=[],s=>s.enemies[0].intent=[NaN],s=>s.enemies[0].intent=[-10],s=>s.enemies[0].intent=[Infinity],s=>delete s.rng,s=>s.rng=-1,s=>s.rng=4294967296]){
    const s=newBattle();mutate(s);const before=structuredClone(s);assert.deepEqual(advance(s),before);assert.equal(battlePlay(s,{index:0}).ok,false);assert.deepEqual(s,before);
  }
});
test('ten-card hand gets one free slot before relic draw and no overflow',()=>{
  const s=state({hand:['x04',...Array(9).fill('x01')],draw:['x02','x03'],startingRelic:true});
  const next=play(s,{index:0}).state;assert.equal(next.hand.length,10);assert.equal(next.hand[9],'x02');assert.deepEqual(next.draw,['x03']);assert.equal(next.relicUsed,true);
});
test('failure after relic draw rolls back RNG, piles, life and used flag',()=>{
  const card=catalog.cards.find(c=>c.id==='x04');const effects=structuredClone(card.base);
  try {
    card.base.push({op:'fault',value:1});const s=newBattle();s.hand=['x04'];s.draw=[];s.discard=['x01','x02'];
    const before=structuredClone(s);const result=battlePlay(s,{index:0});assert.equal(result.reason,'effect');assert.deepEqual(result.state,before);assert.deepEqual(s,before);
  } finally {card.base=effects;}
});
