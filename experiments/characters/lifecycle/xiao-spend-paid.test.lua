package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local B=require('abyss_xiao_play_bridge');local Paid=require('abyss_xiao_paid_cards')
local function fresh(def,up)
 local d=C.copy(D);for _,v in ipairs(B.spendDefinitions())do d.cards.cards[#d.cards.cards+1]=v end
 local deck={};for i=1,20 do deck[i]=def.id end
 local s=C.new(d,{deck=deck,enemies={'jaw_worm'},seed=42,candidateLifecycle={kind='xiao',relicEnabled=false}})
 local c=s.hand[1];c.upgraded=up;return s,c
end
local n=0
for _,def in ipairs(B.spendDefinitions())do for _,up in ipairs({false,true})do
 eq(def.cost,0);eq(def.exhaust,def.id=='xiao_candidate_x38')
 for _,v in ipairs({0,1,4,5,9,10,16,30})do for _,mode in ipairs({'normal','noDraw','full','dexFrail'})do
  local s,c=fresh(def,up);s.energy=v;s.player.block=v
  if mode=='noDraw'then s.player.noDraw=true elseif mode=='full'then C.draw(s,5)elseif mode=='dexFrail'then s.player.statuses.dexterity=2;s.player.statuses.frail=1 end
  local hand=#s.hand
  assert(C.play(s,c.uid));eq(s.pendingPlay,nil);eq(s.cardInUse,nil)
  if def.id=='xiao_candidate_x23'then
   eq(s.energy,0);local amount=v*(up and 7 or 5);if mode=='dexFrail'then amount=math.floor((amount+2)*.75)end;eq(s.player.block,v+amount);eq(#s.hand,hand-1)
  else
   eq(s.player.block,0);eq(s.energy,v)
   local draw=math.min(math.floor(v/5),up and 3 or 2);if mode=='noDraw'then draw=0 end;draw=math.min(draw,11-hand);eq(#s.hand,hand-1+draw)
  end
  local found=false;for _,x in ipairs(def.exhaust and s.exhaust or s.discard)do if x==c then found=true end end;assert(found);n=n+1
 end end
 for _,mutate in ipairs({function(d)d.cost=99 end,function(d)d.extra=true end,function(d)d.upgrade.effects[1].value=99 end})do
  local s,c=fresh(def,up);mutate(s.catalog.cards[def.id]);local before=C.copy(s);assert(not C.play(s,c.uid));same(s,before)
 end
 local s,c=fresh(def,up);local before=C.copy(s);local hand,player=s.hand,s.player;local dispatch=Paid.dispatch;local hit=false
 Paid.dispatch=function(...)dispatch(...);hit=true;error('spend fault')end
 assert(not pcall(C.play,s,c.uid));Paid.dispatch=dispatch;assert(hit);same(s,before);eq(s.hand,hand);eq(s.player,player);eq(s.hand[1],c);assert(C.play(s,c.uid))
end end
print('XIAO_SPEND_PAID_PASS '..n..' real paid resource conversions, source rejection and rollback')
