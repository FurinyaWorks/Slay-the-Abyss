package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local B=require('abyss_xiao_play_bridge');local Actions=require('abyss_card_actions')
local function fresh(id,up)
 local data=C.copy(D);for _,d in ipairs(B.definitions())do data.cards.cards[#data.cards.cards+1]=d end
 local deck={{cardId='xiao_candidate_'..id,upgraded=up}};for i=1,10 do deck[#deck+1]='strike'end
 local s=C.new(data,{deck=deck,enemies={'cultist'},seed=42,candidateLifecycle={kind='xiao',relicEnabled=false}})
 local card
 for _,pile in ipairs({s.hand,s.draw})do for i,c in ipairs(pile)do if c.cardId=='xiao_candidate_'..id then card=table.remove(pile,i);break end end end
 assert(card);s.enemies[1].hp=100;s.enemies[1].block=0;return s,card
end
for _,id in ipairs({'x03','x07','x08'})do for _,up in ipairs({false,true})do
 for _,mode in ipairs({'normal','unmarked','runNativeABI','effects'})do
  local s,c=fresh(id,up);local d=s.catalog.cards[c.cardId]
  if mode=='unmarked'then d.xiaoCandidate=nil elseif mode=='runNativeABI'then d.runNativeABI=true elseif mode=='effects'then d.effects[1].value=99;if d.upgrade then d.upgrade.effects[1].value=99 end end
  local energy,hand=s.energy,#s.hand
  C.queueCard(s,c,{targetIndex=1,exhaustCards=false});Actions.drain(C,s);eq(s.energy,energy)
  if mode=='normal'then
   if id=='x03'then eq(s.enemies[1].hp,up and 88 or 91)
   elseif id=='x07'then eq(s.enemies[1].hp,up and 93 or 95);eq(s.player.block,up and 7 or 5)
   else eq(#s.hand,hand+(up and 3 or 2))end
  else eq(s.enemies[1].hp,100);eq(s.player.block,0);eq(#s.hand,hand)end
 end
end end
print('XIAO_CORE_AUTO_PASS 24 base upgrade free automatic and corrupt definition cases')
for _,up in ipairs({false,true})do
 local s,c=fresh('x08',up);s.hand[#s.hand+1]=c
 while #s.hand<10 and #s.draw>0 do s.hand[#s.hand+1]=table.remove(s.draw)end
 eq(#s.hand,10);eq(#s.draw,1);local old=s.energy;assert(C.play(s,c.uid,1));eq(s.energy,old-1);eq(#s.hand,10);eq(#s.draw,0) -- one freed slot filled; resolving card remains outside draw
 local s2,c2=fresh('x07',up);s2.hand[#s2.hand+1]=c2;s2.catalog.cards[c2.cardId].exhaust=true;local before=C.copy(s2);assert(not C.play(s2,c2.uid,1));same(s2,before)
end
print('XIAO_CORE_HAND_PASS real eleventh instance fills only freed hand slot; no resolving-card redraw; altered exhaustion rejects')
