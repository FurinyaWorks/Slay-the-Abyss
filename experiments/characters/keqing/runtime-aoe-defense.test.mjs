import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{cards}from'./mechanics.mjs';import{fullStarterProbe}from'./runtime-bridge.mjs';import{aoeDefenseProbe}from'./runtime-aoe-defense.mjs';import{toLua,buildLuaData}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('027 strict topology and unknown semantics refusal',()=>{for(const change of[c=>c.exhaust=true,c=>c.effects.onExhaust=[],c=>c.effects.base[0].target='one',c=>c.effects.base[1].resource='infusion',c=>c.effects.base[1].amount=Infinity,c=>delete c.effects.base[0],c=>c.effects.base[Symbol()]=true]){const d=structuredClone(cards);change(d.KQ027);assert.throws(()=>aoeDefenseProbe('KQ027',{definitions:d}),/unsupported/);}});
test('027 actual AoE then conditional block and terminal boundary',()=>{buildLuaData();const p=fullStarterProbe(),defs=[p.definition,aoeDefenseProbe('KQ027')];const dir=mkdtempSync(join(tmpdir(),'kq027-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local R=require('runtime-resource-probe');local A=require('runtime-aoe-defense');local defs=${toLua(defs)};local contract=${toLua(p.contract)}
local function fresh(up)local s=R.new(D,defs,contract,{deck={{cardId='KQ027',upgraded=up}},enemies={'jaw_worm','jaw_worm'},seed=1});for _,e in ipairs(s.enemies)do e.hp=100;e.maxHp=100 end;return s end
for _,up in ipairs({false,true})do for _,wedge in ipairs({false,true})do for inf=0,2 do for _,modified in ipairs({false,true})do
 local s=fresh(up);s.keqingResourceProbe.infusion=inf;if wedge then s.keqingResourceProbe.wedgeUntil=2 end
 if modified then s.player.statuses.dexterity=10;s.player.statuses.frail=1 end
 local before=C.copy(s);local uid=s.hand[1].uid;local bad,why=R.play(s,uid,1);eq(bad,nil);eq(why,'dedicated_aoe_defense_adapter_required')
 local a=assert(A.play(s,uid,1));same(s,before);eq(a.energy,1);eq(a.enemies[1].hp,100-(up and 10 or 7)-(inf>0 and 2 or 0));eq(a.enemies[2].hp,a.enemies[1].hp);eq(a.player.block,wedge and(modified and 12 or 6)or 0);eq(a.keqingResourceProbe.infusion,math.max(0,inf-1));eq(a.keqingResourceProbe.wedgeUntil,nil);assert(a.catalog.cards.KQ027.keqingAoeDefense)
 s.energy=0;before=C.copy(s);bad,why=A.play(s,uid,1);eq(bad,nil);eq(why,'insufficient_energy');same(s,before)
end end end end
for _,up in ipairs({false,true})do
 local s=fresh(up);s.player.hp=1;s.keqingResourceProbe.infusion=2;s.keqingResourceProbe.wedgeUntil=2;s.enemies[1].statuses.thorns=3;s.enemies[1].powerOrder={'thorns'}
 local a=assert(A.play(s,s.hand[1].uid,1));eq(a.player.hp,0);eq(a.player.block,0);eq(a.keqingResourceProbe.infusion,1);eq(a.keqingResourceProbe.wedgeUntil,nil)
 -- Deliberately record wrapper post-return resource discrepancy, not paid policy.
 s=fresh(up);s.keqingResourceProbe.wedgeUntil=2;s.enemies[1].hp=1;s.enemies[2].hp=1
 a=assert(A.play(s,s.hand[1].uid,1));eq(C.outcome(a),'victory');eq(a.player.block,6)
end
print('KQ027_AOE_DEFENSE_PASS')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/KQ027_AOE_DEFENSE_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}});
