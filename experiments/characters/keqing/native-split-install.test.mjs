import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{cards}from'./mechanics.mjs';import{splitDefenseProbe}from'./runtime-split-defense.mjs';import{toLua,buildLuaData}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('039 minimal catalog preparation opts into mechanics without loading unrelated cards',()=>{buildLuaData();const dir=mkdtempSync(join(tmpdir(),'kq039-install-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,eq,same=H.C,H.eq,H.same;local I=require('native-split-install');local def=${toLua(splitDefenseProbe())}
local before=C.copy(H.Data);local d=I.install(H.Data,def);same(H.Data,before);eq(#d.cards.cards,#H.Data.cards.cards+1);eq(#d.statuses.statuses,#H.Data.statuses.statuses)
local native;for _,s in ipairs(d.statuses.statuses)do if s.id=='next_turn_block'then native=s end end;assert(native)
local onlyStatus=C.copy(H.Data);local reused=I.install(onlyStatus,def);eq(#reused.statuses.statuses,#onlyStatus.statuses.statuses)
assert(not pcall(I.install,d,def));for _,mutate in ipairs({function(x)x.kind='debuff'end,function(x)x.decay='round'end,function(x)x.stack='duration'end})do
 local bad=C.copy(onlyStatus);for _,v in ipairs(bad.statuses.statuses)do if v.id=='next_turn_block'then mutate(v)end end;local b=C.copy(bad);assert(not pcall(I.install,bad,def));same(bad,b)
end
for _,up in ipairs({false,true})do
 local s=C.new(d,{deck={{cardId='KQ039',upgraded=up}},enemies={'jaw_worm'},seed=42,experimental=true});s.player.hp=999;s.player.maxHp=999
 assert(C.play(s,s.hand[1].uid));eq(s.player.block,up and 6 or 4);assert(C.endTurn(s));eq(s.player.block,up and 6 or 4);eq(s.player.statuses.next_turn_block,nil)
end
-- Four real constructor controls distinguish missing status from mechanics opt-in.
for _,opt in ipairs({false,true})do for _,status in ipairs({false,true})do
 local x=C.copy(H.Data);x.cards.cards[#x.cards.cards+1]=C.copy(def)
 if opt then x.experimentalKeqingNative=true end
 if not status then for i=#x.statuses.statuses,1,-1 do if x.statuses.statuses[i].id=='next_turn_block'then table.remove(x.statuses.statuses,i)end end end
 local s=C.new(x,{deck={'KQ039'},enemies={'jaw_worm'},seed=42,experimental=true});s.player.hp=999;s.player.maxHp=999
 eq(s.experimentalMechanics==true,opt);if status then assert(C.play(s,s.hand[1].uid));assert(C.endTurn(s));eq(s.player.block,opt and 4 or 0)else local before=C.copy(s);assert(not pcall(C.play,s,s.hand[1].uid));same(s,before)end
end end
-- Missing status is supplied without bringing other class cards into catalog.
local missing=C.copy(H.Data);for i=#missing.statuses.statuses,1,-1 do if missing.statuses.statuses[i].id=='next_turn_block'then table.remove(missing.statuses.statuses,i)end end
local repaired=I.install(missing,def);eq(#repaired.statuses.statuses,#missing.statuses.statuses+1);eq(#repaired.cards.cards,#missing.cards.cards+1)
-- Copies do not expose references back into caller data or supplied definition.
d.cards.cards[#d.cards.cards].effects[1].value=999;eq(def.effects[1].value,4);native.kind='changed';same(H.Data,before)
print('KQ039_MINIMAL_INSTALL_PASS')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/KQ039_MINIMAL_INSTALL_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}});
