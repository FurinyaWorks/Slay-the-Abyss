package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,R,D,eq,same=H.C,H.Run,H.Data,H.eq,H.same
local F=require('abyss_keqing_reward_run')
local allowed={KQ005=true,KQ009=true,KQ019=true,KQ034=true,KQ052=true,KQ053=true,KQ054=true,KQ055=true}
local original=C.copy(D)
local function victory(seed)
 local r=F.new(D,seed);eq(r.candidateRewardPool,'keqing-reviewed-eight-v1');eq(#r.deck,10);eq(r.hp,60)
 assert(R.startCombat(r,'cultist_solo'));local s=r.combat;local turns=0
 while r.phase=='combat'and turns<16 do
  turns=turns+1
  while r.phase=='combat'and s.energy>0 and #s.hand>0 do
   local chosen
   for _,id in ipairs({'KQ003','KQ004','KQ001','KQ002'})do for _,c in ipairs(s.hand)do if c.cardId==id then chosen=c;break end end;if chosen then break end end
   assert(R.play(r,chosen.uid,1))
  end
  if r.phase=='combat'then assert(R.endTurn(r))end
 end
 assert(r.phase=='reward');return r
end
local observed,claimed={},{}
for _,seed in ipairs({42,77})do
 local r= victory(seed);local mirror=victory(seed)
 local options=R.rewardOptions(r);eq(#options,3);same(options,R.rewardOptions(mirror));same(r.cardRng,mirror.cardRng);same(r.rewards.cardUpgrades,mirror.rewards.cardUpgrades)
 local seen={};for _,id in ipairs(options)do assert(allowed[id]and not seen[id]);seen[id]=true;observed[id]=true
  local definition;for _,c in ipairs(r.data.cards.cards)do if c.id==id then definition=c end end
  eq(assert(definition).rarity,'special');eq(definition.color,'keqing_candidate');eq(definition.productionEnabled,false)
 end
 local rng=C.copy(r.cardRng);local id,up=options[1],r.rewards.cardUpgrades[1]==true;claimed[id]=true
 -- Leaving/reopening is not an implicit skip or a reroll.
 assert(R.leaveCombatRewards(r));assert(R.reopenCombatRewards(r));same(R.rewardOptions(r),options);same(r.cardRng,rng)
 local skipRng=C.copy(mirror.cardRng);assert(R.claimCardReward(mirror,0));eq(#mirror.deck,10);same(mirror.cardRng,skipRng)
 local before=C.copy(r);local deck,rewards,cardRng=r.deck,r.rewards,r.cardRng;local obtain=R.obtainCard;local reached=false
 R.obtainCard=function(...)local ok,detail=obtain(...);assert(ok);reached=true;error('after actual staged reward acquisition')end
 local called,accepted=pcall(R.claimCardReward,r,1);R.obtainCard=obtain;eq(called,true);eq(accepted,false);assert(reached);same(r,before);eq(r.deck,deck);eq(r.rewards,rewards);eq(r.cardRng,cardRng)
 assert(R.claimCardReward(r,1));eq(#r.deck,11);same(r.cardRng,rng);local acquired=r.deck[#r.deck];eq(acquired.cardId,id);eq(acquired.upgraded,up)
 local saved=C.copy(r);eq(R.claimCardReward(r,1),false);same(r,saved)
 assert(R.leaveCombatRewards(r));assert(R.startCombat(r,'cultist_solo'));local s=r.combat;local played=false
 for turn=1,5 do
  while r.phase=='combat'and s.energy>0 and #s.hand>0 do
   local chosen=s.hand[1];for _,c in ipairs(s.hand)do if c.deckUid==acquired.uid then chosen=c;break end end
   local cost=C.cardDefinition(s,chosen).cost;if cost>s.energy then break end
   local energy=s.energy;assert(R.play(r,chosen.uid,1))
   if chosen.deckUid==acquired.uid then eq(chosen.cardId,id);eq(chosen.upgraded,up);eq(s.energy,energy-cost);played=true;break end
  end
  if played then break end
  assert(r.phase=='combat');assert(R.endTurn(r))
 end
 assert(played);local n,owners=0,{};for _,pile in ipairs({s.hand,s.draw,s.discard,s.exhaust})do for _,c in ipairs(pile)do assert(not owners[c.deckUid]);owners[c.deckUid]=true;n=n+1 end end;eq(n,11);assert(owners[acquired.uid])
 print('REWARD_OBSERVED seed='..seed..' offer='..table.concat(options,',')..' claimed='..id..' upgraded='..tostring(up))
end
-- Unsupported Prismatic is acquired through the actual inventory command.
local blocked=F.new(D,42);assert(R.obtainRelic(blocked,'prismatic_shard'));assert(R.startCombat(blocked,'cultist_solo'))
local refused=false
for turn=1,12 do
 local s=blocked.combat
 while s.energy>0 and #s.hand>0 do
  local c
  for _,id in ipairs({'KQ003','KQ004','KQ001','KQ002'})do for _,v in ipairs(s.hand)do if v.cardId==id then c=v;break end end;if c then break end end
  local before=C.copy(blocked);local deck,relics,rng,combat=blocked.deck,blocked.relics,blocked.cardRng,blocked.combat
  local called,accepted=pcall(R.play,blocked,c.uid,1)
  if not called then
   assert(tostring(accepted):find('experimental_candidate_prismatic_unsupported',1,true))
   same(blocked,before);eq(blocked.deck,deck);eq(blocked.relics,relics);eq(blocked.cardRng,rng);eq(blocked.combat,combat);refused=true;break
  end
  assert(accepted)
 end
 if refused then break end
 assert(R.endTurn(blocked))
end
assert(refused);same(D,original);print('KQ_REWARD_ACTUAL_GENERATE_CLAIM_PLAY_PASS')
