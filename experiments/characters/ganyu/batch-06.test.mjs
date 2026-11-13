import test from 'node:test';import assert from 'node:assert/strict';
import {initial,play,endTurn,startTurn,cardText} from './engine.mjs';
const setup=(id,up=false)=>({...initial([{hp:90,block:0,intent:18}]),hand:[{id,upgraded:up}]});
test('11 zero cost protects without refund or free charge and retains bank budget',()=>{
 for(const up of [false,true]) {const s=setup('ganyu-11',up);s.energy=2;const o=play(s,0);assert.equal(o.block,up?5:3);assert.equal(o.energy,2);assert.equal(o.charge,0);const e=endTurn(o);assert.equal(e.charge,2);assert.equal(e.hp,up?47:45);assert.equal(e.hand.length,0);assert.equal(e.discard.length,1);assert.equal(s.discard.length,0);assert.match(cardText('ganyu-11',up),new RegExp(`0能量.*${up?5:3}点格挡`));}
});
test('12 independent base/upgraded target armor, damage and defense values',()=>{
 for(const up of [false,true]) {const s=setup('ganyu-12',up);s.enemies[0].block=2;const o=play(s,0,0);assert.equal(o.enemies[0].hp,up?86:88);assert.equal(o.block,up?4:3);assert.equal(o.energy,2);assert.throws(()=>play(s,0,9),/invalid target/);assert.match(cardText('ganyu-12',up),new RegExp(`${up?6:4}点伤害.*${up?4:3}点格挡`));}
});
test('13 single card burst cover leaves one energy but no intrinsic charge',()=>{
 for(const up of [false,true]) {const s=setup('ganyu-13',up);const o=play(s,0);assert.equal(o.energy,1);assert.equal(o.charge,0);assert.equal(o.block,up?18:14);assert.equal(endTurn(o).hp,up?60:56);assert.equal(endTurn(o).charge,1);assert.match(cardText('ganyu-13',up),new RegExp(`2能量.*${up?18:14}点格挡`));}
});
test('14 bank denied by full price, field expires after two independent ticks',()=>{
 for(const up of [false,true]) {const s=setup('ganyu-14',up);s.enemies[0].intent=0;const o=play(s,0);assert.equal(o.energy,0);assert.equal(o.block,up?11:8);assert.deepEqual(o.storm,{amount:up?4:3,turns:2});const a=endTurn(o);assert.equal(a.charge,0);assert.equal(a.enemies[0].hp,up?86:87);const b=endTurn(startTurn(a));assert.equal(b.enemies[0].hp,up?82:84);assert.equal(b.storm,null);assert.equal(endTurn(startTurn(b)).enemies[0].hp,b.enemies[0].hp);assert.match(cardText('ganyu-14',up),new RegExp(`3能量.*${up?11:8}点格挡.*2个回合.*${up?4:3}点伤害`));s.energy=2;const before=structuredClone(s);assert.throws(()=>play(s,0),/unpayable/);assert.deepEqual(s,before);}
});
test('all four candidates reachable after ordinary next-turn draw, not injected directly to hand',()=>{
 for(const id of ['ganyu-11','ganyu-12','ganyu-13','ganyu-14'])for(const up of [false,true]){const s=initial([{hp:90,block:0,intent:0}]);s.draw=[{id,upgraded:up}];const next=startTurn(endTurn(s));assert.equal(next.hand[0].id,id);const o=play(next,0,id==='ganyu-12'?0:null);assert.equal(o.discard[0].id,id);assert.equal(o.discard[0].upgraded,up);assert.equal(next.draw.length,0);assert.equal(o.phase,'player');}
});
