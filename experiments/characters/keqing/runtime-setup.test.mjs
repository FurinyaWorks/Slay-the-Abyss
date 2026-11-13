import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{cards}from'./mechanics.mjs';import{fullStarterProbe}from'./runtime-bridge.mjs';import{setupProbe}from'./runtime-setup.mjs';import{toLua,buildLuaData}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('setup export refuses unhandled setup semantics',()=>{for(const id of ['KQ010','KQ011','KQ013'])for(const change of [c=>c.exhaust=true,c=>c.effects.onExhaust=[],c=>c.effects.base[1].duration=3,c=>c.effects.base[1].op='other',c=>delete c.effects.base[0],c=>c.effects.base[Symbol()]=1]){const d=structuredClone(cards);change(d[id]);assert.throws(()=>setupProbe(id,{definitions:d}),/unsupported/);}});
test('actual Lua non-consuming setup preserves prior expiry and only attacks charge infusion',()=>{
 buildLuaData();const p=fullStarterProbe(),defs=[p.definition,...['KQ010','KQ011','KQ013'].map(id=>setupProbe(id))];const dir=mkdtempSync(join(tmpdir(),'kq-setup-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local R=require('runtime-resource-probe');local A=require('runtime-setup');local D=require('abyss_data')
local defs=${toLua(defs)};local contract=${toLua(p.contract)}
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
local function uid(s,id)for _,c in ipairs(s.hand)do if c.cardId==id then return c.uid end end end
for _,id in ipairs({'KQ010','KQ011','KQ013'})do for _,up in ipairs({false,true})do for wedge=0,2 do for infusion=0,1 do
 local s=R.new(D,defs,contract,{deck={{cardId=id,upgraded=up}},enemies={'jaw_worm','jaw_worm'},seed=1})
 for _,e in ipairs(s.enemies)do e.hp=100;e.maxHp=100 end
 s.keqingResourceProbe.infusion=infusion;if wedge>0 then s.keqingResourceProbe.wedgeUntil=wedge end
 local u=uid(s,id);local no,why=R.play(s,u,1);eq(no,nil);eq(why,'dedicated_setup_adapter_required')
 local a,err,fresh=A.play(s,u,1);assert(a,err);eq(fresh,wedge==0);eq(a.keqingResourceProbe.wedgeUntil,wedge==0 and 2 or wedge)
 eq(a.energy,id=='KQ011'and 1 or 2);eq(s.energy,3);eq(s.enemies[1].hp,100)
 local bonus=infusion>0 and 2 or 0
 if id=='KQ010'then eq(a.player.block,up and 7 or 4);eq(a.enemies[1].hp,100);eq(a.keqingResourceProbe.infusion,infusion)
 else local hit=id=='KQ011'and(up and 16 or 12)or(up and 5 or 3);eq(a.enemies[1].hp,100-hit-bonus);eq(a.enemies[2].hp,id=='KQ013'and(100-hit-bonus)or 100);eq(a.keqingResourceProbe.infusion,0)end
 assert(a.catalog.cards[id].keqingSetup);eq(#a.catalog.cards[id].effects,0)
 if id=='KQ011'then no,why=A.play(s,u,99);eq(no,nil);eq(why,'invalid_target')end
 s.energy=0;no,why,fresh=A.play(s,u,1);eq(no,nil);eq(why,'insufficient_energy');eq(fresh,nil);eq(s.keqingResourceProbe.wedgeUntil,wedge>0 and wedge or nil)
end end end end
-- Two genuine setup sources: the second never refreshes the first expiry.
local s=R.new(D,defs,contract,{deck={'KQ010','KQ013'},enemies={'jaw_worm'},seed=1})
local first,why,fresh=A.play(s,uid(s,'KQ010'),1);assert(first,why);eq(fresh,true)
local second;second,why,fresh=A.play(first,uid(first,'KQ013'),1);assert(second,why);eq(fresh,false);eq(second.keqingResourceProbe.wedgeUntil,2)
print('SETUP_PROBE_PASS')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/SETUP_PROBE_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}
});
