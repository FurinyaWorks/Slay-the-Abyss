import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{cards}from'./mechanics.mjs';import{fullStarterProbe}from'./runtime-bridge.mjs';import{unblockedProbe}from'./runtime-unblocked.mjs';import{toLua,buildLuaData}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('unblocked strict schema rejects unknown fields and holes',()=>{for(const change of[c=>c.exhaust=true,c=>c.effects.onExhaust=[],c=>delete c.effects.base[0],c=>c.effects.base[Symbol()]=1,c=>c.effects.base[1].damage=NaN]){const d=structuredClone(cards);change(d.KQ056);assert.throws(()=>unblockedProbe({definitions:d}),/unsupported/);}});
test('real Lua zero entry block triggers second hit, breaking block does not',()=>{
 buildLuaData();const p=fullStarterProbe(),defs=[p.definition,unblockedProbe()];const dir=mkdtempSync(join(tmpdir(),'kq-unblocked-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local R=require('runtime-resource-probe');local A=require('runtime-unblocked');local D=require('abyss_data');local C=require('abyss_combat')
local H=dofile('tests/helpers/act2_event_relics.lua');local eq,same=H.eq,H.same
local defs=${toLua(defs)};local contract=${toLua(p.contract)}
local function fresh(up)local s=R.new(D,defs,contract,{deck={{cardId='KQ056',upgraded=up}},enemies={'jaw_worm','jaw_worm'},seed=1});for _,e in ipairs(s.enemies)do e.hp=100;e.maxHp=100;e.block=0 end;return s end
for _,up in ipairs({false,true})do for _,block in ipairs({0,1,30})do for inf=0,2 do
 local s=fresh(up);s.enemies[2].block=block;s.keqingResourceProbe.infusion=inf;s.keqingResourceProbe.wedgeUntil=2;local uid=s.hand[1].uid;local before=C.copy(s)
 local no,why=R.play(s,uid,2);eq(no,nil);eq(why,'dedicated_unblocked_adapter_required')
 local a=assert(A.play(s,uid,2));local first=(up and 13 or 10)+(inf>0 and 2 or 0);local extra=block==0 and((up and 7 or 6)+(inf>0 and 2 or 0))or 0
 eq(a.enemies[2].hp,100-math.max(0,first-block)-extra);eq(a.enemies[1].hp,100);eq(a.energy,1);eq(a.keqingResourceProbe.infusion,math.max(0,inf-1));eq(a.keqingResourceProbe.wedgeUntil,2);same(s,before);same(a.catalog.cards.KQ056,s.catalog.cards.KQ056)
 no,why=A.play(s,uid,99);eq(no,nil);eq(why,'invalid_target');same(s,before)
 s.energy=1;before=C.copy(s);no,why=A.play(s,uid,2);eq(no,nil);eq(why,'insufficient_energy');same(s,before)
end end end
for _,up in ipairs({false,true})do local s=fresh(up);s.enemies[1].hp=1;s.keqingResourceProbe.infusion=2;local a=assert(A.play(s,s.hand[1].uid,1));eq(a.enemies[1].hp,0);eq(a.enemies[2].hp,100);eq(a.keqingResourceProbe.infusion,1)end
local s=fresh(false);s.enemies[1].block=0/0;local before=C.copy(s);eq(pcall(A.play,s,s.hand[1].uid,1),false);eq(s.energy,3);eq(#s.hand,1)
print('UNBLOCKED_PROBE_PASS 18 matrix and 2 lethal')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/UNBLOCKED_PROBE_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}
});
