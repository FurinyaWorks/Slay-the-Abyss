package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,R,D,eq,same=H.C,H.Run,H.Data,H.eq,H.same;local F=require('abyss_keqing_starter_run')
local original=C.copy(D);local r=F.new(D,42);same(D,original);eq(r.hp,60);eq(r.maxHp,60);eq(#r.deck,10);eq(#r.relics,0)
local owners={};for _,c in ipairs(r.deck)do owners[c.uid]={c.cardId,c.upgraded}end
local function identity(s)
 local seen,n={},0
 for _,p in ipairs({s.hand,s.draw,s.discard,s.exhaust})do for _,c in ipairs(p)do
  assert(not seen[c.deckUid]);seen[c.deckUid]=true;n=n+1;local d=assert(owners[c.deckUid]);eq(c.cardId,d[1]);eq(c.upgraded,d[2])
 end end
 eq(n,#r.deck);for uid in pairs(owners)do assert(seen[uid])end
end
local hp=r.hp
for fight=1,3 do
 assert(R.startCombat(r,'cultist_solo'));local s=r.combat
 eq(s.player.hp,hp);eq(s.energy,3);eq(#s.hand,5);eq(s.keqingResource.infusion,0);eq(s.keqingResource.wedgeUntil,nil);eq(s.keqingResource.relicUsed,false);identity(s)
 local turns=0;local setupSeen=false
 while r.phase=='combat'and turns<16 do
  turns=turns+1
  while s.energy>0 and #s.hand>0 and r.phase=='combat'do
   -- Deterministic visible-hand priority only. No pile read or reorder for action choice.
   local chosen
   for _,id in ipairs({'KQ003','KQ004','KQ001','KQ002'})do for _,c in ipairs(s.hand)do if c.cardId==id then chosen=c;break end end;if chosen then break end end
   local wedge,used,block=s.keqingResource.wedgeUntil,s.keqingResource.relicUsed,s.player.block
   assert(R.play(r,chosen.uid,1));identity(s)
   if chosen.cardId=='KQ003'and not wedge and s.keqingResource.wedgeUntil then
    setupSeen=true;eq(s.player.block,block+(used and 0 or 4));eq(s.keqingResource.relicUsed,true)
   end
  end
  if r.phase=='combat'then assert(R.endTurn(r));identity(s);eq(s.keqingResource.infusion,0)end
 end
 print('OBSERVED_FIGHT '..fight..' phase='..r.phase..' hp='..r.hp..' turns='..turns..' setup='..tostring(setupSeen))
 assert(setupSeen,'starter did not reach live setup')
 assert(r.phase=='reward','fixed encounter did not reach victory')
 hp=r.hp
 if fight==3 then
  -- Explicit fixed reward offer, not a claim of natural candidate reward registration.
  r.rewards.cards={'KQ003'};r.rewards.cardUpgrades={true};r.rewards.cardResolved=false
  assert(R.claimCardReward(r,1));local c=r.deck[#r.deck];owners[c.uid]={c.cardId,c.upgraded};assert(c.upgraded)
 end
 assert(R.leaveCombatRewards(r))
end
assert(R.startCombat(r,'cultist_solo'));local s=r.combat;eq(s.player.hp,hp);eq(s.keqingResource.relicUsed,false);eq(s.keqingResource.infusion,0);eq(s.keqingResource.wedgeUntil,nil);identity(s)
local acquired=r.deck[#r.deck];local tested=false
for turn=1,5 do
 while r.phase=='combat'and s.energy>0 and #s.hand>0 do
  local selected=s.hand[1];for _,c in ipairs(s.hand)do if c.deckUid==acquired.uid then selected=c;break end end
  if selected.deckUid==acquired.uid then
   eq(selected.upgraded,true);local before=C.copy(r)
   local deck,resource,hand,queue,rng=r.deck,s.keqingResource,s.hand,s.actionQueue,s.rng
   local Paid=require('abyss_keqing_paid_cards');local dispatch=Paid.dispatch;local reached=false
   Paid.dispatch=function(...)local result=dispatch(...);reached=true;error('independent stage boundary')end
   eq(pcall(R.play,r,selected.uid,1),false);Paid.dispatch=dispatch;assert(reached);same(r,before)
   eq(r.deck,deck);eq(r.combat,s);eq(s.keqingResource,resource);eq(s.hand,hand);eq(s.actionQueue,queue);eq(s.rng,rng);identity(s)
   assert(R.play(r,selected.uid,1));identity(s);tested=true;break
  end
  assert(R.play(r,selected.uid,1));identity(s)
 end
 if tested then break end
 assert(r.phase=='combat');assert(R.endTurn(r));identity(s)
end
assert(tested);same(D,original)
print('KQ_RUN_STARTER_PUBLIC_THREE_PASS')
