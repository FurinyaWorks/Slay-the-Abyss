import test from 'node:test';
import assert from 'node:assert/strict';
import {cards,initialState,play,endTurn,textFor} from './model.mjs';
const run = (id,s=initialState(),upgraded=false) => play({...s, instances:{...s.instances,[s.hand[0]]:{id,upgraded}}},{id,instance:s.hand[0],upgraded,target:'enemy'});
const expected = [[6,9],[5,8],[12,16],[14,18],[24,32],[4,6]];
for (const [i,c] of cards.entries()) for (const upgrade of [false,true]) {
  test(`${c.id} ${upgrade?'upgrade':'base'} independent effect and payment`,()=>{
    const s=initialState(); if(i===3)s.jade=6;
    const r=run(c.id,s,upgrade); assert.equal(r.ok,true);
    assert.equal(r.state.energy,3-c.cost);
    const value=expected[i][Number(upgrade)];
    if([0,3,4].includes(i))assert.equal(r.state.enemy.hp,40-value);
    if([1,5].includes(i))assert.equal(r.state.block,value);
    if(i===2)assert.equal(r.state.jade,value);
    if(i===3)assert.equal(r.state.jade,0);
    if(i===5)assert.equal(r.state.jade,upgrade?4:3);
    assert.equal(r.state.hand.length,5); assert.deepEqual(r.state.discard,['a']);
    assert.equal(s.energy,3); assert.equal(s.enemy.hp,40);
  });
}
test('cancel and rejected payments/targets are atomic',()=>{
  for(const options of [{id:'zl03',cancel:true},{id:'zl04',target:'enemy'},{id:'zl01',target:'other'},{id:'none'}]){
    const s=initialState(), before=structuredClone(s);
    const r=play(s,{instance:'a',...options}); assert.equal(r.ok,false); assert.equal(r.state,s); assert.deepEqual(s,before);
  }
  const s=initialState(); s.energy=0; assert.equal(run('zl03',s).ok,false);
});
test('saturation, repeated application and jade 0..20 boundary',()=>{
  for(let jade=0;jade<=20;jade++)for(const u of [false,true]){
    const s=initialState(); s.jade=jade;
    assert.equal(run('zl03',s,u).state.jade,Math.min(20,jade+(u?16:12)));
    assert.equal(run('zl04',s,u).ok,jade>=6);
  }
  let s=initialState(); for(let n=0;n<100;n++){s.energy=3;s.hand=[`c${n}`]; s=run('zl03',s).state;} assert.equal(s.jade,20);
});
test('block first then persistent jade, multihit and overkill clamp',()=>{
  const s=initialState(); s.block=4;s.jade=8;
  const r=endTurn(s,[5,6]);assert.equal(r.hp,60);assert.equal(r.jade,1);assert.equal(r.block,0);
  assert.equal(endTurn(r,[100]).hp,0);assert.equal(endTurn(r,[]).jade,1);
});
test('dead target/battle rejects play and enemy cannot act after kill',()=>{
  const s=initialState();s.enemy.hp=6;
  const r=run('zl01',s).state;assert.equal(r.enemy.hp,0);assert.equal(endTurn(r,[100]).hp,60);
  assert.equal(run('zl01',r).ok,false);
});
test('armor and lethal minus/at/plus one',()=>{
  for(const hp of [5,6,7]){const s=initialState();s.enemy.hp=hp;assert.equal(run('zl01',s).state.enemy.hp,Math.max(0,hp-6));}
  const s=initialState();s.enemy.block=8;const r=run('zl01',s).state;assert.equal(r.enemy.hp,40);assert.equal(r.enemy.block,2);
});
test('opposite reachable choices: conversion kills now, preserving shield survives big hit',()=>{
  const s=initialState();s.jade=6;s.enemy.hp=14;
  assert.equal(endTurn(run('zl04',s).state,[15]).hp,60);
  assert.equal(endTurn(run('zl01',s).state,[15]).hp,51);
  s.hp=5;s.enemy.hp=40;s.energy=1; // Last remaining action: defensive follow-up is unaffordable.
  const spent=run('zl04',s).state;assert.equal(run('zl02',spent).ok,false);assert.equal(run('zl06',spent).ok,false);
  assert.equal(endTurn(spent,[10]).hp,0);
  assert.equal(endTurn(run('zl01',s).state,[10]).hp,1);
});
test('source then payoff affordable at 3 energy; reverse order illegal with zero jade',()=>{
  const s=initialState();assert.equal(run('zl04',s).ok,false);
  const r=run('zl04',run('zl03',s).state);assert.equal(r.ok,true);assert.equal(r.state.energy,0);assert.equal(r.state.jade,6);
});
test('played instance cannot be replayed; no zero-cost refund loop',()=>{
  const s=initialState(); const r=run('zl01',s).state;
  assert.equal(play(r,{id:'zl01',instance:'a',target:'enemy'}).ok,false);
  assert.ok(cards.every(c=>c.cost>0));assert.ok(cards.every(c=>[...c.base,...c.upgraded].every(([op])=>!['energy','draw','recover'].includes(op))));
});
test('text shares effects, explicit expected upgrade card text',()=>{
  assert.equal(textFor('zl04',true),'1能量；消耗6点玉璋；造成18点伤害。');
  assert.equal(textFor('zl06'),'1能量；获得4点格挡；获得3点玉璋（上限20）。');
});
test('malformed states/hits fail before mutation',()=>{
  const s=initialState();assert.throws(()=>endTurn(s,[-1]));assert.throws(()=>endTurn(s,[NaN]));
  s.jade=21;assert.throws(()=>run('zl03',s));
});

test('card identity cannot be substituted by command',()=>{const s=initialState();assert.equal(play(s,{id:'zl05',instance:'a',target:'enemy'}).ok,false);});

test('upgrade comes from instance, invalid flags rollback',()=>{for(const upgraded of [true,'false',1,null]){const s=initialState();const r=play(s,{id:'zl01',instance:'a',target:'enemy',upgraded});assert.equal(r.ok,false);assert.equal(r.state,s);assert.equal(s.energy,3);assert.equal(s.enemy.hp,40);}});
