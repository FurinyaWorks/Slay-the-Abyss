import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn,cardText} from './model.mjs';
import {newBattle,battlePlay} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`x19 burns skill copies only, excludes self, upgraded=${upgraded}`,()=>{
  const s=state({hand:['x19','x02','x02','x01','x14','x09']});s.mask=1;
  const r=play(s,{index:0,upgraded});assert.deepEqual(r.state.hand,['x01','x14']);assert.deepEqual(r.state.exhaust,['x02','x02','x09']);assert.deepEqual(r.state.discard,['x19']);assert.equal(r.state.block,upgraded?18:12);assert.equal(r.state.energy,2);
  assert.ok(cardText(catalog.cards.find(c=>c.id==='x19'),upgraded).includes(upgraded?'6点格挡':'4点格挡'));
 });
 test(`x20 unmasked actual draw, masked no effect still exhaust upgraded=${upgraded}`,()=>{
  for(const mask of [0,2]){const s=state({hand:['x20'],draw:['x01','x02','x03']});s.mask=mask;
   const r=play(s,{index:0,upgraded});assert.equal(r.state.hand.length,mask?0:upgraded?3:2);assert.equal(r.state.energy,3);assert.deepEqual(r.state.exhaust,['x20']);}
 });
}
test('x19 no fuel still pays, can sacrifice lifesaving exit and die to mask',()=>{
 const empty=play(state({hand:['x19']}),{index:0});assert.equal(empty.state.block,0);assert.equal(empty.state.energy,2);
 const s=state({hp:2,hand:['x19','x06']});s.mask=1;const r=play(s,{index:0});assert.equal(r.state.block,4);assert.equal(endTurn(r.state).hp,0);
});
test('burn skill fault restores hand copies and every zone',()=>{
 const c=catalog.cards.find(c=>c.id==='x19'),old=structuredClone(c.upgrade);
 try{c.upgrade.push({op:'fault',value:0});const s=state({hand:['x19','x02','x02']});assert.deepEqual(play(s,{index:0,upgraded:true}).state,s);}finally{c.upgrade=old;}
});
test('x20 true shuffle excludes resolving card and respects full hand',()=>{
 const s=newBattle({deck:['x20']});s.discard=['x01','x02','x03'];
 const r=battlePlay(s,{index:0,upgraded:true});assert.equal(r.state.hand.length,3);assert.ok(!r.state.hand.includes('x20'));assert.deepEqual(r.state.exhaust,['x20']);
 const full=state({hand:['x20',...Array(9).fill('x01')],draw:['x02','x03']});const f=play(full,{index:0});assert.equal(f.state.hand.length,10);assert.deepEqual(f.state.draw,['x03']);
});
test('burned exit cannot subsequently be recovered by x16',()=>{
 let s=state({hand:['x19','x09'],draw:['x16']});s=play(s,{index:0}).state;
 s.hand=['x16'];s=play(s,{index:0}).state;assert.deepEqual(s.hand,[]);assert.deepEqual(s.exhaust,['x09','x16']);assert.deepEqual(s.discard,['x19']);
});
