import test from 'node:test';
import assert from 'node:assert/strict';
import {accessReport,textReport,literalPool} from './audit.mjs';
test('defined but excluded reward cards are surfaced; starter duplicates count once',()=>{
 const r=accessReport(['a','b','c'],['a','a'],['b']);
 assert.deepEqual(r.uncovered,['c']);assert.deepEqual(r.starter,['a']);assert.equal(r.defined,3);
});
test('unknown channel IDs cannot count toward coverage',()=>{
 const r=accessReport(['a','b'],['a'],['missing']);
 assert.deepEqual(r.unknown,['missing']);assert.deepEqual(r.uncovered,['b']);
});
test('duplicate or malformed catalog fails rather than silently deduplicating',()=>{
 for(const ids of [['a','a'],['a',null],[]])assert.throws(()=>accessReport(ids,[],[]));
 assert.throws(()=>accessReport(['a'],[],undefined));
});
test('text contract distinguishes strict boolean renderer from truthy coercion',()=>{
 const loose=textReport(['a'],(_,flag)=>flag?'upgraded':'base')[0];
 assert.deepEqual(loose.acceptedInvalidFlags,['false',1,null]);
 const strict=textReport(['a'],(_,flag)=>{if(typeof flag!=='boolean')throw Error('flag');return flag?'upgraded':'base';})[0];
 assert.deepEqual(strict.acceptedInvalidFlags,[]);assert.deepEqual(strict.errors,[]);
});
test('broken upgraded display is a finding even when base renders',()=>{
 const r=textReport(['a'],(_,flag)=>{if(flag===true)throw Error('missing upgrade');return 'base';})[0];
 assert.deepEqual(r.errors,['upgraded: missing upgrade']);
 assert.equal(textReport(['a'],()=>undefined)[0].errors.length,2);
});
test('fixed private-pool adapter accepts existing quoted lists including whitespace',()=>{
 assert.deepEqual(literalPool("export const rewardPool=Object.freeze(['KQ005','KQ006']);",'rewardPool'),['KQ005','KQ006']);
 assert.deepEqual(literalPool("const POOL = Object.freeze([ 'zl03', 'zl04', ]);",'POOL'),['zl03','zl04']);
});
test('private-pool adapter refuses computation rather than evaluating or guessing',()=>{
 for(const code of ["const POOL=Object.freeze([...other]);","const POOL=Object.freeze(['a', process.exit()]);","const POOL=['a'];"])
 assert.throws(()=>literalPool(code,'POOL'));
});
test('diagnostics do not mutate caller arrays',()=>{
 const ids=Object.freeze(['a','b']),starter=Object.freeze(['a']),reward=Object.freeze(['b']);
 assert.deepEqual(accessReport(ids,starter,reward).uncovered,[]);
});
