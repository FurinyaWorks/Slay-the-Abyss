import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{cards}from'./mechanics.mjs';import{fullStarterProbe}from'./runtime-bridge.mjs';import{detonationProbe}from'./runtime-detonation.mjs';import{toLua,buildLuaData}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('detonation exporter refuses topology drift',()=>{for(const id of ['KQ026','KQ028'])for(const change of [c=>c.exhaust=true,c=>c.effects.onExhaust=[],c=>c.effects.base[0].hits=3,c=>c.effects.base[1].damage=NaN,c=>delete c.effects.base[0],c=>c.effects.base[Symbol()]=1]){const d=structuredClone(cards);change(d[id]);assert.throws(()=>detonationProbe(id,{definitions:d}),/unsupported/);}});
test('actual Lua wedge detonation base/upgrade, whole-card infusion and lethal target',()=>{
 buildLuaData();const p=fullStarterProbe(),defs=[p.definition,...['KQ026','KQ028'].map(id=>detonationProbe(id))];const dir=mkdtempSync(join(tmpdir(),'kq-detonation-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local R=require('runtime-resource-probe');local A=require('runtime-detonation');local D=require('abyss_data')
local defs=${toLua(defs)};local contract=${toLua(p.contract)}
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
local function uid(s,id)for _,c in ipairs(s.hand)do if c.cardId==id then return c.uid end end end
for _,id in ipairs({'KQ026','KQ028'})do for _,up in ipairs({false,true})do for _,wedge in ipairs({false,true})do for infusion=0,2 do
 local s=R.new(D,defs,contract,{deck={{cardId=id,upgraded=up}},enemies={'jaw_worm','jaw_worm'},seed=1})
 for _,e in ipairs(s.enemies)do e.hp=300;e.maxHp=300 end
 s.keqingResourceProbe.infusion=infusion;if wedge then s.keqingResourceProbe.wedgeUntil=2 end
 local u=uid(s,id);local no,why=R.play(s,u,1);eq(no,nil);eq(why,'dedicated_detonation_adapter_required')
 local a=assert(A.play(s,u,1));local bonus=infusion>0 and 2 or 0
 local damage=id=='KQ026'and((up and 8 or 5)+bonus+(wedge and(9+bonus)or 0))or(2*((up and 3 or 2)+bonus)+(wedge and((up and 13 or 10)+bonus)or 0))
 eq(a.enemies[1].hp,300-damage);eq(a.enemies[2].hp,id=='KQ026'and 300 or 300-damage)
 eq(a.energy,id=='KQ026'and 2 or 1);eq(a.keqingResourceProbe.infusion,math.max(0,infusion-1));eq(a.keqingResourceProbe.wedgeUntil,nil)
 eq(s.energy,3);eq(s.enemies[1].hp,300);eq(s.keqingResourceProbe.infusion,infusion)
 assert(a.catalog.cards[id].keqingDetonation);eq(#a.catalog.cards[id].effects,0)
 if id=='KQ026'then no,why=A.play(s,u,99);eq(no,nil);eq(why,'invalid_target')end
 s.energy=0;no,why=A.play(s,u,1);eq(no,nil);eq(why,'insufficient_energy');eq(s.keqingResourceProbe.wedgeUntil,wedge and 2 or nil)
end end end end
for _,id in ipairs({'KQ026','KQ028'})do
 local s=R.new(D,defs,contract,{deck={id},enemies={'jaw_worm','jaw_worm'},seed=1});s.enemies[1].hp=1;s.enemies[2].hp=100
 s.keqingResourceProbe.wedgeUntil=2;s.keqingResourceProbe.infusion=1
 local a=assert(A.play(s,uid(s,id),1));eq(a.enemies[1].hp,0);eq(a.enemies[2].hp,id=='KQ026'and 100 or 80)
 eq(a.keqingResourceProbe.wedgeUntil,nil);eq(a.keqingResourceProbe.infusion,0)
 local z=R.new(D,defs,contract,{deck={'KQ003',id},enemies={'jaw_worm'},seed=1})
 z.enemies[1].hp=100;z=assert(R.play(z,uid(z,'KQ003'),1));z=assert(A.play(z,uid(z,id),1));eq(z.keqingResourceProbe.wedgeUntil,nil)
end
print('DETONATION_PROBE_PASS')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/DETONATION_PROBE_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}
});
