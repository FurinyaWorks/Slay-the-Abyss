import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{cards}from'./mechanics.mjs';import{skillDrawProbe}from'./runtime-skill-draw.mjs';import{toLua,buildLuaData}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('049 source export strict shapes',()=>{for(const mutate of[c=>c.exhaust=true,c=>c.effects.onExhaust=[],c=>c.effects.base[0].amount=2,c=>c.effects.base[0].skillBlock=NaN,c=>delete c.effects.base[0],c=>c.effects.base[Symbol()]=1]){const d=structuredClone(cards);mutate(d.KQ049);assert.throws(()=>skillDrawProbe({definitions:d}),/unsupported/);}});
test('049 native public play rewards actual drawn skill only',()=>{buildLuaData();const dir=mkdtempSync(join(tmpdir(),'kq049-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,eq,same=H.C,H.eq,H.same;local D=C.copy(H.Data);D.cards.cards[#D.cards.cards+1]=${toLua(skillDrawProbe())}
for _,up in ipairs({false,true})do for _,skill in ipairs({false,true})do for _,noDraw in ipairs({false,true})do for _,modified in ipairs({false,true})do
 local deck={};for i=1,7 do deck[i]={cardId='KQ049',upgraded=up}end
 local s=C.new(D,{deck=deck,enemies={'jaw_worm'},seed=42,experimental=true});local source=s.hand[1];local drawn=s.draw[#s.draw];if not skill then drawn.cardId='strike'end
 if noDraw then s.player.noDraw=true end;if modified then s.player.statuses.dexterity=10;s.player.statuses.frail=1 end
 local start=#s.hand;assert(C.play(s,source.uid));eq(s.energy,2);eq(#s.hand,start-(noDraw and 1 or 0));eq(s.player.block,not noDraw and skill and(modified and(up and 12 or 10)or(up and 7 or 4))or 0)
 eq(s.pendingPlay,nil);eq(s.cardInUse,nil);eq(s.discard[#s.discard],source)
 local seen={};local n=0;for _,name in ipairs({'hand','draw','discard','exhaust'})do for _,c in ipairs(s[name])do assert(not seen[c.uid]);seen[c.uid]=true;n=n+1 end end;eq(n,7)
end end end end
print('KQ049_NATIVE_PASS')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/KQ049_NATIVE_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}});
