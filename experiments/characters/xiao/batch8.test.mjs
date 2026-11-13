import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,cardText} from './model.mjs';
import {newBattle,battlePlay} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`all-energy defense zero/one/many upgraded=${upgraded}`,()=>{
  for(const energy of [0,1,3,5]){const s=state({energy,hand:['x23']});const r=play(s,{index:0,upgraded});
   assert.equal(r.state.energy,0);assert.equal(r.state.block,energy*(upgraded?7:5));assert.deepEqual(r.state.discard,['x23']);}
 });
 test(`attack discard keeps skills/powers, draws count plus upgrade=${upgraded}`,()=>{
  const s=state({hand:['x24','x01','x03','x02','x14'],draw:['x06','x09','x20']});const r=play(s,{index:0,upgraded});
  assert.deepEqual(r.state.hand,upgraded?['x02','x14','x06','x09','x20']:['x02','x14','x06','x09']);assert.deepEqual(r.state.discard,['x01','x03','x24']);assert.equal(r.state.energy,2);
  assert.ok(cardText(catalog.cards.find(c=>c.id==='x24'),upgraded).includes(upgraded?'加1':'张数的牌'));
 });
}
test('no attack yields no bonus draw even upgraded, full hand respects cap',()=>{
 const s=state({hand:['x24','x02'],draw:['x01']});const r=play(s,{index:0,upgraded:true});assert.deepEqual(r.state.hand,['x02']);assert.deepEqual(r.state.draw,['x01']);
 const full=state({hand:['x24',...Array(9).fill('x01')],draw:Array(11).fill('x02')});assert.equal(play(full,{index:0,upgraded:true}).state.hand.length,10);
});
test('reshuffle can draw discarded attacks but never resolving x24',()=>{
 const s=newBattle({deck:['x24','x01','x03']});s.hand=['x24','x01','x03'];s.draw=[];s.discard=[];
 const r=battlePlay(s,{index:0,upgraded:true});assert.deepEqual([...r.state.hand].sort(),['x01','x03']);assert.deepEqual(r.state.discard,['x24']);assert.equal(r.state.energy,2);
});
test('new action cancellation, overflow and post-shuffle fault atomically reject',()=>{
 const large=state({energy:Number.MAX_SAFE_INTEGER,hand:['x23']});assert.equal(play(large,{index:0}).ok,false);assert.deepEqual(play(large,{index:0}).state,large);
 const s=newBattle({deck:['x24','x01']});assert.deepEqual(battlePlay(s,{index:s.hand.indexOf('x24'),cancel:true}).state,s);
 const c=catalog.cards.find(c=>c.id==='x24'),old=structuredClone(c.base);
 try{c.base.push({op:'fault',value:0});assert.deepEqual(battlePlay(s,{index:s.hand.indexOf('x24')}).state,s);}finally{c.base=old;}
});
test('life-funded energy then all-energy defense remains finite and loses life',()=>{
 let s=state({hp:10,energy:0,hand:['x17','x23']});s=play(s,{index:0}).state;s=play(s,{index:0}).state;
 assert.equal(s.hp,7);assert.equal(s.energy,0);assert.equal(s.block,10);assert.deepEqual(s.exhaust,['x17']);assert.deepEqual(s.discard,['x23']);
});
