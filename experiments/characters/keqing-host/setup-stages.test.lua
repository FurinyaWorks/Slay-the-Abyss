package.path='experiments/characters/keqing-host/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local M=require('abyss_keqing_setup_cards');local Paid=require('abyss_keqing_paid_cards');local Resources=require('abyss_keqing_resources')
-- Temporary routing is test-only. Shared admission and rewards are NOT changed.
local Effects=require('abyss_effects');local oldSupported=Effects.supported
Effects.supported=function(effects)if #effects==1 and M.supports(effects[1])then return true end;return oldSupported(effects)end
local oldUse,oldPrepare,oldDispatch=Paid.canUse,Paid.prepare,Paid.dispatch
Paid.canUse=function(s,c,i)if M.known(i and i.cardId)then return M.canUse(c,i),'setup_definition_unavailable'end;return oldUse(s,c,i)end
Paid.prepare=function(s,c,e,combat,target)
 if not M.known(s.cardInUse.cardId)then return oldPrepare(s,c,e,combat,target)end
 local p=assert(s.pendingPlay);local attack=c.type=='attack';p.keqingPaid={turn=s.turn,uid=p.uid,attack=attack,infused=attack and s.keqingResource.infusion>0}
 return M.prepare(combat,s,c,target,p.keqingPaid,p)
end
Paid.dispatch=function(combat,s,e,q)if s.pendingPlay.keqingPaid.setup then return M.dispatch(s,e,s.pendingPlay.keqingPaid,q)end;return oldDispatch(combat,s,e,q)end
local definitions=M.definitions();local original=C.copy(D)
local function fresh(id,up,inf,wedge,enabled)
 local d=C.copy(D);for _,c in ipairs(M.definitions().cards)do d.cards.cards[#d.cards.cards+1]=c end
 local s=C.new(d,{deck={id,'defend','defend','defend','defend','defend'},enemies={'cultist','cultist'},seed=42,candidateLifecycle={kind='keqing',relicEnabled=enabled}})
 local card;for _,zone in ipairs({'hand','draw'})do for i=#s[zone],1,-1 do if s[zone][i].cardId==id then card=table.remove(s[zone],i)end end end;assert(card);card.upgraded=up;s.hand[#s.hand+1]=card
 for _,e in ipairs(s.enemies)do e.hp=100;e.maxHp=100 end;s.keqingResource.infusion=inf;if wedge==0 then s.keqingResource.wedgeUntil=nil else s.keqingResource.wedgeUntil=s.turn+wedge-1 end;return s,card
end
local n=0
for _,id in ipairs({'KQ010','KQ011','KQ013'})do for _,up in ipairs({false,true})do for inf=0,1 do for wedge=0,2 do for _,relic in ipairs({false,true})do
 local s,c=fresh(id,up,inf,wedge,relic);local oldWedge=s.keqingResource.wedgeUntil
 assert(C.play(s,c.uid,1));local base=id=='KQ010'and(up and 7 or 4)or 0
 eq(s.player.block,base+(wedge==0 and relic and 4 or 0));eq(s.keqingResource.wedgeUntil,oldWedge or s.turn+1);eq(s.keqingResource.relicUsed,wedge==0 and relic)
 eq(s.keqingResource.infusion,id=='KQ010'and inf or 0);eq(s.energy,id=='KQ011'and 1 or 2)
 local hit=id=='KQ011'and(up and 16 or 12)or id=='KQ013'and(up and 5 or 3)or 0;local bonus=id~='KQ010'and inf>0 and 2 or 0
 eq(s.enemies[1].hp,100-hit-bonus);eq(s.enemies[2].hp,id=='KQ013'and 100-hit-bonus or 100);n=n+1
end end end end end
-- Dynamic stage gate: insert a native reveal after the first effect, before setup.
for _,id in ipairs({'KQ010','KQ011','KQ013'})do for _,entry in ipairs({false,true})do
 local s,c=fresh(id,false,1,entry and 2 or 0,true);local dispatch=Paid.dispatch;local once=false
 Paid.dispatch=function(combat,state,e,q)
  if e.action.op=='setWedgeIfAbsent'and not once then once=true;q.pushTop(state,{kind='effect',effect=e});q.pushTop(state,{kind='effect',effect={op='scry',value=1}});return true end
  return dispatch(combat,state,e,q)
 end
 assert(C.play(s,c.uid,1));Paid.dispatch=dispatch;local p=assert(s.pendingScry);local energy=s.energy;local block=s.player.block
 if entry then s.keqingResource.wedgeUntil=nil else s.keqingResource.wedgeUntil=s.turn end -- live flip, preserve current-turn expiry when present
 local before=C.copy(s);local pending,queue,resource=s.pendingPlay,s.actionQueue,s.keqingResource
 Paid.dispatch=function(...)local v=dispatch(...);error('after actual setup stage')end
 assert(not pcall(C.chooseScry,s,{},p.token));Paid.dispatch=dispatch;same(s,before);eq(s.pendingPlay,pending);eq(s.actionQueue,queue);eq(s.keqingResource,resource);eq(s.pendingScry,p)
 assert(C.chooseScry(s,{},p.token));eq(s.energy,energy);eq(s.keqingResource.wedgeUntil,entry and s.turn+1 or s.turn);eq(s.keqingResource.relicUsed,entry);eq(s.player.block,block+(entry and 4 or 0))
 before=C.copy(s);eq(C.chooseScry(s,{},p.token),false);same(s,before)
end end
-- Strict payload/source rejection and ordinary/fixed shield distinction.
for _,id in ipairs({'KQ010','KQ011','KQ013'})do
 local s,c=fresh(id,false,0,0,true);s.catalog.cards[id].effects[1].fixed=true;local b=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,b)
 s,c=fresh(id,false,0,0,true);s.energy=0;b=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,b)
end
for _,up in ipairs({false,true})do local s,c=fresh('KQ010',up,1,0,true);s.player.statuses.dexterity=10;s.player.statuses.frail=1;assert(C.play(s,c.uid,1));eq(s.player.block,(up and 12 or 10)+4);eq(s.keqingResource.infusion,1)end
-- Native terminal gate skips later setup and does not fabricate relic gain.
for _,id in ipairs({'KQ011','KQ013'})do
 local s,c=fresh(id,false,1,0,true);s.player.hp=1;s.enemies[1].statuses.thorns=2;assert(C.play(s,c.uid,1));eq(s.player.hp,0);eq(s.keqingResource.wedgeUntil,nil);eq(s.keqingResource.relicUsed,false);eq(s.keqingResource.infusion,1)
 s,c=fresh(id,false,1,0,true);for _,e in ipairs(s.enemies)do e.hp=id=='KQ013'and 1 or 0 end;s.enemies[1].hp=1;assert(C.play(s,c.uid,1));eq(s.keqingResource.wedgeUntil,nil);eq(s.keqingResource.relicUsed,false);eq(s.keqingResource.infusion,0)
end
Effects.supported=oldSupported;Paid.canUse, Paid.prepare,Paid.dispatch=oldUse,oldPrepare,oldDispatch;same(D,original);same(M.definitions(),definitions)
print('KQ_SETUP_STAGE_PASS matrix='..n..' live=6 strict=6 modifiers=2 terminal=4')
