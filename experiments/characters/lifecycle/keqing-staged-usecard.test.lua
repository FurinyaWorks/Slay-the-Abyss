package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D=H.C,H.Data;local eq,same=H.eq,H.same
local Paid=require('abyss_keqing_paid_cards')
local function fresh(up,inf,wedge)
 local data=C.copy(D)
 data.cards.cards[#data.cards.cards+1]={id='KQ003',name='staged candidate',type='attack',target='ENEMY',cost=1,
 rarity='special',color='colorless',experimental=true,keqingCandidate=true,keqingStage='003',
 effects={{op='damage',value=5}},upgrade={effects={{op='damage',value=7}}}}
 local deck={};for i=1,7 do deck[i]={cardId='KQ003',upgraded=up}end
 local s=C.new(data,{deck=deck,enemies={'jaw_worm'},seed=11,candidateLifecycle={kind='keqing',relicEnabled=true}})
 s.player.hp=100;s.player.maxHp=100;s.enemies[1].hp=100;s.enemies[1].maxHp=100
 s.keqingResource.infusion=inf;s.keqingResource.wedgeUntil=wedge and s.turn+1 or nil
 return s
end
for _,up in ipairs({false,true})do for inf=0,2 do for _,wedge in ipairs({false,true})do
 local s=fresh(up,inf,wedge);local energy=s.energy;local card=s.hand[1]
 local raw=wedge and(up and 11 or 8)or(up and 7 or 5)
 assert(C.play(s,card.uid,1));eq(s.energy,energy-1);eq(s.enemies[1].hp,100-raw-(inf>0 and 2 or 0))
 eq(s.keqingResource.infusion,wedge and 2 or math.max(0,inf-1))
 if wedge then eq(s.keqingResource.wedgeUntil,nil)else eq(s.keqingResource.wedgeUntil,s.turn+1)end
 eq(s.keqingResource.relicUsed,not wedge);eq(s.player.block,wedge and 0 or 4)
end end end
-- The staged importer must not silently discard source effect semantics.
for _,field in ipairs({'fixed','condition','targetId','normalAmount','times','if','poisonBonus'})do
 local s=fresh(false,0,false);local card=s.hand[1]
 s.catalog.cards.KQ003.effects[1][field]=field=='fixed' and true or 1
 local before=C.copy(s);eq(Paid.canUse(s,C.cardDefinition(s,card)),false)
 local called,ok=pcall(C.play,s,card.uid,1);assert(not called or ok==false)
 same(s,before)
end
-- Setup relic once, fixed through Dexterity/Frail, and a controlled replay
-- of the same entity gets a new accepted-use identity. Direct hand/energy setup
-- below is NOT a natural card acquisition chain.
do
 local s=fresh(false,0,false);s.player.statuses.dexterity=9;s.player.statuses.frail=1
 local card=s.hand[1];assert(C.play(s,card.uid,1));eq(s.player.block,4)
 table.remove(s.discard,#s.discard);s.hand[#s.hand+1]=card;s.energy=3
 assert(C.play(s,card.uid,1));eq(s.keqingResource.infusion,2);eq(s.keqingResource.wedgeUntil,nil);eq(s.player.block,4)
end
-- Source terminal policy: custom resource ops are NOT retained after victory.
for _,wedge in ipairs({false,true})do
 local s=fresh(false,2,wedge);s.enemies[1].hp=1
 assert(C.play(s,s.hand[1].uid,1));eq(C.outcome(s),'victory')
 eq(s.keqingResource.wedgeUntil,nil);eq(s.keqingResource.infusion,1);eq(s.keqingResource.relicUsed,false);eq(s.player.block,0)
end
-- Real thorns kills inside the damage stage: no later setup, relic or UseCard.
do
 local s=fresh(false,2,false);s.player.hp=1;s.enemies[1].statuses.thorns=3;s.enemies[1].powerOrder={'thorns'}
 assert(C.play(s,s.hand[1].uid,1));eq(s.player.hp,0);eq(s.keqingResource.infusion,2)
 eq(s.keqingResource.wedgeUntil,nil);eq(s.keqingResource.relicUsed,false)
end
-- Error after resource mutation rolls back the actual paid command and aliases.
do
 local s=fresh(false,2,false);local resource=s.keqingResource;local card=s.hand[1];local hand=s.hand;local before=C.copy(s)
 local dispatch=Paid.dispatch
 Paid.dispatch=function(combat,state,effect,queue)
  local result=dispatch(combat,state,effect,queue)
  if effect.action.op=='setWedgeUntil'then error('after staged setup')end
  return result
 end
 eq(pcall(C.play,s,card.uid,1),false);Paid.dispatch=dispatch
 same(s,before);eq(s.keqingResource,resource);eq(s.hand,hand);eq(s.hand[1],card)
 assert(C.play(s,card.uid,1));eq(s.keqingResource.wedgeUntil,s.turn+1)
end
-- Synthetic interruption inserted by the test at the real queued stage boundary.
-- It is not an authored scry ability on KQ003.
do
 local s=fresh(false,2,true);local card=s.hand[1];local energy=s.energy
 local dispatch=Paid.dispatch;local injected=false
 Paid.dispatch=function(combat,state,effect,queue)
  local result=dispatch(combat,state,effect,queue)
  if effect.action.op=='rawDamage' and not injected then
   injected=true;queue.pushTop(state,{kind='effect',effect={op='scry',value=2}})
  end
  return result
 end
 assert(C.play(s,card.uid,1));Paid.dispatch=dispatch
 eq(s.energy,energy-1);eq(s.keqingResource.wedgeUntil,nil);eq(s.keqingResource.infusion,2)
 local pending=assert(s.pendingScry);local paid=s.pendingPlay.keqingPaid;local before=C.copy(s)
 local queue=s.actionQueue;local resource=s.keqingResource
 eq(C.play(s,card.uid,1),false);same(s,before)
 Paid.dispatch=function(combat,state,effect,q)
  local result=dispatch(combat,state,effect,q)
  if effect.action.op=='deferInfusion'then error('after staged defer')end
  return result
 end
 eq(pcall(C.chooseScry,s,{},pending.token),false);Paid.dispatch=dispatch
 same(s,before);eq(s.keqingResource,resource);eq(s.pendingPlay.keqingPaid,paid);eq(s.actionQueue,queue)
 assert(C.chooseScry(s,{},pending.token));eq(s.energy,energy-1);eq(s.enemies[1].hp,90)
 eq(s.keqingResource.infusion,2);local done=C.copy(s)
 eq(C.chooseScry(s,{},pending.token),false);same(s,done)
end
print('KEQING_STAGED_USECARD_PASS')
