package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,R,D,eq,same=H.C,H.Run,H.Data,H.eq,H.same
local Paid=require('abyss_keqing_paid_cards');local F=require('abyss_keqing_conditional_reward_run');local untouched=C.copy(D)
-- Literal source89d898c outcome table, not host attackAmount as its own oracle.
local values={KQ008={cost=1,base={5,8},up={8,11}},KQ018={cost=1,base={8,12,3},up={10,14,4}},KQ025={cost=2,base={10,21},up={13,26}}}
local count=0
for id,v in pairs(values)do for _,up in ipairs({false,true})do for inf=0,2 do for _,wedge in ipairs({false,true})do
 local d=C.copy(D);for _,def in ipairs(Paid.conditionalDefinitions().cards)do d.cards.cards[#d.cards.cards+1]=def end
 local s=C.new(d,{deck={id,'defend','defend','defend','defend','defend'},enemies={'cultist','cultist'},seed=42,candidateLifecycle={kind='keqing',relicEnabled=true}})
 local card;for _,zone in ipairs({'hand','draw'})do for i=#s[zone],1,-1 do if s[zone][i].cardId==id then card=table.remove(s[zone],i)end end end;assert(card);card.upgraded=up;s.hand[#s.hand+1]=card
 for _,e in ipairs(s.enemies)do e.hp=100;e.maxHp=100 end
 s.keqingResource.infusion=inf;s.keqingResource.wedgeUntil=wedge and s.turn+1 or nil
 local face=up and v.up or v.base;local damage=id=='KQ008'and(face[wedge and 2 or 1]+(inf>0 and 2 or 0))or face[inf>0 and 2 or 1]
 local block=id=='KQ018'and inf==0 and face[3]or 0
 assert(C.play(s,card.uid,1));eq(s.energy,3-v.cost);eq(s.enemies[1].hp,100-damage);eq(s.enemies[2].hp,100);eq(s.player.block,block);eq(s.keqingResource.infusion,math.max(0,inf-1));eq(s.keqingResource.wedgeUntil,wedge and s.turn+1 or nil);eq(s.keqingResource.relicUsed,false);count=count+1
end end end end
print('CONDITIONAL_LITERAL_MATRIX '..count)
local claimed,observed={},{};local seedCount=0
for seed=42,57 do
 local r=F.new(D,seed);eq(r.candidateRewardPool,'keqing-reviewed-thirteen-v1');eq(r.hp,60);assert(R.startCombat(r,'cultist_solo'))
 for turn=1,16 do
  while r.phase=='combat'and r.combat.energy>0 and #r.combat.hand>0 do
   local selected;for _,id in ipairs({'KQ003','KQ004','KQ001','KQ002'})do for _,c in ipairs(r.combat.hand)do if c.cardId==id then selected=c;break end end;if selected then break end end
   assert(selected);assert(R.play(r,selected.uid,1))
  end
  if r.phase=='reward'then break end;assert(R.endTurn(r))
 end
 assert(r.phase=='reward');seedCount=seedCount+1;local options=R.rewardOptions(r);local selected
 for i,id in ipairs(options)do observed[id]=true;if values[id]and not claimed[id]and not selected then selected=i end end
 print('CONDITIONAL_OFFER '..seed..' '..table.concat(options,','))
 if selected then
  local id=options[selected];local up=r.rewards.cardUpgrades[selected]==true;local rng=C.copy(r.cardRng)
  assert(R.claimCardReward(r,selected));same(r.cardRng,rng);eq(#r.deck,11);local acquired=r.deck[#r.deck];eq(acquired.cardId,id);eq(acquired.upgraded,up)
  assert(R.leaveCombatRewards(r));assert(R.startCombat(r,'cultist_solo'));local s=r.combat;local played=false;local durable={};for _,c in ipairs(r.deck)do durable[c.uid]={cardId=c.cardId,upgraded=c.upgraded}end
  local function identity()
   local owners,uids,n={},{},0;for _,z in ipairs({'hand','draw','discard','exhaust'})do for _,c in ipairs(s[z])do local d=assert(durable[c.deckUid]);assert(not owners[c.deckUid]and not uids[c.uid]);owners[c.deckUid]=true;uids[c.uid]=true;eq(c.cardId,d.cardId);eq(c.upgraded,d.upgraded);n=n+1 end end;eq(n,11);for uid in pairs(durable)do assert(owners[uid])end
  end
  for turn=1,5 do
   identity();local c;for _,x in ipairs(s.hand)do if x.deckUid==acquired.uid then c=x end end
   if c then local energy=s.energy;assert(R.play(r,c.uid,1));eq(s.energy,energy-values[id].cost);identity();played=true;claimed[id]=true;print('CONDITIONAL_CLAIM_PAID '..id..' up='..tostring(up)..' seed='..seed);break end
   for i=#s.hand,1,-1 do local x=s.hand[i];if x.cardId=='KQ002'and s.energy>0 then assert(R.play(r,x.uid,1));identity()end end
   assert(R.endTurn(r));identity()
  end
  assert(played)
 end
 if claimed.KQ008 and claimed.KQ018 and claimed.KQ025 then break end
end
local observedN,claimedN=0,0;for _ in pairs(observed)do observedN=observedN+1 end;for _ in pairs(claimed)do claimedN=claimedN+1 end
assert(claimedN==3,'bounded seeds did not cover all conditional IDs');same(D,untouched)
print('KQ_CONDITIONAL_AUTHOR_PASS seeds='..seedCount..' observed='..observedN..' acquired='..claimedN)
