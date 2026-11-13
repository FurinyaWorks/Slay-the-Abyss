package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local V=dofile('experiments/characters/keqing-host/finisher-public-vectors.lua');eq(V.run(C,D,eq),24)
local Paid=require('abyss_keqing_paid_cards')
local function fresh(up)
 local d=C.copy(D);d.cards.cards[#d.cards.cards+1]={id='KQ004',name='candidate',type='attack',target='ENEMY',cost=2,rarity='special',color='colorless',experimental=true,keqingCandidate=true,keqingStage='004',effects={{op='damage',value=4,times=2}},upgrade={effects={{op='damage',value=5,times=2}}}}
 local deck={};for i=1,7 do deck[i]={cardId='KQ004',upgraded=up}end
 local s=C.new(d,{deck=deck,enemies={'jaw_worm','jaw_worm'},seed=11,candidateLifecycle={kind='keqing',relicEnabled=true}})
 s.player.hp=100;s.player.maxHp=100;s.keqingResource.infusion=2;s.keqingResource.wedgeUntil=s.turn+1
 for _,e in ipairs(s.enemies)do e.hp=100;e.maxHp=100;e.block=0 end
 return s
end
-- Independently target slot two, and kill the selected target on hit one.
for _,up in ipairs({false,true})do
 local s=fresh(up);s.enemies[2].hp=1;local card=s.hand[1];assert(C.play(s,card.uid,2));eq(s.enemies[2].hp,0);eq(s.enemies[1].hp,up and 92 or 94);eq(s.keqingResource.infusion,1);eq(s.keqingResource.wedgeUntil,nil)
 -- Distinct host terminal paths: last enemy kill vs player thorns death.
 for _,death in ipairs({false,true})do
  local t=fresh(up);local c=t.hand[1]
  if death then t.player.hp=1;t.enemies[2].statuses.thorns=3;t.enemies[2].powerOrder={'thorns'} else t.enemies[1].hp=0;t.enemies[2].hp=1 end
  assert(C.play(t,c.uid,2));eq(t.energy,1);eq(C.outcome(t),death and 'defeat' or 'victory');eq(t.keqingResource.wedgeUntil,t.turn+1);eq(t.keqingResource.infusion,death and 2 or 1);eq(t.keqingResource.relicUsed,false)
 end
 -- Pause directly before gate. Live wedge removal must cancel AoE, not rewind hits.
 local t=fresh(up);local dispatch=Paid.dispatch;local once=false
 Paid.dispatch=function(combat,state,e,q)
  if e.action.op=='currentWedgeBurstGate' and not once then once=true;q.pushTop(state,{kind='effect',effect=e});q.pushTop(state,{kind='effect',effect={op='scry',value=2}});return true end
  return dispatch(combat,state,e,q)
 end
 assert(C.play(t,t.hand[1].uid,2));Paid.dispatch=dispatch
 eq(t.enemies[2].hp,up and 86 or 88);eq(t.enemies[1].hp,100);eq(t.energy,1);eq(t.keqingResource.infusion,2)
 local token=assert(t.pendingScry).token;t.keqingResource.wedgeUntil=nil
 local before=C.copy(t);local resource=t.keqingResource;local pending=t.pendingPlay;local queue=t.actionQueue
 Paid.dispatch=function(combat,state,e,q)local r=dispatch(combat,state,e,q);if e.action.op=='currentWedgeBurstGate'then error('probe after gate')end;return r end
 eq(pcall(C.chooseScry,t,{},token),false);Paid.dispatch=dispatch;same(t,before);eq(t.keqingResource,resource);eq(t.pendingPlay,pending);eq(t.actionQueue,queue)
 assert(C.chooseScry(t,{},token));eq(t.enemies[1].hp,100);eq(t.keqingResource.infusion,1);eq(t.energy,1);local done=C.copy(t);eq(C.chooseScry(t,{},token),false);same(t,done)
end
print('KEQING_FINISHER_INDEPENDENT_PASS')
