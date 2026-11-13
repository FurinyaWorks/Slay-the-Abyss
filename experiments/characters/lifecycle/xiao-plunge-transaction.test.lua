package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same;local Bridge=require('abyss_xiao_play_bridge');local Paid=require('abyss_xiao_paid_cards');local A=require('abyss_card_actions')
local function fresh(up,mask)
 local d=C.copy(D);for _,v in ipairs(Bridge.definitions())do d.cards.cards[#d.cards.cards+1]=v end
 local s=C.new(d,{deck={'xiao_candidate_x05','defend','defend','defend'},enemies={'cultist','cultist'},seed=42,candidateLifecycle={kind='xiao',relicEnabled=false}})
 local c;for _,v in ipairs(s.hand)do if v.cardId=='xiao_candidate_x05'then c=v end end;c.upgraded=up;s.player.statuses.xiao_mask=mask and 2 or nil;for _,e in ipairs(s.enemies)do e.hp=100;e.block=0 end;return s,c
end
for _,up in ipairs({false,true})do for _,mask in ipairs({false,true})do for _,mode in ipairs({'normal','unmarked','silentFinalCard','extra'})do
 local s,c=fresh(up,mask);local d=s.catalog.cards[c.cardId]
 if mode=='unmarked'then d.xiaoCandidate=nil elseif mode=='extra'then d.effects[1].fixed=true;d.upgrade.effects[1].fixed=true elseif mode=='silentFinalCard'then d.silentFinalCard=true end
 for i,v in ipairs(s.hand)do if v==c then table.remove(s.hand,i);break end end
 C.queueCard(s,c,{targetIndex=2,exhaustCards=false});A.drain(C,s);eq(s.energy,3)
 local amount=(up and 9 or 6)+(mask and 4 or 0);eq(s.enemies[2].hp,mode=='normal'and 100-amount or 100);eq(s.enemies[1].hp,mode=='normal'and mask and 100-amount or 100)
end end end
-- Actual paused paid command is restored after native group damage fails.
do
 local s,c=fresh(true,true);for i=#s.hand,1,-1 do if s.hand[i]~=c then s.draw[#s.draw+1]=table.remove(s.hand,i);break end end
 local dispatch=Paid.dispatch;local once=false
 Paid.dispatch=function(combat,state,e,q)if not once then once=true;q.pushTop(state,{kind='effect',effect=e});q.pushTop(state,{kind='effect',effect={op='scry',value=1}});return true end;return dispatch(combat,state,e,q)end
 assert(C.play(s,c.uid));Paid.dispatch=dispatch;local p=assert(s.pendingScry);eq(s.energy,2);eq(s.enemies[1].hp,100)
 local before=C.copy(s);local resource,queue,pending=s.xiao,s.actionQueue,s.pendingPlay;local damage=C.damage;local hit=false
 C.damage=function(...)damage(...);hit=true;error('native plunge group damage failure')end
 eq(pcall(C.chooseScry,s,{},p.token),false);C.damage=damage;assert(hit);same(s,before);eq(s.xiao,resource);eq(s.actionQueue,queue);eq(s.pendingPlay,pending);eq(s.pendingScry,p)
 assert(C.chooseScry(s,{},p.token));eq(s.enemies[1].hp,87);eq(s.enemies[2].hp,87);eq(s.energy,2)
 before=C.copy(s);eq(C.chooseScry(s,{},p.token),false);same(s,before)
end
print('XIAO_PLUNGE_TRANSACTION_PASS')
