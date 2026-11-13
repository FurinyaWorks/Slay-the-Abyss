import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,state,play,endTurn,startTurn} from './model.mjs';
import {newBattle,advance} from './battle.mjs';
for(const upgraded of [false,true]){
 test(`energy reserved not immediate, one next turn only upgraded=${upgraded}`,()=>{
  let s=state({hand:['x45']});s=play(s,{index:0,upgraded}).state;
  assert.equal(s.energy,2);assert.equal(s.reservedEnergy,upgraded?3:2);assert.deepEqual(s.exhaust,['x45']);
  s=startTurn(endTurn(s));assert.equal(s.energy,upgraded?6:5);assert.equal(s.reservedEnergy,0);
  s=startTurn(endTurn(s));assert.equal(s.energy,3);
 });
 test(`damage guard actual HP not armor or overkill upgraded=${upgraded}`,()=>{
  const dmg=upgraded?10:7,cap=upgraded?6:4;
  for(const armor of [0,5,20])for(const hp of [1,30]){
   const s=state({hand:['x46'],enemies:[{hp,block:armor}]});s.mask=1;
   const r=play(s,{index:0,upgraded});assert.equal(r.ok,true);
   const loss=Math.min(hp,Math.max(0,dmg+4-armor));assert.equal(r.state.block,Math.min(cap,loss));assert.equal(r.state.hp,70);
  }
 });
}
test('reservation stacks but requires current payment; dead mask never realizes reserve; new battle clears',()=>{
 let s=state({hand:['x45','x45'],energy:2});s=play(s,{index:0}).state;s=play(s,{index:0,upgraded:true}).state;assert.equal(s.energy,0);assert.equal(startTurn(endTurn(s)).energy,8);
 const no=state({hand:['x45'],energy:0});assert.deepEqual(play(no,{index:0}).state,no);
 const dead=state({hand:['x45'],hp:2});dead.mask=1;const ended=endTurn(play(dead,{index:0}).state);assert.equal(startTurn(ended).hp,0);assert.equal(startTurn(ended).reservedEnergy,2);
 assert.equal(newBattle().reservedEnergy,0);
});
test('reserve integer overflow rejects atomically at core start and entire battle advance',()=>{
 const s=state({hand:['x45']});s.reservedEnergy=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(s,{index:0}).state,s);
 s.phase='enemy';assert.deepEqual(startTurn(s),s);
 const b=newBattle();b.reservedEnergy=Number.MAX_SAFE_INTEGER;const copy=structuredClone(b);assert.deepEqual(advance(b),copy);assert.deepEqual(b,copy);
});
test('base and upgraded new effects roll back on post-effect fault including shield and reserve',()=>{
 for(const id of ['x45','x46'])for(const upgraded of [false,true]){
  const c=catalog.cards.find(c=>c.id===id),key=upgraded?'upgrade':'base',old=structuredClone(c[key]),s=state({hand:[id]});
  assert.deepEqual(play(s,{index:0,upgraded,cancel:true}).state,s);
  try{c[key].push({op:'fault',value:0});assert.deepEqual(play(s,{index:0,upgraded}).state,s);}finally{c[key]=old;}
 }
 const shield=state({hand:['x46']});shield.block=Number.MAX_SAFE_INTEGER;assert.deepEqual(play(shield,{index:0}).state,shield);
});
test('previous carry power MAX boundary and ample-slot kill draw then masked draw order',()=>{
 for(const upgraded of [false,true]){
  const s=state({hand:['x44']});s.carryBlock=Number.MAX_SAFE_INTEGER-(upgraded?8:5);
  assert.equal(play(s,{index:0,upgraded}).state.carryBlock,Number.MAX_SAFE_INTEGER);s.carryBlock++;assert.deepEqual(play(s,{index:0,upgraded}).state,s);
 }
 const s=state({hand:['x43'],draw:['x01','x02','x03','x05'],enemies:[{hp:1,block:0},{hp:30,block:0}]});s.mask=1;s.maskedAttackDraw=1;
 const r=play(s,{index:0});assert.deepEqual(r.state.hand,['x01','x02','x03']);assert.deepEqual(r.state.draw,['x05']);assert.equal(r.state.enemies[1].hp,30);
});
test('campaign end restores complete input when delayed energy cannot be represented',async()=>{
 const {newCampaign,campaignAction}=await import('./campaign.mjs');const c=newCampaign(1);c.battle.reservedEnergy=Number.MAX_SAFE_INTEGER;
 const before=structuredClone(c);const r=campaignAction(c,{type:'end'});assert.deepEqual(r.state,c);assert.deepEqual(c,before);
});
