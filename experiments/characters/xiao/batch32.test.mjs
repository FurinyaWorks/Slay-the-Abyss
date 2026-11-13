import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn,startTurn} from './model.mjs';
import {newBattle,advance} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`exit draw only true active transition, no immediate draw upgraded=${upgraded}`,()=>{
  let s=state({hand:['x71','x06','x09'],energy:4,draw:['x01','x02','x03','x05']});s.mask=2;
  s=play(s,{index:0,upgraded}).state;assert.equal(s.draw.length,4);
  s=play(s,{index:0}).state;assert.equal(s.draw.length,upgraded?2:3);assert.equal(s.mask,0);const before=s.hand.length;
  s=play(s,{index:0}).state;assert.equal(s.hand.length,before-1+2);
  assert.equal(newBattle().exitDraw,0);
 });
 test(`attack reservation no current shield, real next turn upgraded=${upgraded}`,()=>{
  const s=newBattle();s.hand=['x72'];
  const r=play(s,{index:0,upgraded});assert.equal(r.state.block,0);assert.equal(r.state.reservedBlock,upgraded?7:5);assert.equal(r.state.enemies[0].hp,48-(upgraded?6:4));
  const n=advance(r.state);assert.equal(n.hp,62);assert.equal(n.block,upgraded?7:5);assert.equal(n.reservedBlock,0);
 });
}
test('partial shorten and natural expiry no exit draw, shortened-to-zero draws once',()=>{
 for(const mask of [1,2]){
  const s=state({hand:['x27'],draw:['x01','x02']});s.mask=mask;s.exitDraw=1;
  assert.equal(play(s,{index:0}).state.hand.length,mask===1?1:0);
 }
 const s=state({draw:['x01','x02']});s.mask=1;s.exitDraw=2;assert.deepEqual(endTurn(s).draw,['x01','x02']);
});
test('exit draw occurs before entry recovery, full hand may leave recovered card in discard',()=>{
 const s=state({hand:['x70',...Array(9).fill('x01')],draw:['x02','x03']});s.mask=1;s.exitDraw=1;s.discard=['x04'];
 const r=play(s,{index:0,upgraded:true});assert.equal(r.state.hand.length,10);assert.equal(r.state.hand.at(-1),'x02');assert.deepEqual(r.state.discard,['x04']);assert.deepEqual(r.state.draw,['x03']);
});
test('retreat attack uses exit draw before masked attack draw, with both real shuffled',()=>{
 const s=state({hand:['x11'],enemies:[{hp:50,block:0}]});s.mask=1;s.exitDraw=1;s.maskedAttackDraw=1;s.discard=['x01','x02'];s.deckMode='shuffle';s.rng=4;
 const r=play(s,{index:0});assert.equal(r.state.hand.length,2);assert.equal(r.state.mask,0);assert.equal(r.state.maskedDrawUsed,true);assert.deepEqual([...r.state.hand].sort(),['x01','x02']);
});
test('new forms faults/cancel atomic, power/next guard sums overflow, dead target rejects',()=>{
 for(const id of ['x71','x72'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]),s=state({hand:[id]});
  assert.deepEqual(play(s,{index:0,upgraded,cancel:true}).state,s);
  try{c[key].push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded}).state,s);}finally{c[key]=old;}
 }
 const p=state({hand:['x71']});p.exitDraw=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(p,{index:0}).state,p);
 const a=state({hand:['x72']});a.reservedBlock=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(a,{index:0}).state,a);assert.deepEqual(play(a,{index:0,target:99}).state,a);
});
test('exit draw after real shuffle and later fault returns all zones and mask',()=>{
 const c=catalog.cards.find(c=>c.id==='x06'),old=structuredClone(c.base),s=state({hand:['x06']});s.mask=1;s.exitDraw=2;s.discard=['x01','x02'];s.deckMode='shuffle';s.rng=7;
 try{c.base.push({op:'fault',value:0});assert.deepEqual(play(s,{index:0}).state,s);}finally{c.base=old;}
});
test('previous entry draw exact MAX power and full hand recovery precedes upgrade draw',()=>{
 for(const upgraded of [false,true]){
  const s=state({hand:['x69']});s.entryDraw=Number.MAX_SAFE_INTEGER-(upgraded?2:1);assert.equal(play(s,{index:0,upgraded}).state.entryDraw,Number.MAX_SAFE_INTEGER);s.entryDraw++;assert.deepEqual(play(s,{index:0,upgraded}).state,s);
  const full=state({hand:['x70',...Array(9).fill('x01')],draw:['x02']});full.discard=['x04'];const r=play(full,{index:0,upgraded});assert.equal(r.state.hand.at(-1),'x04');assert.deepEqual(r.state.draw,['x02']);
 }
});
