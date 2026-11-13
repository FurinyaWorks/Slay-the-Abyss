import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,cardText} from './model.mjs';
import {newBattle,advance} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`fortify before exit shield, zero and capped existing shield upgraded=${upgraded}`,()=>{
  for(const block of [0,5,40]){const s=state({hand:['x73']});s.block=block;s.mask=2;s.exitGuard=4;const r=play(s,{index:0,upgraded});assert.equal(r.state.block,block+Math.min(block,upgraded?30:20)+4);assert.equal(r.state.mask,0);assert.equal(r.state.energy,1);assert.deepEqual(r.state.exhaust,['x73']);}
 });
 test(`public first skill fuel then draw and own exhaust upgraded=${upgraded}`,()=>{
  const s=state({hand:['x74','x01','x06','x02'],draw:['x03','x05','x07']});s.exhaustGuard=2;
  const r=play(s,{index:0,upgraded});assert.deepEqual(r.state.exhaust,['x06','x74']);assert.equal(r.state.block,4);assert.deepEqual(r.state.hand.slice(0,2),['x01','x02']);assert.equal(r.state.hand.length,upgraded?5:4);
  const empty=state({hand:['x74','x01'],draw:['x02']});const n=play(empty,{index:0,upgraded});assert.deepEqual(n.state.draw,['x02']);assert.equal(n.state.energy,2);assert.deepEqual(n.state.exhaust,['x74']);
 });
 test(`bank exact remaining duration before exit, delayed through real enemy upgraded=${upgraded}`,()=>{
  for(const mask of [0,1,3]){const s=newBattle();s.hand=['x75'];s.mask=mask;const r=play(s,{index:0,upgraded});assert.equal(r.state.reservedBlock,mask*(upgraded?6:4));assert.equal(r.state.block,0);assert.equal(r.state.mask,0);const n=advance(r.state);assert.equal(n.hp,62);assert.equal(n.block,mask*(upgraded?6:4));assert.equal(n.reservedBlock,0);}
 });
 test(`final forms costs cancel fault and text upgraded=${upgraded}`,()=>{
  for(const id of ['x73','x74','x75']){const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]),s=state({hand:[id,'x02'],draw:['x01','x03','x05']});s.mask=2;s.block=5;assert.deepEqual(play(s,{index:0,upgraded,cancel:true}).state,s);assert.deepEqual(play({...s,energy:0},{index:0,upgraded}).state,{...s,energy:0});try{c[key].push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded}).state,s);}finally{c[key]=old;}assert.ok(!cardText(c,upgraded).includes('undefined'));}
 });
}
test('new scalar resource overflow returns full input, bank exit draws cannot escape',()=>{
 for(const id of ['x73','x75']){const s=state({hand:[id],draw:['x01']});s.mask=3;s.exitDraw=1;if(id==='x73')s.block=Number.MAX_SAFE_INTEGER;else s.reservedBlock=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(s,{index:0}).state,s);}
});
test('fuel consumes exit but does not cancel mask risk; real shuffle fault preserves RNG',()=>{
 const c=catalog.cards.find(c=>c.id==='x74'),old=structuredClone(c.base),s=state({hand:['x74','x06']});s.discard=['x01','x02'];s.deckMode='shuffle';s.rng=8;s.mask=1;
 const r=play(s,{index:0});assert.equal(r.state.mask,1);assert.deepEqual(r.state.exhaust,['x06','x74']);assert.equal(r.state.hand.length,2);
 try{c.base.push({op:'fault',value:0});assert.deepEqual(play(s,{index:0}).state,s);}finally{c.base=old;}
});
test('previous exit draw exact upper bound and current lethal enemy prevents reserved shield',()=>{
 for(const upgraded of [false,true]){const s=state({hand:['x71']});s.exitDraw=Number.MAX_SAFE_INTEGER-(upgraded?2:1);assert.equal(play(s,{index:0,upgraded}).state.exitDraw,Number.MAX_SAFE_INTEGER);s.exitDraw++;assert.deepEqual(play(s,{index:0,upgraded}).state,s);const b=newBattle();b.hp=8;b.hand=['x72'];const n=advance(play(b,{index:0,upgraded}).state);assert.equal(n.hp,0);assert.equal(n.block,0);assert.equal(n.reservedBlock,upgraded?7:5);}
});
