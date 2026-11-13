package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local V=dofile('experiments/characters/lifecycle/keqing-finisher-vectors.lua')
eq(V.run(C,D,eq),24)

local Paid=require('abyss_keqing_paid_cards');local Q=require('abyss_card_actions')
local function fresh(up,wedge)
 local data=C.copy(D);data.cards.cards[#data.cards.cards+1]={id='KQ004',name='finisher',type='attack',target='ENEMY',cost=2,rarity='special',color='colorless',experimental=true,keqingCandidate=true,keqingStage='004',effects={{op='damage',value=4,times=2}},upgrade={effects={{op='damage',value=5,times=2}}}}
 local deck={};for i=1,7 do deck[i]={cardId='KQ004',upgraded=up}end
 local s=C.new(data,{deck=deck,enemies={'jaw_worm','jaw_worm'},seed=11,candidateLifecycle={kind='keqing',relicEnabled=true}})
 s.player.hp=100;s.player.maxHp=100;s.keqingResource.infusion=2
 s.keqingResource.wedgeUntil=wedge and s.turn+1 or nil
 for _,e in ipairs(s.enemies)do e.hp=100;e.maxHp=100;e.block=0 end
 return s
end
-- Actual pause after first hit, before second: gate reads the live wedge, not
-- the admission snapshot. The wedge flip is controlled fixture state, not an
-- extra authored player action. Normal amount captures remain frozen.
for _,initial in ipairs({false,true})do
 local s=fresh(false,initial);local c=s.hand[1];local dispatch=Paid.dispatch;local once=false
 Paid.dispatch=function(combat,state,e,queue)
  if e.action.step==2 and not once then
   once=true;queue.pushTop(state,{kind='effect',effect=e});queue.pushTop(state,{kind='effect',effect={op='scry',value=2}});return true
  end
  return dispatch(combat,state,e,queue)
 end
 assert(C.play(s,c.uid,1));Paid.dispatch=dispatch
 eq(s.enemies[1].hp,94);eq(s.energy,1);eq(s.keqingResource.infusion,2)
 local pending=assert(s.pendingScry)
 s.keqingResource.wedgeUntil=not initial and s.turn+1 or nil
 s.player.statuses.strength=10 -- after-use capture must NOT recalculate hits/burst.
 local before=C.copy(s);local resource=s.keqingResource;local paid=s.pendingPlay.keqingPaid;local queue=s.actionQueue
 Paid.dispatch=function(combat,state,e,q)
  local result=dispatch(combat,state,e,q)
  if e.action.op=='currentWedgeBurstGate'then error('after current wedge gate')end
  return result
 end
 eq(pcall(C.chooseScry,s,{},pending.token),false);Paid.dispatch=dispatch
 same(s,before);eq(s.keqingResource,resource);eq(s.pendingPlay.keqingPaid,paid);eq(s.actionQueue,queue)
 assert(C.chooseScry(s,{},pending.token));eq(s.energy,1);eq(s.keqingResource.infusion,1);eq(s.keqingResource.wedgeUntil,nil)
 eq(s.enemies[1].hp,initial and 88 or 82);eq(s.enemies[2].hp,initial and 100 or 94)
 local done=C.copy(s);eq(C.chooseScry(s,{},pending.token),false);same(s,done)
end
-- Captured damage values/target/matrix cannot diverge from the stored plan.
for _,corruption in ipairs({'target','amount','matrix','duplicate'})do
 local s=fresh(false,true);local before=C.copy(s);local resource=s.keqingResource;local card=s.hand[1];local dispatch=Paid.dispatch;local once=false
 Paid.dispatch=function(combat,state,e,queue)
  if not once and ((corruption=='matrix'and e.action.step==3)or(corruption~='matrix'and e.action.step==1))then
   once=true
   if corruption=='target'then e.payload.targetId=state.enemies[2].id
   elseif corruption=='amount'then e.payload.normalAmount=999
   elseif corruption=='matrix'then e.payload.normalAmounts[state.enemies[2].id]=999
   else local result=dispatch(combat,state,e,queue);queue.pushTop(state,{kind='effect',effect=e});return result end
  end
  return dispatch(combat,state,e,queue)
 end
 eq(pcall(C.play,s,card.uid,1),false);Paid.dispatch=dispatch
 same(s,before);eq(s.keqingResource,resource);eq(s.hand[1],card)
end
-- True thorns death after hit one prevents hit two, burst gate and completion.
do
 local s=fresh(false,true);s.player.hp=1;s.enemies[1].statuses.thorns=3;s.enemies[1].powerOrder={'thorns'}
 local c=s.hand[1];assert(C.play(s,c.uid,1));eq(s.player.hp,0);eq(s.enemies[1].hp,94);eq(s.enemies[2].hp,100)
 eq(s.keqingResource.infusion,2);eq(s.keqingResource.wedgeUntil,s.turn+1);eq(s.cardInUse,c)
end
-- A burst reaction death occurs only AFTER the gate consumed the live wedge.
do
 local s=fresh(false,true);s.player.hp=7;s.enemies[1].statuses.thorns=3;s.enemies[1].powerOrder={'thorns'}
 local c=s.hand[1];assert(C.play(s,c.uid,1));eq(s.player.hp,0)
 eq(s.keqingResource.wedgeUntil,nil);eq(s.keqingResource.infusion,2);eq(s.cardInUse,c)
end
-- Existing final-victory policy skips resource gate, retains source UseCard.
do
 local s=fresh(false,true);s.enemies[1].hp=1;s.enemies[2].hp=0
 assert(C.play(s,s.hand[1].uid,1));eq(C.outcome(s),'victory')
 eq(s.keqingResource.wedgeUntil,s.turn+1);eq(s.keqingResource.infusion,1);eq(s.keqingResource.relicUsed,false)
end
for _,up in ipairs({false,true})do
 local s=fresh(up,true);local c=table.remove(s.hand,1);local energy=s.energy
 C.queueCard(s,c,{targetIndex=1,exhaustCards=false});Q.drain(C,s)
 eq(s.energy,energy);eq(s.enemies[1].hp,up and 78 or 82);eq(s.enemies[2].hp,up and 92 or 94)
 eq(s.keqingResource.infusion,1);eq(s.keqingResource.wedgeUntil,nil)
end
for _,field in ipairs({'fixed','condition','targetId'})do
 local s=fresh(false,true);s.catalog.cards.KQ004.effects[1][field]=true
 local before=C.copy(s);eq(C.play(s,s.hand[1].uid,1),false);same(s,before)
end
print('KEQING_FINISHER_USECARD_PASS')
