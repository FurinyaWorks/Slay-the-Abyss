import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {compileCard,build} from './compile.mjs';
const cards=JSON.parse(readFileSync(new URL('./source-candidates.json',import.meta.url))).cards;
test('twenty-two staged definitions preserve independent base/up values and 53 remain unmapped',()=>{
 const r=build();assert.equal(r.cards.length,22);assert.equal(r.unmapped.length,53);assert.equal(r.productionEnabled,false);
 assert.deepEqual(r.cards.filter(c=>["ganyu_lab_01","ganyu_lab_02","ganyu_lab_22","ganyu_lab_24"].includes(c.id)).map(c=>[c.cost,c.effects.map(e=>e.value),c.upgrade.cost,c.upgrade.effects.map(e=>e.value)]),[[1,[6],1,[9]],[1,[5],1,[8]],[1,[4,1],1,[6,1]],[1,[3],1,[4]]]);
 assert.equal(r.cards.find(c=>c.id==="ganyu_lab_24").exhaust,true);assert.ok(r.cards.every(c=>c.reviewStatus==='HOLD'&&!c.productionEnabled));
});
test('unsupported resources, retention, malformed effects and target fail closed',()=>{
 assert.throws(()=>compileCard(cards.find(c=>c.id==='ganyu-03')));
 for(const mutate of [c=>c.retain=true,c=>c.condition="only_attacks_in_hand",c=>c.costMode="all_energy",c=>c.ethereal=true,c=>c.exhaust="true",c=>c.base.retain=true,c=>c.upgrade.extra=1,c=>c.base.effects[0].op='charge',c=>c.base.effects[0].amount=NaN,c=>c.base.effects[0].amount=2147483648,c=>c.base.cost=2147483648,c=>c.base.effects[0].extra=1,c=>c.target='all',c=>c.upgrade.cost=-1,c=>c.review.human_approved=true]){
 const c=structuredClone(cards[0]);mutate(c);assert.throws(()=>compileCard(c));}
});

test('native AOE target and generated dual-version card text remain structured',()=>{
 const r=build(),four=r.cards.find(c=>c.id==='ganyu_lab_04'),free=r.cards.find(c=>c.id==='ganyu_lab_55');
 assert.equal(four.target,'ALL_ENEMY');assert.deepEqual(four.effects,[{op:'block',value:6},{op:'damageAll',value:3}]);
 assert.equal(four.text,'获得6点格挡。对所有敌人造成3点伤害。');
 assert.equal(free.upgradeText,'获得3点格挡。抽1张牌。消耗。');
});

test('native retain is explicit boolean, combined exhaust retained and resource retain still blocked',()=>{
 const r=build();assert.equal(r.cards.filter(c=>c.selfRetain).length,5);const c=r.cards.find(c=>c.id==='ganyu_lab_28');assert.equal(c.selfRetain,true);assert.equal(c.exhaust,true);assert.equal(c.text,'对所有敌人造成16点伤害。保留。消耗。');
 const bad=structuredClone(cards.find(c=>c.id==='ganyu-26'));bad.retain='true';assert.throws(()=>compileCard(bad));
 assert.throws(()=>compileCard(cards.find(c=>c.id==='ganyu-27')));
});

test('ordinary compiler rejects hidden/accessor/prototype fields and sparse or empty effect arrays',()=>{
 for(const id of ['ganyu-01','ganyu-04'])for(const pick of [c=>c,c=>c.base,c=>c.upgrade,c=>c.base.effects[0],c=>c.upgrade.effects[0],c=>c.base.effects,c=>c.upgrade.effects]){
  for(const mutate of [o=>o[Symbol('extra')]=true,o=>Object.defineProperty(o,'firstOnly',{value:true}),o=>Object.setPrototypeOf(o,{extra:true}),o=>Object.defineProperty(o,Array.isArray(o)?'0':Object.keys(o)[0],{get(){throw Error('getter evaluated');},configurable:true})]){
   const c=structuredClone(cards.find(x=>x.id===id));mutate(pick(c));assert.throws(()=>compileCard(c),/unsupported paid schema|invalid effect array|unsupported effect array field/);
  }
 }
 for(const level of ['base','upgrade'])for(const mode of ['empty','sparse']){const c=structuredClone(cards[0]);if(mode==='empty')c[level].effects=[];else delete c[level].effects[0];assert.throws(()=>compileCard(c),/effect array/);}
});
test('ordinary compiler keeps the committed 22-card Lua bytes unchanged',()=>{const url=new URL('./definitions.lua',import.meta.url);const before=readFileSync(url,'utf8');build();assert.equal(readFileSync(url,'utf8'),before);});
