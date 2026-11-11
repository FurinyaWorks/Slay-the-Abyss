import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateQualityRatchet as evaluate} from '../scripts/quality-ratchet-policy.mjs';

const fn=(name,complexity,line=2)=>({id:'$/M.'+name+'#1',name:'M.'+name,kind:'function',complexity,line});
const mod=(name,funcs=[],lines=40)=>({file:'src/lua/'+name+'.lua',lines,
  functions:[{id:'$',name:'<chunk>',kind:'chunk',complexity:1,line:1},...funcs]});
const cycle=(members,pairs)=>({members,edges:pairs.map(([from,to])=>({from,to,line:1}))});
const check=(beforeModules=[],afterModules=[],beforeCycles=[],afterCycles=[])=>
  evaluate({beforeModules,afterModules,beforeCycles,afterCycles});

test('new CC16 fails while CC15 passes and unrelated old debt is grandfathered',()=>{
  const old=mod('old',[fn('large',72)]);
  assert.deepEqual(check([old],[old]),[]);
  assert.deepEqual(check([],[mod('new',[fn('fine',15)])]),[]);
  const errors=check([old],[old,mod('new',[fn('tooBig',16,8)])]);
  assert.equal(errors.length,1);assert.match(errors[0].message,/CC new -> 16/);assert.equal(errors[0].line,8);
});
test('old high CC cannot increase; improvements and low debt within limit are permitted',()=>{
  const old=mod('a',[fn('large',72)]);
  assert.equal(check([old],[mod('a',[fn('large',73)])]).length,1);
  assert.deepEqual(check([old],[mod('a',[fn('large',20)])]),[]);
  assert.equal(check([old],[mod('a',[fn('large',70),fn('new',16)])]).length,1);
  assert.equal(check([mod('a',[fn('small',15)])],[mod('a',[fn('small',16)])]).length,1);
});
test('new modules have a line budget; existing oversized owners cannot grow',()=>{
  assert.equal(check([],[mod('new',[],1001)]).length,1);
  const old=mod('huge',[],1300);
  assert.deepEqual(check([old],[old]),[]);
  assert.equal(check([old],[mod('huge',[],1301)]).length,1);
  assert.deepEqual(check([old],[mod('huge',[],1299)]),[]);
});
test('new, expanded or denser SCC is blocked; unchanged and eliminated SCC are fine',()=>{
  const old=[cycle(['a','b'],[['a','b'],['b','a']])];
  assert.equal(check([],[],[],[cycle(['x','y'],[['x','y'],['y','x']])]).length,1);
  assert.equal(check([],[],old,[cycle(['a','b','c'],[['a','b'],['b','c'],['c','a']])]).length,1);
  assert.equal(check([],[],old,[cycle(['a','b'],[['a','b'],['b','a'],['a','a']])]).length,1);
  assert.deepEqual(check([],[],old,old),[]);
  assert.deepEqual(check([],[],old,[]),[]);
});
test('splitting a large SCC is allowed but its internal edge allowance cannot expand',()=>{
  const old=[cycle(['a','b','c','d'],[['a','b'],['b','a'],['b','c'],['c','d'],['d','a']])];
  const next=[cycle(['a','b'],[['a','b'],['b','a']]),cycle(['c','d'],[['c','d'],['d','c']])];
  assert.deepEqual(check([],[],old,next),[]);
  assert.equal(check([],[],old,[cycle(['a','b'],[['a','b'],['b','a'],['a','a']]),
    cycle(['c','d'],[['c','d'],['d','c'],['c','c']])]).length,1);
});
test('missing/corrupt measurements fail closed',()=>{
  assert.throws(()=>check([],[{file:'src/lua/a.lua',lines:2,functions:[{id:'$',kind:'chunk',complexity:null,line:1}]}]),/Invalid candidate function/);
  assert.throws(()=>check([],[mod('a'),mod('a')]),/duplicate candidate module/);
  assert.throws(()=>check([],[],[],[{members:['a','b'],edges:[{from:'a',to:'not-a-member'}]}]),/Invalid candidate SCC edge/);
});
