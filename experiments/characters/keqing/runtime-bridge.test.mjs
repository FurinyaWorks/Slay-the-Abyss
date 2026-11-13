import test from 'node:test';import assert from 'node:assert/strict';
import {writeFileSync,mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {compileRuntimeProbe,runtimeSupport} from './runtime-bridge.mjs';
import {cards} from './mechanics.mjs';
import {toLua,buildLuaData} from '../../../scripts/build-lua-data.mjs';
import {runLua} from '../../../scripts/test-lua.mjs';
test('runtime probe fails closed on resources, selection, powers and unknown fields',()=>{
 for(const id of ['KQ003','KQ004','KQ043','KQ044','KQ060','KQ068','KQ075'])assert.throws(()=>compileRuntimeProbe(id),/unsupported/);
 const definitions=structuredClone(cards);
 definitions.KQ001.effects.base[0].condition='new';
 assert.throws(()=>compileRuntimeProbe('KQ001',{definitions}),/unsupported/);
 definitions.KQ001=structuredClone(cards.KQ001);definitions.KQ001.newHook=true;
 assert.throws(()=>compileRuntimeProbe('KQ001',{definitions}),/unsupported/);
 for(const container of [
 {...cards.KQ001.effects,onExhaust:[{op:'draw',amount:2}]},
 {base:{},upgraded:[]},{base:null,upgraded:[]},
 Object.assign(Object.create({onExhaust:[]}),cards.KQ001.effects),
 {base:[,],upgraded:[]},
 {base:Object.assign(new Array(1),{extra:{op:'block',amount:99}}),upgraded:[]}
 ]){
 definitions.KQ001={...cards.KQ001,effects:container};
 assert.throws(()=>compileRuntimeProbe('KQ001',{definitions}),/unsupported/);
 }
 const hidden=[{op:'block',amount:2}];Object.defineProperty(hidden,'onExhaust',{value:[]});
 definitions.KQ001={...cards.KQ001,effects:{base:hidden,upgraded:[]}};
 assert.throws(()=>compileRuntimeProbe('KQ001',{definitions}),/unsupported/);
 assert.equal(runtimeSupport().length,75);
});
test('generated plain subset executes actual Lua Combat with independent base-upgrade assertions',()=>{
 buildLuaData();
 const ids=['KQ001','KQ002','KQ009','KQ019','KQ034','KQ042','KQ052','KQ053','KQ054','KQ055','KQ005'];
 const defs=ids.map(id=>compileRuntimeProbe(id));
 const expected={KQ005:[11,15,0,0],KQ001:[6,9,0,0],KQ002:[0,0,5,8],KQ009:[3,5,4,6],KQ019:[12,16,0,0],KQ034:[0,0,13,17],KQ042:[0,0,0,0],KQ052:[6,9,0,0],KQ053:[16,20,0,0],KQ054:[6,9,0,0],KQ055:[9,12,0,0]};
 const dir=mkdtempSync(join(tmpdir(),'keqing-runtime-'));const file=join(dir,'probe.lua');
 const script=`
package.path="src/lua/?.lua;build/lua/?.lua;"..package.path
local C=require('abyss_combat')
local D=require('abyss_data')
local defs=${toLua(defs)}
local expected=${toLua(expected)}
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
for _,def in ipairs(defs)do
 for _,up in ipairs({false,true})do
  local data=C.copy(D);data.cards.cards[#data.cards.cards+1]=def
  local s=C.new(data,{deck={{cardId=def.id,upgraded=up}},enemies={'jaw_worm'},seed=42})
  s.enemies[1].hp=100;s.enemies[1].maxHp=100;s.enemies[1].block=0
  local uid=s.hand[1].uid;local v=expected[def.id]
  assert(C.play(s,uid,1));eq(s.energy,3-def.cost)
  eq(s.enemies[1].hp,100-v[up and 2 or 1]);eq(s.player.block,v[up and 4 or 3])
  eq(#s.exhaust,def.exhaust and 1 or 0);eq(#s.discard,def.exhaust and 0 or 1)
 end
end
-- Real draw effects with conserved production instances, not an empty-pile no-op.
for _,up in ipairs({false,true})do
 local data=C.copy(D);data.cards.cards[#data.cards.cards+1]=defs[6]
 local s=C.new(data,{deck={{cardId='KQ042',upgraded=up},'strike','strike','strike','strike','strike','strike','strike'},enemies={'jaw_worm'},seed=42})
 local uid
 for _,c in ipairs(s.hand)do if c.cardId=='KQ042' then uid=c.uid end end
 if not uid then for i,c in ipairs(s.draw)do if c.cardId=='KQ042' then s.hand[1],s.draw[i]=c,s.hand[1];uid=c.uid;break end end end
 assert(uid);assert(C.play(s,uid,1));eq(#s.hand,up and 7 or 6);eq(#s.hand+#s.draw+#s.discard+#s.exhaust,8)
end
-- Actual AoE dispatch damages both living enemies.
do
 local data=C.copy(D);data.cards.cards[#data.cards.cards+1]=defs[7]
 local s=C.new(data,{deck={'KQ052'},enemies={'jaw_worm','jaw_worm'},seed=42})
 for _,e in ipairs(s.enemies)do e.hp=100;e.maxHp=100;e.block=0 end
 assert(C.play(s,s.hand[1].uid,1));eq(s.enemies[1].hp,94);eq(s.enemies[2].hp,94)
end
-- Genuine production status ordering, not simplified prototype arithmetic.
local data=C.copy(D);data.cards.cards[#data.cards.cards+1]=defs[1]
local s=C.new(data,{deck={'KQ001'},enemies={'jaw_worm'},seed=42})
s.enemies[1].hp=100;s.enemies[1].block=2;s.enemies[1].statuses.vulnerable=1
s.player.statuses.strength=2;s.player.statuses.weak=1
assert(C.play(s,s.hand[1].uid,1));eq(s.enemies[1].hp,93)
local bad=C.new(data,{deck={'KQ001'},enemies={'jaw_worm'},seed=42})
local uid=bad.hand[1].uid;local seed=bad.seed;local events=#bad.events
local ok,why=C.play(bad,uid,99);eq(ok,false);eq(why,'invalid_target')
eq(bad.energy,3);eq(#bad.hand,1);eq(bad.seed,seed);eq(#bad.events,events)
bad.energy=0;ok,why=C.play(bad,uid,1);eq(ok,false);eq(why,'insufficient_energy');eq(#bad.hand,1)
print('KEQING_RUNTIME_PROBE_PASS 22 versions plus production modifiers and failures')
`;
 try{writeFileSync(file,script);const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/KEQING_RUNTIME_PROBE_PASS/);}
 finally{rmSync(dir,{recursive:true,force:true});}
});
