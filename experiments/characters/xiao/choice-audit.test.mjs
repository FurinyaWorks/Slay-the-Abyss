// Reachable local state witnesses, not proof of natural reward co-occurrence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn} from './model.mjs';
for(const [a,b] of [['x11','x63'],['x09','x64'],['x48','x74']])test(`${a}/${b} are same-fee same-rarity same-type comparators`,()=>{
 const ca=catalog.cards.find(c=>c.id===a),cb=catalog.cards.find(c=>c.id===b);assert.deepEqual([ca.cost,ca.kind,ca.rarity],[cb.cost,cb.kind,cb.rarity]);
});
for(const upgraded of [false,true]){
 test(`partial retreat preserves attack value but full retreat saves lethal tick upgraded=${upgraded}`,()=>{
  const result=id=>{let s=state({hand:[id,'x01'],enemies:[{hp:70,block:0}]});s.mask=2;s=play(s,{index:0,upgraded}).state;return play(s,{index:0}).state;};
  assert.ok(result('x63').enemies[0].hp<result('x11').enemies[0].hp);
  const dangerous=id=>{const s=state({hp:2,hand:[id],enemies:[{hp:70,block:0}]});s.mask=2;return endTurn(play(s,{index:0,upgraded}).state);};
  assert.equal(dangerous('x11').hp,2);assert.equal(dangerous('x63').hp,0);
 });
 test(`exit draw versus retained stance supply is not unconditional domination upgraded=${upgraded}`,()=>{
  const result=(id,hp)=>{let s=state({hp,hand:[id],draw:['x01','x02','x03'],enemies:[{hp:70,block:0}]});s.mask=2;s=play(s,{index:0,upgraded}).state;return play(s,{index:0}).state;};
  assert.ok(result('x64',70).enemies[0].hp<result('x09',70).enemies[0].hp);
  assert.equal(endTurn(result('x09',2)).hp,2);assert.equal(endTurn(result('x64',2)).hp,0);
 });
 test(`blind top fuel can work without hand skills, public skill fuel can preserve exit upgraded=${upgraded}`,()=>{
  const noFuel=id=>play(state({hand:[id],draw:['x02','x01','x03','x05']}),{index:0,upgraded}).state;
  assert.ok(noFuel('x48').hand.length>noFuel('x74').hand.length);
  const risk=id=>{let s=state({hp:2,hand:[id,'x02'],draw:['x06','x01','x03','x05']});s.mask=1;s=play(s,{index:0,upgraded}).state;const i=s.hand.indexOf('x06');if(i>=0)s=play(s,{index:i}).state;return endTurn(s);};
  assert.equal(risk('x48').hp,0);assert.equal(risk('x74').hp,2);
 });
}
