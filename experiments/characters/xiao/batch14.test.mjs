import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn,startTurn,cardText} from './model.mjs';
import {newBattle} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`two hits armor, mask per-hit and dead target not transferred upgraded=${upgraded}`,()=>{
  for(const mask of [0,1]){
   const s=state({hand:['x35'],enemies:[{hp:40,block:5},{hp:40,block:0}]});s.mask=mask;
   const r=play(s,{index:0,upgraded});assert.equal(r.state.enemies[0].hp,45-2*((upgraded?6:4)+(mask?4:0)));assert.equal(r.state.enemies[1].hp,40);
   const dead=state({hand:['x35'],enemies:[{hp:1,block:0},{hp:40,block:0}]});assert.equal(play(dead,{index:0,upgraded}).state.enemies[1].hp,40);
  }
 });
 test(`masked draw once per attack card not hit, and once per turn upgraded=${upgraded}`,()=>{
  let s=state({energy:4,hand:['x36','x35','x01'],draw:['x02','x03','x06','x08']});s.mask=2;
  s=play(s,{index:0,upgraded}).state;assert.equal(s.maskedDrawUsed,false);
  s=play(s,{index:0}).state;assert.equal(s.hand.length,upgraded?3:2);assert.equal(s.maskedDrawUsed,true);
  const drawn=s.draw.length;s=play(s,{index:0}).state;assert.equal(s.draw.length,drawn);
 });
}
test('exit attack counts starting mask, not ending mask; no-mask attack does not consume trigger',()=>{
 let s=state({hand:['x01','x36','x11'],energy:5,draw:['x02']});
 s=play(s,{index:0}).state;assert.equal(s.maskedDrawUsed,false);s=play(s,{index:0}).state;s.mask=1;
 s=play(s,{index:0}).state;assert.equal(s.mask,0);assert.equal(s.maskedDrawUsed,true);assert.deepEqual(s.hand,['x02']);
});
test('trigger reset, capped hand, empty draw consumed, new combat empty',()=>{
 let s=state({hand:['x36','x35'],energy:4});s.mask=3;s=play(s,{index:0}).state;s=play(s,{index:0}).state;assert.equal(s.maskedDrawUsed,true);
 const n=startTurn(endTurn(s));assert.equal(n.maskedDrawUsed,false);
 assert.equal(newBattle().maskedAttackDraw,0);assert.equal(newBattle().maskedDrawUsed,false);
 const full=state({hand:['x35',...Array(9).fill('x01')],draw:['x02','x03']});full.mask=1;full.maskedAttackDraw=2;
 const r=play(full,{index:0});assert.equal(r.state.hand.length,10);assert.equal(r.state.draw.length,1);
});
test('new base/upgrade cancellation and fault roll back damage, counters and zones',()=>{
 for(const id of ['x35','x36'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]);
  const s=state({hand:[id],draw:['x01']});s.mask=2;s.maskedAttackDraw=1;
  assert.deepEqual(play(s,{index:0,upgraded,cancel:true}).state,s);
  try{c[key].push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded}).state,s);}finally{c[key]=old;}
 }
});
test('previous power and exit energy exact safe boundary behavior',()=>{
 const a=state({hand:['x33']});a.calmDraw=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(a,{index:0}).state,a);
 const b=state({hand:['x34'],energy:Number.MAX_SAFE_INTEGER});b.mask=1;
 assert.equal(play(b,{index:0}).state.energy,Number.MAX_SAFE_INTEGER);assert.deepEqual(play(b,{index:0,upgraded:true}).state,b);
});
