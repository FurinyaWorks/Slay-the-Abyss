import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn,cardText} from './model.mjs';
for(const upgraded of [false,true]){
 test(`attack then shorten mask without removing early bonus upgraded=${upgraded}`,()=>{
  for(const mask of [0,1,2,3]){
   const s=state({hand:['x63'],enemies:[{hp:50,block:2}]});s.mask=mask;s.exitGuard=4;
   const r=play(s,{index:0,upgraded});assert.equal(r.ok,true);assert.equal(r.state.enemies[0].hp,52-(upgraded?11:8)-(mask?4:0));assert.equal(r.state.mask,Math.max(0,mask-1));assert.equal(r.state.block,mask===1?4:0);
  }
 });
 test(`stance supply strictly branches mask versus calm upgraded=${upgraded}`,()=>{
  for(const mask of [0,1,3]){
   const s=state({hand:['x64'],draw:['x01','x02','x03','x05']});s.mask=mask;
   const r=play(s,{index:0,upgraded});assert.equal(r.state.hand.length,mask?(upgraded?3:2):0);assert.equal(r.state.block,mask?0:upgraded?9:6);assert.equal(r.state.mask,mask);
  }
 });
}
test('shorten last turn avoids lethal tick, longer mask still lethal; supply follows resulting stance',()=>{
 for(const mask of [1,2]){
  let s=state({hp:2,hand:['x63','x64'],draw:['x01','x02'],enemies:[{hp:50,block:0}]});s.mask=mask;
  s=play(s,{index:0}).state;s=play(s,{index:0}).state;assert.equal(s.block,mask===1?6:0);assert.equal(endTurn(s).hp,mask===1?2:0);
 }
});
test('masked attack draw uses initial stance even when shortening exits; no entry event',()=>{
 const s=state({hand:['x63'],draw:['x02'],startingRelic:true});s.mask=1;s.maskedAttackDraw=1;s.entryGuard=6;
 const r=play(s,{index:0});assert.equal(r.state.maskedDrawUsed,true);assert.deepEqual(r.state.hand,['x02']);assert.equal(r.state.relicUsed,false);assert.equal(r.state.block,0);
});
test('supply real shuffle and hand cap; calm branch never touches hidden draw or rng',()=>{
 const s=state({hand:['x64']});s.mask=1;s.deckMode='shuffle';s.rng=4;s.discard=['x01','x02'];const r=play(s,{index:0});assert.equal(r.state.hand.length,2);assert.equal(r.state.hand.includes('x64'),false);
 s.mask=0;const calm=play(s,{index:0});assert.equal(calm.state.rng,4);assert.deepEqual(calm.state.discard,['x01','x02','x64']);
 const full=state({hand:['x64',...Array(9).fill('x01')],draw:['x02','x03','x05']});full.mask=1;const q=play(full,{index:0,upgraded:true});assert.equal(q.state.hand.length,10);assert.equal(q.state.draw.length,2);
});
test('all forms and both supply branches fault/cancel rollback; no energy or invalid attack target reject',()=>{
 for(const id of ['x63','x64'])for(const upgraded of [false,true])for(const mask of [0,1]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]),s=state({hand:[id]});s.mask=mask;s.exitGuard=4;s.discard=['x01','x02'];s.deckMode='shuffle';s.rng=3;const before=structuredClone(s);
  assert.ok(cardText(c,upgraded));assert.deepEqual(play(s,{index:0,upgraded,cancel:true}).state,s);
  try{c[key].push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded}).state,s);assert.deepEqual(s,before);}finally{c[key]=old;}
  s.energy=0;assert.deepEqual(play(s,{index:0,upgraded}).state,s);
 }
 const s=state({hand:['x63']});s.mask=1;assert.deepEqual(play(s,{index:0,target:99}).state,s);
 const overflow=state({hand:['x64']});overflow.block=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(overflow,{index:0}).state,overflow);
});
test('previous pierce last kill retains MAX enemy shield, draws through power but cannot continue',()=>{
 for(const upgraded of [false,true]){
  const s=state({hand:['x61'],draw:['x01'],enemies:[{hp:1,block:Number.MAX_SAFE_INTEGER}]});s.mask=1;s.maskedAttackDraw=1;
  const r=play(s,{index:0,upgraded});assert.equal(r.state.enemies[0].block,Number.MAX_SAFE_INTEGER);assert.deepEqual(r.state.hand,['x01']);assert.equal(play(r.state,{index:0}).reason,'combat-ended');
 }
});
