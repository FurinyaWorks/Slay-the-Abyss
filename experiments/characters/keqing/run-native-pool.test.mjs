import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{splitDefenseProbe}from'./runtime-split-defense.mjs';import{skillDrawProbe}from'./runtime-skill-draw.mjs';import{toLua,buildLuaData}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('039 and 049 actual Run acquisition and combat command loop',()=>{buildLuaData();const dir=mkdtempSync(join(tmpdir(),'kq-run-native-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,R,eq,same=H.C,H.Run,H.eq,H.same;local I=require('native-split-install')
local data=I.install(H.Data,${toLua(splitDefenseProbe())});data.cards.cards[#data.cards.cards+1]=${toLua(skillDrawProbe())};data.rules.player.startingRelics={}
for _,up in ipairs({false,true})do
 local r=R.new(data,'42');local initial={};for _,c in ipairs(r.deck)do initial[#initial+1]=c.uid end;for _,uid in ipairs(initial)do assert(R.removeCard(r,uid))end
 for i=1,4 do assert(R.obtainCard(r,'KQ039',{upgraded=up}));assert(R.obtainCard(r,'KQ049',{upgraded=up}))end
 eq(#r.deck,8);local durable={};for _,c in ipairs(r.deck)do assert(not durable[c.uid]);durable[c.uid]={cardId=c.cardId,upgraded=c.upgraded}end
 assert(R.startCombat(r,'cultist_solo'));assert(r.combat.experimentalMechanics)
 local function verifyIdentity()
 local seen,master,n={},{},0
 for _,name in ipairs({'hand','draw','discard','exhaust'})do for _,c in ipairs(r.combat[name])do
  assert(not seen[c.uid]);seen[c.uid]=true;n=n+1
  local d=assert(durable[c.deckUid],'combat instance missing durable owner')
  assert(not master[c.deckUid]);master[c.deckUid]=true
  eq(c.cardId,d.cardId);eq(c.upgraded,d.upgraded)
 end end
 eq(n,8);for uid in pairs(durable)do assert(master[uid])end
end
 verifyIdentity()
 r.combat.player.hp=999;r.combat.player.maxHp=999;r.combat.enemies[1].hp=999;r.combat.enemies[1].maxHp=999
 local used={};for turn=1,3 do
  local actions=0;while r.combat.energy>0 and #r.combat.hand>0 do
   local c=r.combat.hand[1];local id=c.cardId;assert(R.play(r,c.uid,1));verifyIdentity();used[id]=(used[id]or 0)+1;actions=actions+1;assert(actions<=3)
  end
  assert(R.endTurn(r));eq(r.combat.turn,turn+1);verifyIdentity()
 end
 assert(used.KQ039 and used.KQ049);eq(#r.deck,8)
 for _,c in ipairs(r.deck)do local d=assert(durable[c.uid]);eq(c.cardId,d.cardId);eq(c.upgraded,d.upgraded)end
 local seen={};local n=0;for _,name in ipairs({'hand','draw','discard','exhaust'})do for _,c in ipairs(r.combat[name])do assert(not seen[c.uid]);seen[c.uid]=true;n=n+1 end end;eq(n,8)
 eq(r.phase,'combat')
end
print('KQ_RUN_NATIVE_PASS')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/KQ_RUN_NATIVE_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}});
