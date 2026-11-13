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
-- Independent combinations: base/upgraded x wedge x terminal mode.
for _,up in ipairs({false,true})do for _,wedge in ipairs({false,true})do for _,mode in ipairs({'live','victory','death','mutual'})do
 local s=fresh(up,1,wedge);local card=s.hand[1];local energy=s.energy
 if mode=='victory'or mode=='mutual'then s.enemies[1].hp=1 end
 if mode=='death'or mode=='mutual'then s.player.hp=1;C.addStatus(s.enemies[1],'thorns',3)end
 local oldDispatch=Paid.dispatch;local stages={}
 Paid.dispatch=function(combat,state,e,q)
  stages[#stages+1]=e.action.op
  if e.action.op=='rawDamage'and wedge then eq(state.keqingResource.wedgeUntil,nil)end
  return oldDispatch(combat,state,e,q)
 end
 assert(C.play(s,card.uid,1));Paid.dispatch=oldDispatch;eq(s.energy,energy-1)
 if mode=='live'then
  eq(#stages,wedge and 3 or 2);eq(s.keqingResource.infusion,wedge and 2 or 0)
  eq(s.player.block,wedge and 0 or 4);eq(s.keqingResource.relicUsed,not wedge)
 elseif mode=='victory'then
  eq(C.outcome(s),'victory');eq(#stages,wedge and 2 or 1);eq(s.keqingResource.infusion,0);eq(s.cardInUse,nil)
 else
  eq(C.outcome(s),'defeat');eq(#stages,wedge and 2 or 1);eq(s.keqingResource.infusion,1);eq(s.cardInUse,card)
 end
 if mode~='live'then eq(s.keqingResource.wedgeUntil,nil);eq(s.keqingResource.relicUsed,false);eq(s.player.block,0)end
 eq(s.pendingPlay,nil)
end end end
-- Synthetic pause after consume, BEFORE rawDamage reaches dispatch. No resource
-- refresh may be preloaded, and a failed resumed defer restores the paused graph.
for _,up in ipairs({false,true})do
 local s=fresh(up,1,true);local card=s.hand[1];local energy=s.energy;local dispatch=Paid.dispatch
 Paid.dispatch=function(combat,state,e,q)local r=dispatch(combat,state,e,q);if e.action.op=='consumeWedge'then q.pushTop(state,{kind='effect',effect={op='scry',value=2}})end;return r end
 assert(C.play(s,card.uid,1));Paid.dispatch=dispatch
 eq(s.enemies[1].hp,100);eq(s.keqingResource.wedgeUntil,nil);eq(s.keqingResource.infusion,1)
 eq(s.pendingPlay.keqingPaid.newInfusion,nil);local pending=s.pendingScry;local paid=s.pendingPlay.keqingPaid;local resource=s.keqingResource;local queue=s.actionQueue;local before=C.copy(s)
 Paid.dispatch=function(combat,state,e,q)local r=dispatch(combat,state,e,q);if e.action.op=='deferInfusion'then error('independent defer rollback')end;return r end
 eq(pcall(C.chooseScry,s,{},pending.token),false);Paid.dispatch=dispatch
 same(s,before);eq(s.pendingPlay.keqingPaid,paid);eq(s.keqingResource,resource);eq(s.actionQueue,queue);eq(s.cardInUse,card)
 assert(C.chooseScry(s,{},pending.token));eq(s.energy,energy-1);eq(s.enemies[1].hp,up and 87 or 90);eq(s.keqingResource.infusion,2)
 local done=C.copy(s);eq(C.chooseScry(s,{},pending.token),false);same(s,done)
end
-- Fixed relic shield must cross the real queued payload without Dex/Frail scaling.
for _,up in ipairs({false,true})do
 local s=fresh(up,0,false);C.addStatus(s.player,'dexterity',10);C.addStatus(s.player,'frail',1)
 assert(C.play(s,s.hand[1].uid,1));eq(s.player.block,4);eq(s.keqingResource.relicUsed,true)
end
print('KEQING_STAGED_INDEPENDENT_PASS 16 terminal combinations and 2 paused rollback paths')
