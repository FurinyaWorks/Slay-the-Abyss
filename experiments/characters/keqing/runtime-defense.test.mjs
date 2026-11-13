import test from 'node:test';import assert from 'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{cards}from'./mechanics.mjs';import{fullStarterProbe}from'./runtime-bridge.mjs';import{resourceDefenseProbe}from'./runtime-defense.mjs';import{toLua,buildLuaData}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('resource defense export refuses unhandled semantics',()=>{for(const id of ['KQ006','KQ007'])for(const change of [c=>c.exhaust=true,c=>c.effects.onExhaust=[],c=>c.effects.base[1].amount=NaN,c=>c.effects.base[1].resource='other',c=>delete c.effects.base[0],c=>c.effects.base[Symbol()]=1]){const d=structuredClone(cards);change(d[id]);assert.throws(()=>resourceDefenseProbe(id,{definitions:d}),/unsupported/);}});
test('actual Lua resource defense, finite spending and real block modifier ordering',()=>{
 buildLuaData();const p=fullStarterProbe(),defs=[p.definition,p.finisher,...['KQ006','KQ007'].map(id=>resourceDefenseProbe(id))];const dir=mkdtempSync(join(tmpdir(),'kq-defense-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local R=require('runtime-resource-probe');local A=require('runtime-defense');local C=require('abyss_combat');local D=require('abyss_data')
local defs=${toLua(defs)};local contract=${toLua(p.contract)}
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
local function uid(s,id)for _,c in ipairs(s.hand)do if c.cardId==id then return c.uid end end end
for _,id in ipairs({'KQ006','KQ007'})do for _,up in ipairs({false,true})do for _,present in ipairs({false,true})do for _,modified in ipairs({false,true})do
 local s=R.new(D,defs,contract,{deck={{cardId=id,upgraded=up}},enemies={'jaw_worm'},seed=1})
 if present then s.keqingResourceProbe.wedgeUntil=2;s.keqingResourceProbe.infusion=2 end
 if modified then s.player.statuses.dexterity=2;s.player.statuses.frail=1 end
 local rejected,why=R.play(s,uid(s,id),1);eq(rejected,nil);eq(why,'dedicated_defense_adapter_required')
 local n=assert(A.play(s,uid(s,id)));local base=up and 8 or 5;local extra=id=='KQ006'and 5 or 4
 local function block(v)return modified and math.floor((v+2)*.75)or v end
 eq(n.player.block,block(base)+(present and block(extra)or 0));eq(n.energy,2);eq(s.energy,3);eq(s.player.block,0)
 eq(n.keqingResourceProbe.infusion,present and(id=='KQ007'and 1 or 2)or 0)
 eq(n.keqingResourceProbe.wedgeUntil,present and id=='KQ007'and 2 or nil)
 eq(n.catalog.cards[id].effects[1].value,5);eq(n.catalog.cards[id].upgrade.effects[1].value,8)
 s.energy=0;local no,why=A.play(s,uid(s,id));eq(no,nil);eq(why,'insufficient_energy');eq(s.keqingResourceProbe.infusion,present and 2 or 0)
end end end end
-- Actual setup/recast source before spending, no pre-populated resource fixture.
for _,id in ipairs({'KQ006','KQ007'})do
 local s=R.new(D,defs,contract,{deck={'KQ003','KQ003',id},enemies={'jaw_worm'},seed=1})
 s=assert(R.play(s,uid(s,'KQ003'),1))
 if id=='KQ007'then s=assert(R.play(s,uid(s,'KQ003'),1))end
 s=assert(A.play(s,uid(s,id)))
 eq(s.player.block,id=='KQ006'and 10 or 9)
 eq(s.keqingResourceProbe.wedgeUntil,nil);eq(s.keqingResourceProbe.infusion,id=='KQ007'and 1 or 0)
end
for _,mode in ipairs({'deadPlayer','deadEnemies','victory','defeat'})do
 local s=R.new(D,defs,contract,{deck={'KQ006'},enemies={'jaw_worm'},seed=1})
 s.keqingResourceProbe.wedgeUntil=2
 if mode=='deadPlayer'then s.player.hp=0 elseif mode=='deadEnemies'then s.enemies[1].hp=0 else s.phase=mode end
 local no,why=A.play(s,uid(s,'KQ006'));eq(no,nil);eq(why,'combat_not_active')
 eq(s.energy,3);eq(s.player.block,0);eq(s.keqingResourceProbe.wedgeUntil,2)
 no,why=R.endTurn(s);eq(no,nil);eq(why,'combat_not_active');eq(s.turn,1)
end
print('DEFENSE_PROBE_PASS')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/DEFENSE_PROBE_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}
});
