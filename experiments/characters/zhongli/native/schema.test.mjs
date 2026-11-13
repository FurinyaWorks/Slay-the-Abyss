import test from 'node:test';
import assert from 'node:assert/strict';
import {cards} from '../model.mjs';
import {validateCard,compile} from './export.mjs';
test('native schema rejects unknown or malformed semantics before conversion',()=>{
 const mutations=[c=>c.base[0].push({condition:'jade'}),c=>c.onExhaust={},c=>c.base[0][1]=-1,c=>c.upgraded[0][1]=NaN,c=>c.base[0][1]=Infinity,c=>c.cost=-1,c=>c.cost=1.5,c=>c.exhaust='false',c=>c.power=1,c=>c.selfRetain=null,c=>c.target='all',c=>c.rarity='legendary',c=>c.approval='PASS',c=>c.sourceVerified=true,c=>delete c.role,c=>delete c.base[0],c=>delete c.base[0][1],c=>c.base.extra=true,c=>c.base[0].extra=true,c=>c[Symbol('hook')]=true,c=>Object.defineProperty(c,'cost',{get(){throw Error('getter must not execute');}}),c=>Object.setPrototypeOf(c,{hook:true}),c=>c.base[0][1]=Number.MAX_SAFE_INTEGER+1];
 for(const mutate of mutations){const c=structuredClone(cards[0]);mutate(c);assert.throws(()=>validateCard(c),/Unsupported native card schema/);}
});
test('all frozen candidates validate; only known op definitions admitted',()=>{
 for(const c of cards)assert.equal(validateCard(c),true);
 const inventory=compile();assert.equal(inventory.length,75);assert.equal(inventory.filter(x=>x.ready).length,16);
 const c=structuredClone(cards[0]);c.base[0][0]='newHook';assert.equal(validateCard(c),true);
 // Unknown valid-shaped operations are retained as missingOps, never dropped.
 const original=cards[0].base;try{cards[0].base=c.base;const r=compile()[0];assert.equal(r.ready,false);assert.equal(r.definition,false);assert.deepEqual(r.missingOps,['newHook']);}finally{cards[0].base=original;}
});
