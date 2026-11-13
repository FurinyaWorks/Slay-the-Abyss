import test from 'node:test';
import assert from 'node:assert/strict';
import {state,play,endTurn,startTurn,catalog,cardText} from './model.mjs';
import {newBattle,battlePlay,advance,intent} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`suppression changes actual current enemy damage only upgraded=${upgraded}`,()=>{
  let s=newBattle({deck:['x31'],hp:40});s=battlePlay(s,{index:0,upgraded}).state;
  assert.equal(intent(s,s.enemies[0]),upgraded?2:4);
  const n=advance(s);assert.equal(n.hp,upgraded?38:36);assert.equal(intent(n,n.enemies[0]),10);assert.equal(n.enemies[0].suppression,0);
 });
 test(`covered draw exact threshold and multiple enemies upgraded=${upgraded}`,()=>{
  const block=upgraded?7:4;
  for(const incoming of [block-1,block,block+1]){
   const s=state({hand:['x32'],draw:['x01'],enemies:[{hp:30,block:0,intent:[1]},{hp:30,block:0,intent:[incoming-1]}]});
   const r=play(s,{index:0,upgraded});assert.equal(r.state.hand.length,incoming<=block?1:0);assert.equal(r.state.block,block);
  }
 });
}
test('suppression stacks to zero, enables quiet conditions, expires next turn',()=>{
 let s=state({hand:['x31','x31','x26'],draw:['x01'],enemies:[{hp:100,block:0,intent:[8,12]}]});
 s=play(s,{index:0}).state;s=play(s,{index:0}).state;assert.equal(s.enemies[0].suppression,8);assert.equal(intent(s,s.enemies[0]),0);
 s=play(s,{index:0}).state;assert.deepEqual(s.hand,['x01']);
 const n=startTurn(endTurn(s));assert.equal(intent(n,n.enemies[0]),12);
});
test('covered enemy attack does not imply protection from mask death',()=>{
 const s=state({hp:2,hand:['x32'],draw:['x01'],enemies:[{hp:30,block:0,intent:[0]}]});s.mask=1;
 const r=play(s,{index:0});assert.equal(r.state.hand.length,1);assert.equal(endTurn(r.state).hp,0);
});
test('malformed and overflowing suppression reject complete states',()=>{
 for(const suppression of [-1,NaN,Infinity]){const s=newBattle({deck:['x31']});s.enemies[0].suppression=suppression;assert.deepEqual(battlePlay(s,{index:0}).state,s);assert.deepEqual(advance(s),s);}
 const s=newBattle({deck:['x31']});s.enemies[0].suppression=Number.MAX_SAFE_INTEGER;assert.deepEqual(battlePlay(s,{index:0}).state,s);
});
test('all new variants roll back prior damage/block/shuffle on fault',()=>{
 for(const id of ['x31','x32'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]);
  try{c[key].push({op:'fault',value:0});const s=newBattle({deck:[id],encounter:'respite'});s.discard=['x01'];assert.deepEqual(battlePlay(s,{index:0,upgraded}).state,s);}finally{c[key]=old;}
 }
});
