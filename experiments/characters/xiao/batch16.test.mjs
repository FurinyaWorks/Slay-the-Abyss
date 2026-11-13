import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,cardText} from './model.mjs';
import {observe,choose} from './research.mjs';
for(const upgraded of [false,true]){
 test(`prepare first public discarded attack without draw or duplication upgraded=${upgraded}`,()=>{
  const s=state({hand:['x39','x08'],draw:['x02']});s.discard=['x06','x03','x01'];
  let r=play(s,{index:0,upgraded});assert.equal(r.ok,true);assert.equal(r.state.block,upgraded?7:4);
  assert.deepEqual(r.state.hand,['x08']);assert.deepEqual(r.state.draw,['x03','x02']);assert.deepEqual(r.state.discard,['x06','x01','x39']);
  r=play(r.state,{index:0});assert.deepEqual(r.state.hand,['x03','x02']);assert.equal(r.state.draw.length,0);
 });
 test(`living enemies only, defense cap upgraded=${upgraded}`,()=>{
  for(const count of [1,2,3,4]){
   const s=state({hand:['x40'],enemies:[{hp:0,block:0},...Array.from({length:count},()=>({hp:30,block:0}))]});s.mask=1;
   const r=play(s,{index:0,target:99,upgraded});assert.equal(r.ok,true);assert.equal(r.state.block,Math.min(3,count)*(upgraded?6:4));assert.equal(r.state.mask,1);
  }
 });
}
test('empty discard, exhausted attack and draw attack do not supply preparation',()=>{
 const s=state({hand:['x39'],draw:['x01']});s.exhaust=['x03'];s.discard=['x02'];
 const r=play(s,{index:0});assert.equal(r.state.block,4);assert.deepEqual(r.state.draw,['x01']);assert.deepEqual(r.state.exhaust,['x03']);
});
test('preparation still costs energy, does not trigger draw power and cannot return itself',()=>{
 const s=state({energy:0,hand:['x39']});assert.deepEqual(play(s,{index:0}).state,s);
 const a=state({hand:['x39']});a.mask=1;a.maskedAttackDraw=2;a.discard=['x39','x03'];
 const r=play(a,{index:0});assert.equal(r.state.maskedDrawUsed,false);assert.equal(r.state.hand.length,0);assert.deepEqual(r.state.draw,['x03']);
});
test('all new forms have derived texts and atomic cancellation, overflow and post-move fault',()=>{
 for(const id of ['x39','x40'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]);
  assert.ok(cardText(c,upgraded).includes(id==='x39'?'弃牌堆':'存活敌人'));
  const s=state({hand:[id],draw:['x02']});s.discard=['x03'];s.deckMode='shuffle';s.rng=4;const copy=structuredClone(s);
  assert.deepEqual(play(s,{index:0,upgraded,cancel:true}).state,s);
  try{c[key].push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded}).state,s);assert.deepEqual(s,copy);}finally{c[key]=old;}
  s.block=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(s,{index:0,upgraded}).state,s);
 }
});
test('greedy proxy accepts all candidate attacks without missing damage effect crash',()=>{
 for(const c of catalog.cards.filter(c=>c.kind==='attack')){
  const s=state({hand:[c.id],enemies:[{hp:50,block:0,intent:[8]}]});s.block=10;
  assert.doesNotThrow(()=>choose(observe(s),'guard'));
 }
});
