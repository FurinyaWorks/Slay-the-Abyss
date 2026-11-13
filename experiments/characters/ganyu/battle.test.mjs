import test from 'node:test';import assert from 'node:assert/strict';
import { createBattle,nextBattleTurn } from './battle.mjs';
import { endTurn,play,catalogue } from './engine.mjs';
const enemies=[{hp:999,block:0,intent:0}];
const count=s=>s.hand.length+s.draw.length+s.discard.length+s.exhausted.length;
test('initial draw, deterministic shuffle and card conservation across reshuffles',()=>{
 let s=createBattle(enemies,37);assert.equal(s.hand.length,5);assert.equal(count(s),10);
 assert.deepEqual(s,createBattle(enemies,37));
 for(let i=0;i<20;i++){s=nextBattleTurn(endTurn(s));assert.equal(count(s),10);assert.equal(s.hand.length,5);}
});
test('ordered core at bottom drawn on second turn, saturation waiting visible',()=>{
 const deck=catalogue.starting_deck.map(id=>({id}));const s=createBattle(enemies,37,deck,true);
 assert.equal(s.hand.some(c=>c.id==='ganyu-03'),false);
 const next=nextBattleTurn(endTurn(s));assert.equal(next.charge,2);assert.equal(next.hand.some(c=>c.id==='ganyu-03'),true);
});
test('reshuffle cannot redraw in-hand played cards, cancel cannot consume RNG',()=>{
 const s=createBattle(enemies,37);const cancelled=play(s,0,null,true);assert.deepEqual(cancelled,s);
 let q=nextBattleTurn(endTurn(s));q=nextBattleTurn(endTurn(q));
 assert.equal(count(q),10);assert.equal(q.discard.length,0);assert.equal(q.draw.length,5);
});
test('malformed seed/deck/phase never mutates caller',()=>{
 for(const seed of [0,-1,NaN,1.5,4294967296])assert.throws(()=>createBattle(enemies,seed));
 assert.throws(()=>createBattle(enemies,1,[{id:'missing'}]));
 const s=createBattle(enemies,37),before=structuredClone(s);assert.throws(()=>nextBattleTurn(s),/between/);assert.deepEqual(s,before);
});

test('40-card bottom core is unavailable until turn8 even with full charge',async()=>{
 const deck=Array.from({length:39},()=>({id:'ganyu-02'}));deck.push({id:'ganyu-03'});
 let s=createBattle(enemies,37,deck,true);
 for(let turn=1;turn<8;turn++){assert.equal(s.hand.some(c=>c.id==='ganyu-03'),false);s=nextBattleTurn(endTurn(s));if(turn>=1)assert.equal(s.charge,2);}
 assert.equal(s.turn,8);assert.equal(s.hand.some(c=>c.id==='ganyu-03'),true);
});
