import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {compilePaid,buildPaid} from './compile-paid.mjs';
const cards=JSON.parse(readFileSync(new URL('./source-candidates.json',import.meta.url))).cards;const copy=id=>structuredClone(cards.find(c=>c.id===id));
test('03/06 source effects, base/up costs and generated text',()=>{const result=buildPaid();assert.equal(result.cards.length,2);const [s,c]=result.cards;assert.deepEqual(s.effects,[{op:'ganyuCard',kind:'chargedShot',direct:7,bloom:6}]);assert.deepEqual(s.upgrade.effects,[{op:'ganyuCard',kind:'chargedShot',direct:9,bloom:8}]);assert.equal(c.effects[0].amount,1);assert.equal(c.upgrade.effects[0].amount,2);for(const d of result.cards){assert.equal(d.cost,1);assert.equal(d.upgrade.cost,1);assert.equal(d.productionEnabled,false);assert.equal(d.ganyuCandidate,true);}assert.match(s.upgradeText,/9.*8/);});
test('paid compiler rejects silent semantic loss',()=>{for(const id of ['ganyu-03','ganyu-06'])for(const mutate of [c=>c.ethereal=true,c=>c.exhaust='true',c=>c.retain=true,c=>c.base.cost=NaN,c=>c.upgrade.cost=-1,c=>c.base.retain=true,c=>c.base.effects.push(c.base.effects[0]),c=>c.base.effects[0].unexpected=true,c=>c.target='all',c=>c.production_enabled=true]){const c=copy(id);mutate(c);assert.throws(()=>compilePaid(c));}assert.throws(()=>compilePaid(copy('ganyu-05')));});

test('paid compiler rejects hidden, inherited and accessor semantics before reading them',()=>{
 for(const id of ['ganyu-03','ganyu-06'])for(const pick of [c=>c,c=>c.base,c=>c.upgrade,c=>c.base.effects[0],c=>c.upgrade.effects[0],c=>c.base.effects,c=>c.upgrade.effects]){
  for(const alter of [o=>o[Symbol('semantic')]=true,o=>Object.defineProperty(o,'firstOnly',{value:true}),o=>Object.setPrototypeOf(o,{firstOnly:true}),o=>Object.defineProperty(o,Array.isArray(o)?'0':Object.keys(o)[0],{get(){throw Error('accessor evaluated');},configurable:true})]){
   const c=copy(id);alter(pick(c));assert.throws(()=>compilePaid(c),/unsupported paid schema|single effect required/);
  }
 }
 for(const id of ['ganyu-03','ganyu-06']){const c=copy(id);delete c.base.effects[0];assert.throws(()=>compilePaid(c),/single effect required/);}
});
