package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same;local Paid=require('abyss_keqing_paid_cards');local Run=require('abyss_run')
local function fresh(id,up,resource,mods)
 local d=C.copy(D);for _,v in ipairs(Paid.defenseDefinitions().cards)do d.cards.cards[#d.cards.cards+1]=v end
 local s=C.new(d,{deck={id,'defend','defend','defend'},enemies={'cultist'},seed=42,candidateLifecycle={kind='keqing',relicEnabled=true}})
 local card;for _,v in ipairs(s.hand)do if v.cardId==id then card=v end end;card.upgraded=up
 s.keqingResource.infusion=resource and 2 or 0;s.keqingResource.wedgeUntil=resource and s.turn+1 or nil
 if mods then s.player.statuses.dexterity=10;s.player.statuses.frail=1 end
 return s,card
end
local count=0
for _,id in ipairs({'KQ006','KQ007'})do for _,up in ipairs({false,true})do for _,resource in ipairs({false,true})do for _,mods in ipairs({false,true})do
 local s,c=fresh(id,up,resource,mods);local expected=mods and(up and 13 or 11)or(up and 8 or 5)
 if resource then expected=expected+(mods and(id=='KQ006'and 11 or 10)or(id=='KQ006'and 5 or 4))end
 assert(C.play(s,c.uid));eq(s.energy,2);eq(s.player.block,expected);eq(s.keqingResource.relicUsed,false)
 eq(s.keqingResource.infusion,resource and(id=='KQ007'and 1 or 2)or 0);eq(s.keqingResource.wedgeUntil,resource and id=='KQ007'and s.turn+1 or nil)
 eq(s.discard[#s.discard],c);local before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before);count=count+1
end end end end
print('KQ_DEFENSE_MATRIX_PASS '..count)
-- Revealed continuation reads current resources but uses captured block modifiers.
for _,id in ipairs({'KQ006','KQ007'})do
 local s,c=fresh(id,true,true,true);for i=#s.hand,1,-1 do if s.hand[i]~=c then s.draw[#s.draw+1]=table.remove(s.hand,i);break end end
 local dispatch=Paid.dispatch;local once=false
 Paid.dispatch=function(combat,state,e,q)if not once then once=true;q.pushTop(state,{kind='effect',effect=e});q.pushTop(state,{kind='effect',effect={op='scry',value=1}});return true end;return dispatch(combat,state,e,q)end
 assert(C.play(s,c.uid));Paid.dispatch=dispatch;local p=assert(s.pendingScry);eq(s.player.block,13);eq(s.energy,2)
 s.player.statuses.dexterity=0;s.player.statuses.frail=nil
 local before=C.copy(s);local r,queue,pending=s.keqingResource,s.actionQueue,s.pendingPlay;local block=C.block;local hit=false
 C.block=function(...)block(...);hit=true;error('after second real block')end
 eq(pcall(C.chooseScry,s,{},p.token),false);C.block=block;assert(hit);same(s,before);eq(s.keqingResource,r);eq(s.actionQueue,queue);eq(s.pendingPlay,pending);eq(s.pendingScry,p)
 assert(C.chooseScry(s,{},p.token));eq(s.player.block,id=='KQ006'and 24 or 23);eq(s.energy,2);before=C.copy(s);eq(C.chooseScry(s,{},p.token),false);same(s,before)
end
-- Resource branch is evaluated after the first native block, not at admission.
for _,id in ipairs({'KQ006','KQ007'})do for _,entry in ipairs({false,true})do
 local s,c=fresh(id,false,entry,false);local dispatch=Paid.dispatch
 Paid.dispatch=function(combat,state,e,q)
  if id=='KQ006'then state.keqingResource.wedgeUntil=not entry and state.turn+1 or nil
  else state.keqingResource.infusion=not entry and 1 or 0 end
  return dispatch(combat,state,e,q)
 end
 assert(C.play(s,c.uid));Paid.dispatch=dispatch
 eq(s.player.block,entry and 5 or(id=='KQ006'and 10 or 9))
end end
-- Controlled native death after the first shield stops the resource-consuming custom stage.
do local s,c=fresh('KQ006',false,true,false);local block=C.block;local once=false
 C.block=function(...)local result=block(...);if not once then once=true;require('abyss_actor').loseHp(s,s.player,999)end;return result end
 assert(C.play(s,c.uid));C.block=block;eq(s.player.hp,0);eq(s.keqingResource.wedgeUntil,s.turn+1);eq(s.energy,2);eq(s.keqingResource.relicUsed,false)
end
local A=require('abyss_card_actions')
for _,id in ipairs({'KQ006','KQ007'})do for _,mode in ipairs({'normal','unmarked','extra','wrongFace','badUpgrade','silentFinalCard'})do
 local s,c=fresh(id,false,true,false);local d=s.catalog.cards[c.cardId]
 if mode=='unmarked'then d.keqingCandidate=nil elseif mode=='extra'then d.effects[1].fixed=true elseif mode=='wrongFace'then d.effects[1].value=8 elseif mode=='badUpgrade'then c.upgraded='false'elseif mode~='normal'then d[mode]=true end
 if mode~='normal'then local before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before)end
 for i,v in ipairs(s.hand)do if v==c then table.remove(s.hand,i);break end end
 C.queueCard(s,c,{exhaustCards=false});A.drain(C,s);eq(s.energy,3);eq(s.player.block,mode=='normal'and(id=='KQ006'and 10 or 9)or 0)
end end
-- Actual fixed reward, persistent UID and upgraded identity enter the candidate Run.
for _,id in ipairs({'KQ006','KQ007'})do for _,up in ipairs({false,true})do
 local r=require('abyss_keqing_starter_run').new(D,42);for _,d in ipairs(Paid.defenseDefinitions().cards)do r.data.cards.cards[#r.data.cards.cards+1]=d end
 assert(Run.startCombat(r,'cultist_solo'));C.damage(r.combat,r.combat.player,r.combat.enemies[1],999,true);assert(Run.finishCombat(r))
 r.rewards.cards={id};r.rewards.cardUpgrades={up};r.rewards.cardResolved=false;assert(Run.claimCardReward(r,1));local uid=r.deck[#r.deck].uid
 assert(Run.leaveCombatRewards(r));assert(Run.startCombat(r,'cultist_solo'));local s=r.combat;local c
 for _,pile in ipairs({s.hand,s.draw})do for i,v in ipairs(pile)do if v.deckUid==uid then c=table.remove(pile,i);s.hand[#s.hand+1]=c;break end end;if c then break end end;assert(c);eq(c.upgraded,up)
 assert(Run.play(r,c.uid));eq(s.energy,2);eq(s.player.block,up and 8 or 5);eq(s.discard[#s.discard],c)
end end
print('KQ_DEFENSE_TRANSACTION_RUN_PASS')
