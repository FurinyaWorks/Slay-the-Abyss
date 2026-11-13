import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {compileConditional,buildConditional} from './compile-conditional.mjs';
const cards=JSON.parse(readFileSync(new URL('./source-candidates.json',import.meta.url))).cards;
test('seven source definitions preserve independent expected costs and values',()=>{
 const expected={'17':[2,8,14,11,17],'19':[1,5,8,7,10],'35':[1,2,5,3,7],'32':[1,3,6,4,8],'41':[1,3,5,4,7],'42':[1,3,6,4,8],'45':[1,4,4,6,5]};const out=buildConditional();assert.equal(out.cards.length,7);
 for(const c of out.cards){const [cost,a,b,u,v]=expected[c.id.slice(-2)];assert.equal(c.cost,cost);assert.equal(c.upgrade.cost,cost);assert.equal(c.effects[0].amount,a);assert.equal(c.effects[0].bonus,b);assert.equal(c.upgrade.effects[0].amount,u);assert.equal(c.upgrade.effects[0].bonus,v);assert.ok(c.text.includes(`${a+b}点`));assert.ok(c.upgradeText.includes(`${u+v}点`));assert.equal(c.productionEnabled,false);}
});
test('conditional compilation rejects mismatched source and hidden semantics',()=>{
 for(const id of ['17','19','35','32','41','42','45'])for(const mutate of [c=>c.base.effects[0].op='draw',c=>c.retain=true,c=>c.base.effects[0].bonus=2147483647,c=>c.base.effects[0][Symbol('extra')]=true,c=>c.base.effects.firstOnly=true,c=>c.upgrade.ethereal=true]){const c=structuredClone(cards.find(x=>x.id==='ganyu-'+id));mutate(c);assert.throws(()=>compileConditional(c));}
 assert.throws(()=>compileConditional(cards.find(c=>c.id==='ganyu-44')));
});
