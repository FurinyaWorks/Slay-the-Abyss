import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{splitDefenseProbe}from'./runtime-split-defense.mjs';import{skillDrawProbe}from'./runtime-skill-draw.mjs';import{toLua,buildLuaData}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('native039/049 actual Run rollback preserves ownership after completed Combat command',()=>{buildLuaData();const dir=mkdtempSync(join(tmpdir(),'kq-run-failure-'));const file=join(dir,'test.lua');writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,R,eq,same=H.C,H.Run,H.eq,H.same;local I=require('native-split-install')
local data=I.install(H.Data,${toLua(splitDefenseProbe())});data.cards.cards[#data.cards.cards+1]=${toLua(skillDrawProbe())};data.rules.player.startingRelics={}
for _,up in ipairs({false,true})do for _,id in ipairs({'KQ039','KQ049'})do
 local r=R.new(data,'42');local initial={};for _,c in ipairs(r.deck)do initial[#initial+1]=c.uid end;for _,uid in ipairs(initial)do assert(R.removeCard(r,uid))end
 for i=1,8 do assert(R.obtainCard(r,id,{upgraded=up}))end
 assert(R.startCombat(r,'cultist_solo'));local s=r.combat;local card=s.hand[1]
 local before=C.copy(r);local deck,dataRef=r.deck,r.data
 local refs={};for _,key in ipairs({'hand','draw','discard','exhaust','rng','actionQueue','player'})do refs[key]=s[key]end
 local instances,owners={},{};
 for _,pile in ipairs({s.hand,s.draw,s.discard,s.exhaust})do for _,c in ipairs(pile)do instances[c.uid]=c;owners[c.deckUid]={c.cardId,c.upgraded}end end
 local function verify()
  eq(r.combat,s);eq(r.deck,deck);eq(r.data,dataRef)
  for key,ref in pairs(refs)do eq(s[key],ref)end
  local seen,n={},0;for _,pile in ipairs({s.hand,s.draw,s.discard,s.exhaust})do for _,c in ipairs(pile)do
   eq(c,instances[c.uid]);assert(not seen[c.deckUid]);seen[c.deckUid]=true;n=n+1
   local o=assert(owners[c.deckUid]);eq(c.cardId,o[1]);eq(c.upgraded,o[2])
  end end;eq(n,8)
 end
 local play=C.play;local completed=false
 C.play=function(...)local ok,why=play(...);assert(ok,why);completed=true;assert(s.player.block>0);assert(s.discard[#s.discard]==card);error('after actual Combat completion, before Run publication')end
 eq(pcall(R.play,r,card.uid,1),false);C.play=play;assert(completed);same(r,before);verify()
 assert(R.play(r,card.uid,1));eq(s.energy,2);eq(s.discard[#s.discard],card);verify()
 local block=s.player.block;eq(block,up and(id=='KQ039'and 6 or 7)or 4)
 local after=C.copy(r);eq(R.play(r,card.uid,1),false);same(r,after);verify()
 -- Separate refused payment keeps the already successful first action intact.
 s.energy=0;local rejected=C.copy(r);eq(R.play(r,s.hand[1].uid,1),false);same(r,rejected);verify()
end end
print('KQ_RUN_NATIVE_FAILURE_4_PASS')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/KQ_RUN_NATIVE_FAILURE_4_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}});
