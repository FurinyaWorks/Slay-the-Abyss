import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{cards}from'./mechanics.mjs';import{splitDefenseProbe}from'./runtime-split-defense.mjs';import{toLua,buildLuaData}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('039 source export strict shapes',()=>{for(const mutate of[c=>c.exhaust=true,c=>c.effects.onExhaust=[],c=>c.effects.base[1].op='draw',c=>c.effects.base[1].amount=NaN,c=>delete c.effects.base[0],c=>c.effects.base[Symbol()]=1]){const d=structuredClone(cards);mutate(d.KQ039);assert.throws(()=>splitDefenseProbe({definitions:d}),/unsupported/);}});
test('039 native public current and next-turn defense',()=>{buildLuaData();const dir=mkdtempSync(join(tmpdir(),'kq039-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,eq,same=H.C,H.eq,H.same;local D=require('abyss_silent_attack_cards').withCardDefinitions(C.copy(H.Data));D.cards.cards[#D.cards.cards+1]=${toLua(splitDefenseProbe())}
for _,up in ipairs({false,true})do for _,modified in ipairs({false,true})do for _,twice in ipairs({false,true})do
 local deck={};for i=1,7 do deck[i]={cardId='KQ039',upgraded=up}end
 local s=C.new(D,{deck=deck,enemies={'jaw_worm'},seed=42,experimental=true});s.player.hp=999;s.player.maxHp=999;s.enemies[1].hp=999;s.enemies[1].maxHp=999
 if modified then s.player.statuses.dexterity=10;s.player.statuses.frail=1 end
 local value=modified and(up and 12 or 10)or(up and 6 or 4);local n=twice and 2 or 1
 for i=1,n do assert(C.play(s,s.hand[1].uid))end
 eq(s.energy,3-n);eq(s.player.block,value*n);eq(s.player.statuses.next_turn_block,value*n)
 s.player.statuses.dexterity=50 -- captured delayed block must not recalculate.
 assert(C.endTurn(s));eq(s.turn,2);eq(s.player.block,value*n);eq(s.player.statuses.next_turn_block,nil)
 assert(C.endTurn(s));eq(s.turn,3);eq(s.player.block,0);eq(s.player.statuses.next_turn_block,nil)
 local seen={};local count=0;for _,name in ipairs({'hand','draw','discard','exhaust'})do for _,c in ipairs(s[name])do assert(not seen[c.uid]);seen[c.uid]=true;count=count+1 end end;eq(count,7)
end end end
print('KQ039_NATIVE_PASS')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/KQ039_NATIVE_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}});
