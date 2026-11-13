package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Paid=require('abyss_keqing_paid_cards');local A=require('abyss_card_actions')
local ids={'KQ008','KQ018','KQ025'}
local function fresh(id,up,inf,wedge,mods)
 local d=C.copy(D);for _,v in ipairs(Paid.conditionalDefinitions().cards)do d.cards.cards[#d.cards.cards+1]=v end
 local s=C.new(d,{deck={id,'defend','defend','defend','defend','defend'},enemies={'cultist','cultist'},seed=42,candidateLifecycle={kind='keqing',relicEnabled=true}})
 local card;for _,pile in ipairs({s.hand,s.draw})do for i,v in ipairs(pile)do if v.cardId==id then card=table.remove(pile,i);break end end;if card then break end end;s.hand[#s.hand+1]=assert(card);card.upgraded=up
 s.keqingResource.infusion=inf;s.keqingResource.wedgeUntil=wedge and s.turn+1 or nil
 for _,e in ipairs(s.enemies)do e.hp=100;e.maxHp=100 end
 if mods then s.player.statuses.strength=3;s.player.statuses.weak=1;s.player.statuses.dexterity=10;s.player.statuses.frail=1;s.enemies[1].statuses.vulnerable=1 end
 return s,card
end
local count=0
for _,id in ipairs(ids)do for _,up in ipairs({false,true})do for inf=0,2 do for _,wedge in ipairs({false,true})do for _,mods in ipairs({false,true})do
 local s,c=fresh(id,up,inf,wedge,mods);local bonus=inf>0 and 2 or 0;local damage,block=0,0
 local function hit(n)return C.attackAmount(s,s.player,s.enemies[1],n+bonus)end
 if id=='KQ008'then damage=hit(wedge and(up and 11 or 8)or(up and 8 or 5))
 elseif id=='KQ018'then damage=2*hit(up and 5 or 4);if inf==0 then block=C.blockAmount(s,s.player,up and 4 or 3)end
 else damage=hit(up and 13 or 10)+(inf>0 and hit(up and 9 or 7)or 0)end
 assert(C.play(s,c.uid,1));eq(s.enemies[1].hp,100-damage);eq(s.enemies[2].hp,100);eq(s.player.block,block);eq(s.energy,id=='KQ025'and 1 or 2)
 eq(s.keqingResource.infusion,math.max(0,inf-1));eq(s.keqingResource.wedgeUntil,wedge and s.turn+1 or nil);eq(s.keqingResource.relicUsed,false);eq(s.discard[#s.discard],c);count=count+1
end end end end end
print('KQ_CONDITIONAL_MATRIX_PASS '..count)
-- Reveal before first stage, then vary live wedge or infusion without changing captured modifiers.
for _,id in ipairs(ids)do for _,entry in ipairs({false,true})do
 local s,c=fresh(id,false,entry and 1 or 0,entry,false);local old=Paid.dispatch;local once=false
 Paid.dispatch=function(combat,state,e,q)if not once then once=true;q.pushTop(state,{kind='effect',effect=e});q.pushTop(state,{kind='effect',effect={op='scry',value=1}});return true end;return old(combat,state,e,q)end
 assert(C.play(s,c.uid,1));Paid.dispatch=old;local p=assert(s.pendingScry);local energy=s.energy
 s.keqingResource.wedgeUntil=not entry and s.turn+1 or nil;s.keqingResource.infusion=entry and 2 or 1;s.player.statuses.strength=20
 local before=C.copy(s);local pending,queue,res=s.pendingPlay,s.actionQueue,s.keqingResource
 local hit=false;Paid.dispatch=function(...)local v=old(...);hit=true;error('after conditional push')end
 assert(not pcall(C.chooseScry,s,{},p.token));Paid.dispatch=old;assert(hit);same(s,before);assert(s.pendingPlay==pending and s.actionQueue==queue and s.keqingResource==res and s.pendingScry==p)
 assert(C.chooseScry(s,{},p.token));local expected=id=='KQ008'and(entry and 7 or 8)or id=='KQ018'and(entry and 12 or 8)or(entry and 21 or 10)
 eq(s.enemies[1].hp,100-expected);eq(s.player.block,id=='KQ018'and not entry and 3 or 0);eq(s.energy,energy);eq(s.keqingResource.infusion,1)
 before=C.copy(s);eq(C.chooseScry(s,{},p.token),false);same(s,before)
end end
for _,id in ipairs(ids)do for _,mode in ipairs({'normal','unmarked','extra','badFace','wrongFace','native','badStage'})do
 local s,c=fresh(id,false,1,false,false);local d=s.catalog.cards[id]
 if mode=='unmarked'then d.keqingCandidate=nil elseif mode=='extra'then d.effects[1].fixed=true elseif mode=='badFace'then c.upgraded='false'elseif mode=='wrongFace'then d.effects=d.upgrade.effects elseif mode=='native'then d.runNativeABI=true elseif mode=='badStage'then d.keqingStage='003'end
 if mode~='normal'then local b=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,b)end
 for i,v in ipairs(s.hand)do if v==c then table.remove(s.hand,i);break end end
 C.queueCard(s,c,{targetIndex=1,exhaustCards=false});A.drain(C,s);eq(s.energy,3);eq(s.keqingResource.infusion,mode=='normal'and 0 or 1)
end end
-- Actual native thorns interrupts the remaining stages and prevents UseCard consumption.
for _,id in ipairs(ids)do
 local s,c=fresh(id,false,1,true,false);s.player.hp=1;s.enemies[1].statuses.thorns=2
 assert(C.play(s,c.uid,1));eq(s.player.hp,0);eq(s.keqingResource.infusion,1);eq(s.keqingResource.relicUsed,false)
 s,c=fresh(id,false,1,false,false);s.enemies[1].hp=1;assert(C.play(s,c.uid,1));eq(s.enemies[2].hp,100)
 s,c=fresh(id,false,1,false,false);local b=C.copy(s);eq(C.play(s,c.uid,99),false);same(s,b)
end
-- Last-enemy victory retains native completion, but not deferred shield/hits.
for _,id in ipairs(ids)do for _,up in ipairs({false,true})do for _,inf in ipairs({0,1})do
 local s,c=fresh(id,up,inf,true,false);s.enemies[1].hp=1;s.enemies[2].hp=0
 assert(C.play(s,c.uid,1));eq(s.keqingResource.infusion,0);eq(s.player.block,0);eq(s.keqingResource.wedgeUntil,s.turn+1);eq(s.discard[#s.discard],c)
 local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before)
end end end
print('KQ_CONDITIONAL_TRANSACTION_PASS 6 live/entry paused cases; 21 auto; native reaction/identity')
