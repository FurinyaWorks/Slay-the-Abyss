import test from 'node:test';
import assert from 'node:assert/strict';
import {state,play,endTurn,startTurn,catalog,cardText} from './model.mjs';
import {newBattle,battlePlay,advance} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`x17 life threshold, energy single-turn and exhaust upgraded=${upgraded}`,()=>{
  const low=state({hp:3,hand:['x17'],energy:0});assert.deepEqual(play(low,{index:0,upgraded}).state,low);
  const r=play(state({hp:4,hand:['x17'],energy:0}),{index:0,upgraded});assert.equal(r.state.hp,1);assert.equal(r.state.energy,upgraded?3:2);assert.deepEqual(r.state.exhaust,['x17']);
  const next=startTurn(endTurn(r.state));assert.equal(next.energy,3);assert.equal(next.hp,1);
  assert.ok(cardText(catalog.cards.find(c=>c.id==='x17'),upgraded).includes(upgraded?'3点能量':'2点能量'));
 });
 test(`x18 group finisher costs two, takes bonus before exit upgraded=${upgraded}`,()=>{
  const s=state({hand:['x18'],hp:2,enemies:[{hp:40,block:4},{hp:40,block:0}]});s.mask=2;
  const r=play(s,{index:0,upgraded});assert.equal(r.state.energy,1);assert.equal(r.state.enemies[0].hp,upgraded?16:22);assert.equal(r.state.enemies[1].hp,upgraded?12:18);assert.equal(r.state.mask,0);assert.deepEqual(r.state.exhaust,['x18']);assert.equal(endTurn(r.state).hp,2);
  const poor=state({hand:['x18'],energy:1});assert.deepEqual(play(poor,{index:0,upgraded}).state,poor);
 });
}
test('energy overflow or later fault rolls back life and resources',()=>{
 const s=state({hand:['x17'],energy:Number.MAX_SAFE_INTEGER});assert.equal(play(s,{index:0}).ok,false);assert.deepEqual(play(s,{index:0}).state,s);
 const c=catalog.cards.find(c=>c.id==='x17'),old=structuredClone(c.base);
 try{c.base.push({op:'fault',value:0});const q=state({hp:4,hand:['x17']});assert.deepEqual(play(q,{index:0}).state,q);}finally{c.base=old;}
});
test('masked resource spending can still cause lethal tick, no refund',()=>{
 const s=state({hp:4,hand:['x17'],energy:0});s.mask=1;const r=play(s,{index:0});assert.equal(endTurn(r.state).hp,0);assert.deepEqual(r.state.exhaust,['x17']);
});
test('finite energy into finisher and retrieval cannot recycle exhausted card',()=>{
 let s=newBattle({deck:['x17','x18','x16'],hp:20});s.energy=0;s.mask=1;
 s=battlePlay(s,{index:s.hand.indexOf('x17')}).state;assert.equal(s.energy,2);
 s=battlePlay(s,{index:s.hand.indexOf('x18')}).state;assert.equal(s.energy,0);assert.equal(s.mask,0);assert.deepEqual(s.exhaust,['x17','x18']);
 s.energy=1;s=battlePlay(s,{index:s.hand.indexOf('x16')}).state;assert.deepEqual(s.hand,[]);assert.deepEqual(s.exhaust,['x17','x18','x16']);assert.equal(s.energy,0);
});
test('retrieve one-cost exit requires two total energy and consumes both cards correctly',()=>{
 let s=newBattle({deck:['x16']});s.discard=['x09'];const before=s.energy;
 s=battlePlay(s,{index:0}).state;s=battlePlay(s,{index:s.hand.indexOf('x09')}).state;assert.equal(s.energy,before-2);assert.deepEqual(s.exhaust,['x16']);assert.deepEqual(s.discard,['x09']);
});
