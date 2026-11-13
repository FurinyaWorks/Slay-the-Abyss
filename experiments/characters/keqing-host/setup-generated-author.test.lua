package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,R,D,eq,same=H.C,H.Run,H.Data,H.eq,H.same
local F=require('abyss_keqing_setup_reward_run');local untouched=C.copy(D)
-- Source89d898c literal costs/amounts. No adapter or modified offers, HP or hand order.
local values={KQ010={cost=1,base=4,up=7},KQ011={cost=2,base=12,up=16},KQ013={cost=1,base=3,up=5}}
local claimed,observed={},{};local seedCount=0
for seed=42,57 do
 local r=F.new(D,seed);eq(r.candidateRewardPool,'keqing-reviewed-sixteen-v1');eq(r.hp,60);assert(R.startCombat(r,'cultist_solo'))
 for turn=1,16 do
  while r.phase=='combat'and r.combat.energy>0 and #r.combat.hand>0 do
   local selected;for _,id in ipairs({'KQ003','KQ004','KQ001','KQ002'})do for _,c in ipairs(r.combat.hand)do if c.cardId==id then selected=c;break end end;if selected then break end end
   assert(selected);assert(R.play(r,selected.uid,1))
  end
  if r.phase=='reward'then break end;assert(R.endTurn(r))
 end
 assert(r.phase=='reward');seedCount=seedCount+1;local options=R.rewardOptions(r);local selected
 for i,id in ipairs(options)do observed[id]=true;if values[id]and not claimed[id]and not selected then selected=i end end
 print('SETUP_OFFER '..seed..' '..table.concat(options,','))
 if selected then
  local id=options[selected];local up=r.rewards.cardUpgrades[selected]==true;local rng=C.copy(r.cardRng)
  assert(R.claimCardReward(r,selected));same(r.cardRng,rng);eq(#r.deck,11);local acquired=r.deck[#r.deck];eq(acquired.cardId,id);eq(acquired.upgraded,up)
  assert(R.leaveCombatRewards(r));assert(R.startCombat(r,'cultist_solo'));local s=r.combat;local played=false;local durable={};for _,c in ipairs(r.deck)do durable[c.uid]={cardId=c.cardId,upgraded=c.upgraded}end
  local function identity()
   local owners,uids,n={},{},0;for _,z in ipairs({'hand','draw','discard','exhaust'})do for _,c in ipairs(s[z])do local d=assert(durable[c.deckUid]);assert(not owners[c.deckUid]and not uids[c.uid]);owners[c.deckUid]=true;uids[c.uid]=true;eq(c.cardId,d.cardId);eq(c.upgraded,d.upgraded);n=n+1 end end;eq(n,11);for uid in pairs(durable)do assert(owners[uid])end
  end
  for turn=1,5 do
   identity();local c;for _,x in ipairs(s.hand)do if x.deckUid==acquired.uid then c=x end end
   if c then local energy=s.energy;local before=C.copy(s);assert(R.play(r,c.uid,1));eq(s.energy,energy-values[id].cost);identity();
    -- Newly acquired setup is played before any starter card this turn. All enemies are alive here.
    if before.keqingResource.wedgeUntil then eq(s.keqingResource.wedgeUntil,before.keqingResource.wedgeUntil) else eq(s.keqingResource.wedgeUntil,s.turn+1) end
    local amount=up and values[id].up or values[id].base
    if id=='KQ010'then eq(s.player.block,before.player.block+amount+(before.keqingResource.wedgeUntil==nil and not before.keqingResource.relicUsed and 4 or 0));eq(s.keqingResource.infusion,before.keqingResource.infusion)
    else local bonus=before.keqingResource.infusion>0 and 2 or 0;eq(s.enemies[1].hp,before.enemies[1].hp-amount-bonus);eq(s.keqingResource.infusion,math.max(0,before.keqingResource.infusion-1)) end
    played=true;claimed[id]=true;print('SETUP_CLAIM_PAID '..id..' up='..tostring(up)..' seed='..seed);break end
   for i=#s.hand,1,-1 do local x=s.hand[i];if x.cardId=='KQ002'and s.energy>0 then assert(R.play(r,x.uid,1));identity()end end
   assert(R.endTurn(r));identity()
  end
  assert(played)
 end
 if claimed.KQ010 and claimed.KQ011 and claimed.KQ013 then break end
end
local observedN,claimedN=0,0;for _ in pairs(observed)do observedN=observedN+1 end;for _ in pairs(claimed)do claimedN=claimedN+1 end
same(D,untouched) -- An incomplete fixed seed sample is reported, never relabeled as full coverage.
print('KQ_SETUP_AUTHOR_PASS seeds='..seedCount..' observed='..observedN..' acquired='..claimedN)
