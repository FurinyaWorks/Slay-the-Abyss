import test from 'node:test';import assert from 'node:assert/strict';
import {createBattle,starterIds,useCard,finishTurn,playerView,previewVisible} from './battle.mjs';
const make=(id,up)=>{const s=createBattle({deckIds:[...starterIds,id],order:[10,0,1,2,3,4,5,6,7,8,9],relic:false,enemies:[{hp:100,block:0,intent:12},{hp:100,block:0,intent:7}]});s.hand[0].upgraded=up;return s;};
for(const up of [false,true]) for(const id of ['KQ023','KQ029','KQ032','KQ037'])test('batch9 condition and actual damage '+id+' '+up,()=>{
 for(const resource of [false,true]){
  const s=make(id,up);s.infusion=resource?1:0;s.wedgeUntil=resource?2:null;const old=structuredClone(s);
  const r=useCard(s,'starter-10',0),p=previewVisible(playerView(s),'starter-10',0);
  assert.deepEqual(r.enemies,p.enemies);assert.equal(r.block,p.block);assert.deepEqual(s,old);assert.deepEqual(useCard(s,'starter-10',0,{cancel:true}),s);
  const reduction=id==='KQ037'?2:resource?({'KQ023':3,'KQ029':2,'KQ032':4}[id]):0;
  const block=id==='KQ029'?(up?7:4):id==='KQ037'?(up?9:6):0;
  assert.equal(r.block,block);assert.equal(r.enemies[0].attackReduction??0,reduction);
  assert.equal(r.enemies[1].attackReduction??0,id==='KQ029'?reduction:0);
  assert.equal(r.wedgeUntil,['KQ029','KQ032'].includes(id)?null:s.wedgeUntil);
  const after=finishTurn(r);assert.equal(after.hp,60-Math.max(0,19-reduction*(id==='KQ029'?2:1)-block));
  assert.ok(after.enemies.every(e=>e.attackReduction===undefined));assert.equal(after.block,0);
  assert.equal(r.exhaust.length,id==='KQ037'?1:0);
 }
});
test('batch9 maximum not additive, minimum zero, expires through idle and fresh combat',()=>{
 let s=make('KQ037',false);s.enemies[0].attackReduction=4;s.enemies[0].intent=1;s.enemies[1].intent=0;
 s=useCard(s,'starter-10',0);assert.equal(s.enemies[0].attackReduction,4);s=finishTurn(s);assert.equal(s.hp,60);assert.ok(s.enemies.every(e=>e.attackReduction===undefined));
 assert.ok(createBattle().enemies.every(e=>e.attackReduction===undefined));
});
test('batch9 lethal target does not redirect control; invalid state rejected unchanged',()=>{
 const s=make('KQ032',false);s.enemies[0].hp=1;s.wedgeUntil=2;const r=useCard(s,'starter-10',0);assert.equal(r.wedgeUntil,null);assert.ok(r.enemies.every(e=>e.attackReduction===undefined));
 for(const value of [-1,NaN,5]){const bad=make('KQ037',false);bad.enemies[0].attackReduction=value;const old=structuredClone(bad);assert.throws(()=>useCard(bad,'starter-10',0),/reduction/);assert.deepEqual(bad,old);}
});
test('batch9 lethal enemy phase clears all reductions in terminal snapshot',()=>{
 for(const up of [false,true]){const s=make('KQ029',up);s.hp=1;s.wedgeUntil=2;s.enemies[0].intent=30;const r=finishTurn(useCard(s,'starter-10',0));assert.equal(r.phase,'lost');assert.equal(r.hp,0);assert.ok(r.enemies.every(e=>e.attackReduction===undefined));}
});
