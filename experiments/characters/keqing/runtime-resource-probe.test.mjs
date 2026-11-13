import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {cards} from './mechanics.mjs';
import {compileRuntimeProbe,starterResourceProbe} from './runtime-bridge.mjs';
import {toLua,buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('starter resource exporter rejects unhandled card/container/value semantics',()=>{
 for(const mutate of [c=>c.exhaust=true,c=>c.effects.onExhaust=[],c=>c.effects.base[0].attacks=3,c=>c.effects.base[0].setup=NaN,c=>c.effects.base[0].release=-1,c=>c.effects.base=Object.assign(new Array(1),{extra:{}})]){
 const definitions=structuredClone(cards);mutate(definitions.KQ003);
 assert.throws(()=>starterResourceProbe({definitions}),/unsupported/);
 }
});
test('actual Lua starter setup/recast/infusion finite lifecycle and real draw lock',()=>{
 buildLuaData();const p=starterResourceProbe(),defs=[p.definition,...['KQ001','KQ002','KQ054','KQ042','KQ046'].map(x=>compileRuntimeProbe(x))];
 const dir=mkdtempSync(join(tmpdir(),'keqing-resource-'));const file=join(dir,'test.lua');
 writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local R=require('runtime-resource-probe')
local C=require('abyss_combat')
local D=require('abyss_data')
local defs=${toLua(defs)}
local contract=${toLua(p.contract)}
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
local function uid(s,id)for _,c in ipairs(s.hand)do if c.cardId==id then return c.uid end end error('missing '..id)end
for _,up in ipairs({false,true})do
 local s=R.new(D,defs,contract,{deck={{cardId='KQ003',upgraded=up},{cardId='KQ003',upgraded=up},'KQ054'},enemies={'jaw_worm'},seed=42})
 s.enemies[1].hp=100;s.enemies[1].maxHp=100
 local old=C.copy(s);local a=assert(R.play(s,uid(s,'KQ003'),1))
 eq(s.energy,old.energy);eq(s.enemies[1].hp,100)
 eq(a.keqingResourceProbe.wedgeUntil,2);eq(a.enemies[1].hp,up and 93 or 95)
 local b=assert(R.play(a,uid(a,'KQ003'),1));eq(b.keqingResourceProbe.infusion,2);eq(b.keqingResourceProbe.wedgeUntil,nil)
 local c=assert(R.play(b,uid(b,'KQ054'),1))
 eq(c.keqingResourceProbe.infusion,1);eq(c.enemies[1].hp,up and 70 or 75)
 eq(c.catalog.cards.KQ054.effects[1].value,2) -- temporary infusion never edits canonical card
 local d=assert(R.endTurn(c));eq(d.keqingResourceProbe.infusion,0);eq(d.turn,2)
 local bad=R.new(D,defs,contract,{deck={'KQ003'},enemies={'jaw_worm'},seed=42})
 local no,reason=R.play(bad,uid(bad,'KQ003'),99);eq(no,nil);eq(reason,'invalid_target');eq(bad.energy,3);eq(bad.keqingResourceProbe.wedgeUntil,nil)
 bad.energy=0;no,reason=R.play(bad,uid(bad,'KQ003'),1);eq(no,nil);eq(reason,'insufficient_energy')
end
local s=R.new(D,defs,contract,{deck={'KQ003'},enemies={'jaw_worm'},seed=42})
s=assert(R.play(s,uid(s,'KQ003'),1));s=assert(R.endTurn(s));eq(s.keqingResourceProbe.wedgeUntil,2)
s=assert(R.endTurn(s));eq(s.keqingResourceProbe.wedgeUntil,nil)
for _,up in ipairs({false,true})do
 local deck={{cardId='KQ046',upgraded=up}}
 for i=1,11 do deck[#deck+1]='KQ001' end
 local z=R.new(D,defs,contract,{deck=deck,enemies={'jaw_worm'},seed=42})
 local found
 for _,c in ipairs(z.hand)do if c.cardId=='KQ046' then found=c.uid end end
 if not found then for i,c in ipairs(z.draw)do if c.cardId=='KQ046' then z.hand[1],z.draw[i]=c,z.hand[1];found=c.uid;break end end end
 z=assert(R.play(z,found,1));eq(#z.hand,up and 8 or 7)
 local n=#z.hand;C.draw(z,1);eq(#z.hand,n)
 z=assert(R.endTurn(z));eq(#z.hand,5)
end
for _,field in ipairs({'attacks','setup','release'})do
 local bad=C.copy(contract);bad.base[field]=field=='attacks' and 3 or -1
 local ok=pcall(R.new,D,defs,bad,{deck={'KQ003'},enemies={'jaw_worm'},seed=42});eq(ok,false)
 local state=R.new(D,defs,contract,{deck={'KQ003'},enemies={'jaw_worm'},seed=42})
 state.keqingResourceContract=bad
 ok=pcall(R.play,state,uid(state,'KQ003'),1);eq(ok,false);eq(state.energy,3)
end
print('RESOURCE_PROBE_PASS')
`);
 try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/RESOURCE_PROBE_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}
});
