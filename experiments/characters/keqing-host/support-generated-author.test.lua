package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,R,D,eq,same=H.C,H.Run,H.Data,H.eq,H.same
local F=require('abyss_keqing_support_reward_run');local original=C.copy(D)
local observed,claimed,seeds={},{},0
local function win(seed)
 local r=F.new(D,seed);eq(r.candidateRewardPool,'keqing-reviewed-ten-v1');eq(r.hp,60);assert(R.startCombat(r,'cultist_solo'))
 for turn=1,16 do
  while r.phase=='combat'and r.combat.energy>0 and #r.combat.hand>0 do
   local chosen;for _,id in ipairs({'KQ003','KQ004','KQ001','KQ002'})do for _,c in ipairs(r.combat.hand)do if c.cardId==id then chosen=c;break end end;if chosen then break end end
   assert(chosen);assert(R.play(r,chosen.uid,1))
  end
  if r.phase=='reward'then return r end;assert(R.endTurn(r))
 end
 error('bounded source combat did not win')
end
for seed=42,49 do
 local r=win(seed);seeds=seeds+1;local options=R.rewardOptions(r);eq(#options,3);local choice
 for i,id in ipairs(options)do observed[id]=true;if (id=='KQ039'or id=='KQ049')and not claimed[id]and not choice then choice=i end end
 print('SUPPORT_GENERATED seed='..seed..' options='..table.concat(options,','))
 if choice then
  local id=options[choice];local up=r.rewards.cardUpgrades[choice]==true;local rng=C.copy(r.cardRng)
  assert(R.leaveCombatRewards(r));assert(R.reopenCombatRewards(r));same(R.rewardOptions(r),options);same(r.cardRng,rng)
  assert(R.claimCardReward(r,choice));eq(#r.deck,11);same(r.cardRng,rng);local acquired=r.deck[#r.deck];eq(acquired.cardId,id);eq(acquired.upgraded,up)
  assert(R.leaveCombatRewards(r));assert(R.startCombat(r,'cultist_solo'));local s=r.combat;local played=false
  local durable={};for _,c in ipairs(r.deck)do durable[c.uid]={cardId=c.cardId,upgraded=c.upgraded}end
  local function identity()
   local seen,combat,n={},{},0;for _,z in ipairs({'draw','hand','discard','exhaust'})do for _,c in ipairs(s[z])do local d=assert(durable[c.deckUid]);assert(not seen[c.deckUid]and not combat[c.uid]);seen[c.deckUid]=true;combat[c.uid]=true;n=n+1;eq(c.cardId,d.cardId);eq(c.upgraded,d.upgraded)end end;eq(n,11);for uid in pairs(durable)do assert(seen[uid])end
  end
  for turn=1,5 do
   identity();local selected;for _,c in ipairs(s.hand)do if c.deckUid==acquired.uid then selected=c end end
   if selected then
    local beforeHand={};for _,c in ipairs(s.hand)do beforeHand[c.uid]=true end
    local energy,block,inf,wedge=s.energy,s.player.block,s.keqingResource.infusion,s.keqingResource.wedgeUntil
    assert(R.play(r,selected.uid,1));eq(s.energy,energy-1);eq(s.keqingResource.infusion,inf);eq(s.keqingResource.wedgeUntil,wedge);identity()
    if id=='KQ039'then
     local amount=up and 6 or 4;eq(s.player.block,block+amount);eq(s.player.statuses.next_turn_block,amount)
     assert(R.endTurn(r));identity();eq(s.player.block,amount);eq(s.player.statuses.next_turn_block,nil)
     assert(R.endTurn(r));identity();eq(s.player.block,0);eq(s.player.statuses.next_turn_block,nil)
    else
     local drawn;for _,c in ipairs(s.hand)do if not beforeHand[c.uid]then assert(not drawn);drawn=c end end;assert(drawn,'expected one actual draw')
     local isSkill=C.cardDefinition(s,drawn).type=='skill';eq(s.player.block,block+(isSkill and(up and 7 or 4)or 0))
     print('SUPPORT_DRAW_ACTUAL '..drawn.cardId..' skill='..tostring(isSkill))
    end
    claimed[id]=true;played=true;print('SUPPORT_CLAIM_PAID '..id..' upgraded='..tostring(up)..' seed='..seed);break
   end
   for i=#s.hand,1,-1 do local c=s.hand[i];if c.cardId=='KQ002'and s.energy>0 then assert(R.play(r,c.uid,1));identity()end end
   assert(R.endTurn(r));identity()
  end
  assert(played)
 end
 if claimed.KQ039 and claimed.KQ049 then break end
end
assert(claimed.KQ039 and claimed.KQ049,'bounded seeds did not acquire both support IDs')
local count=0;for _ in pairs(observed)do count=count+1 end
same(D,original);print('KQ_SUPPORT_GENERATED_AUTHOR_PASS seeds='..seeds..' observed='..count..' acquired=2')
