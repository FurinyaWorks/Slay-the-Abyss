-- Actual canonical x02/x06 public paid gate acceptance.
-- Inject only canonical candidate definitions; never replace C.play or its gate.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua')
local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Dispatch=require('abyss_xiao_dispatch')
local Schedule=require('abyss_power_schedule')
local function fresh(up)
 local deck={};for _,id in ipairs({'x02','x04','x06'})do for i=1,3 do deck[#deck+1]={cardId='xiao_candidate_'..id,upgraded=up}end end
 local data=C.copy(D)
 for _,def in ipairs(require('abyss_xiao_play_bridge').definitions())do
  if def.id=='xiao_candidate_x01'or def.id=='xiao_candidate_x02'or def.id=='xiao_candidate_x04'or def.id=='xiao_candidate_x06'then
   def.rarity='special';def.color='colorless';data.cards.cards[#data.cards.cards+1]=def
  end
 end
 local s=C.new(data,{deck=deck,enemies={'jaw_worm'},seed=11,candidateLifecycle={kind='xiao',relicEnabled=true}})
 -- Draw real constructor deck without replacing any card entities.
 C.draw(s,#s.draw);s.player.hp=70;s.player.maxHp=70
 return s
end
local function find(s,id)for _,c in ipairs(s.hand)do if c.cardId=='xiao_candidate_'..id then return c end end;error('missing card '..id)end
for _,up in ipairs({false,true})do
 local s=fresh(up);local defense=find(s,'x02');local before=C.copy(s);local energy=s.energy
 s.energy=0;before=C.copy(s);eq(C.play(s,defense.uid,1),false);same(s,before);s.energy=energy
 assert(C.play(s,defense.uid,1));eq(s.energy,energy-1);eq(s.player.block,up and 8 or 5);eq(s.discard[#s.discard],defense)
 local entry=find(s,'x04');assert(C.play(s,entry.uid,1));local hp=s.player.hp;local used=s.xiao.relicUsed
 local exit=find(s,'x06');local block=s.player.block;energy=s.energy
 assert(C.play(s,exit.uid,1));eq(s.energy,energy);eq(s.player.hp,hp);eq(s.player.statuses.xiao_mask,nil)
 eq(s.player.block,block+(up and 6 or 4));eq(s.xiao.relicUsed,used);eq(s.exhaust[#s.exhaust],exit)
 for _,e in ipairs(Schedule.list(s.player))do assert(e.id~='xiao_mask','stale mask schedule')end
 eq(s.pendingPlay,nil);eq(s.cardInUse,nil);before=C.copy(s);eq(C.play(s,exit.uid,1),false);same(s,before)
end
print('PASS PUBLIC x02 real paid block and x04-to-x06 real exit schedule removal and exhaust')
for _,up in ipairs({false,true})do
 local s=fresh(up);local exit=find(s,'x06');local e=s.energy
 assert(C.play(s,exit.uid,1));eq(s.energy,e);eq(s.player.block,up and 6 or 4);eq(s.exhaust[#s.exhaust],exit)
 local n=fresh(up);assert(C.play(n,find(n,'x04').uid,1));exit=find(n,'x06')
 local before=C.copy(n);local hand=n.hand;local player=n.player;local original=Dispatch.dispatch;local reached=false
 Dispatch.dispatch=function(combat,state,effect,queue)
  local result=original(combat,state,effect,queue)
  if effect.kind=='maskCommit'and effect.value==0 then reached=true;error('after actual exit')end
  return result
 end
 local ok=pcall(C.play,n,exit.uid,1);Dispatch.dispatch=original
 assert(not ok and reached);same(n,before);eq(n.hand,hand);eq(n.player,player)
 assert(C.play(n,exit.uid,1));eq(n.exhaust[#n.exhaust],exit)
end
print('PASS PUBLIC empty exit still exhausts; failed real exit restores whole paid command then retries')
local CardActions=require('abyss_card_actions')
-- Both candidates use the same admission for real free automatic plays.
for _,up in ipairs({false,true})do for _,id in ipairs({'x02','x06'})do
 for _,mode in ipairs({'normal','silentFinalCard','runNativeABI','unmarked'})do
  local s=fresh(up);local c=find(s,id);local d=s.catalog.cards[c.cardId]
  if mode=='unmarked'then d.xiaoCandidate=nil elseif mode~='normal'then d[mode]=true end
  for i,v in ipairs(s.hand)do if v==c then table.remove(s.hand,i);break end end
  local energy=s.energy;C.queueCard(s,c,{targetIndex=1,exhaustCards=false});CardActions.drain(C,s)
  eq(s.energy,energy);local value=id=='x02'and(up and 8 or 5)or(up and 6 or 4)
  eq(s.player.block,mode=='normal'and value or 0)
 end
end end
-- A canonical exit cannot silently lose the exhaustion rule.
do
 local s=fresh(false);local c=find(s,'x06');s.catalog.cards[c.cardId].exhaust=false
 local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before)
end
-- Actual Scry pause before exit; failed resumed commit restores paid aliases.
do
 local Stage=require('abyss_xiao_paid_cards');local s=fresh(false);assert(C.play(s,find(s,'x04').uid,1))
 local exit=find(s,'x06');local stage=Stage.dispatch;local once=false
 -- Controlled pile arrangement supplies real entities to the Scry window.
 for i=#s.hand,1,-1 do if s.hand[i]~=exit and #s.draw<2 then s.draw[#s.draw+1]=table.remove(s.hand,i)end end
 Stage.dispatch=function(c,state,e,q)
  if not once then once=true;q.pushTop(state,{kind='effect',effect=e});q.pushTop(state,{kind='effect',effect={op='scry',value=2}});return true end
  return stage(c,state,e,q)
 end
 assert(C.play(s,exit.uid,1));Stage.dispatch=stage
 local pending=assert(s.pendingScry);local before=C.copy(s);local resource=s.xiao;local q=s.actionQueue;local paid=s.pendingPlay
 local original=Dispatch.dispatch;Dispatch.dispatch=function(...)original(...);error('resumed exit fault')end
 eq(pcall(C.chooseScry,s,{},pending.token),false);Dispatch.dispatch=original
 same(s,before);eq(s.xiao,resource);eq(s.actionQueue,q);eq(s.pendingPlay,paid)
 assert(C.chooseScry(s,{},pending.token));eq(s.player.statuses.xiao_mask,nil);eq(s.exhaust[#s.exhaust],exit)
 local done=C.copy(s);eq(C.chooseScry(s,{},pending.token),false);same(s,done)
end
print('XIAO_DEFENSE_EXIT_TRANSACTION_PASS')
