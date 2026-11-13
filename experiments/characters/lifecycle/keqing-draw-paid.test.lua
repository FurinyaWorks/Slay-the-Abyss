package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local M=require('abyss_keqing_draw_cards');local Paid=require('abyss_keqing_paid_cards')
local function fresh(id,up,inf,wedge)
 local d=C.copy(D);for _,c in ipairs(M.definitions().cards)do d.cards.cards[#d.cards.cards+1]=c end
 local deck={id};for i=1,15 do deck[#deck+1]='defend'end
 local s=C.new(d,{deck=deck,enemies={'cultist'},seed=42,candidateLifecycle={kind='keqing',relicEnabled=true}})
 local c;for _,pile in ipairs({s.hand,s.draw})do for i=#pile,1,-1 do if pile[i].cardId==id then c=table.remove(pile,i)end end end;assert(c);c.upgraded=up;s.hand[#s.hand+1]=c
 s.keqingResource.infusion=inf;s.keqingResource.wedgeUntil=wedge>0 and s.turn+wedge-1 or nil;return s,c
end
local count=0
for _,id in ipairs({'KQ031','KQ042'})do for _,up in ipairs({false,true})do for inf=0,2 do for wedge=0,2 do for _,locked in ipairs({false,true})do
 local s,c=fresh(id,up,inf,wedge);s.player.noDraw=locked;local n=#s.hand;local draw=#s.draw;local old=s.keqingResource.wedgeUntil
 local amount=id=='KQ031'and wedge==0 and 1 or(up and 3 or 2);if locked then amount=0 end
 assert(C.play(s,c.uid));eq(#s.hand,n-1+amount);eq(#s.draw,draw-amount);eq(s.energy,2);eq(s.keqingResource.infusion,inf);eq(s.keqingResource.wedgeUntil,id~='KQ031'and old or nil);eq(s.keqingResource.relicUsed,false);eq(s.exhaust[#s.exhaust],c)
 local snap=C.copy(s);eq(C.play(s,c.uid),false);same(s,snap);count=count+1
end end end end end
-- Native capacity is evaluated after the played card entered limbo.
for _,id in ipairs({'KQ031','KQ042'})do for _,up in ipairs({false,true})do
 local s,c=fresh(id,up,0,2);while #s.hand<10 do s.hand[#s.hand+1]=table.remove(s.draw)end
 local n=#s.draw;assert(C.play(s,c.uid));eq(#s.hand,10);eq(#s.draw,n-1)
 s,c=fresh(id,up,0,2);local original=Paid.dispatch;local top
 Paid.dispatch=function(core,state,e,q)
  if state==s then while #s.hand<10 do s.hand[#s.hand+1]=table.remove(s.draw)end;top=s.draw[#s.draw]end
  return original(core,state,e,q)
 end
 assert(C.play(s,c.uid));Paid.dispatch=original;eq(#s.hand,10);eq(s.draw[#s.draw],top);eq(s.keqingResource.wedgeUntil,id~='KQ031'and 2 or nil)
end end
-- Empty piles and discard-only shuffling use the native Draw action, never the limbo card.
for _,id in ipairs({'KQ031','KQ042'})do for _,up in ipairs({false,true})do for _,shuffle in ipairs({false,true})do
 local s,c=fresh(id,up,0,2);local n=#s.hand;if shuffle then s.discard=s.draw end;s.draw={}
 assert(C.play(s,c.uid));eq(#s.hand,n-1+(shuffle and(up and 3 or 2)or 0));eq(s.keqingResource.wedgeUntil,id~='KQ031'and 2 or nil)
 local seen=0;for _,pile in ipairs({s.hand,s.draw,s.discard,s.exhaust})do for _,x in ipairs(pile)do if x==c then seen=seen+1;eq(pile,s.exhaust)end end end;eq(seen,1)
end end end
for _,id in ipairs({'KQ031','KQ042'})do for _,field in ipairs({'value','extra','exhaust','type','target','marker','face','stage'})do
 local s,c=fresh(id,false,2,2);local d=s.catalog.cards[id]
 if field=='value'then d.effects[1].value=99 elseif field=='extra'then d.effects[1].fixed=true elseif field=='exhaust'then d.exhaust=false elseif field=='type'then d.type='attack'elseif field=='target'then d.target='ENEMY'elseif field=='marker'then d.keqingCandidate=nil elseif field=='face'then c.upgraded='false'else d.keqingStage='003'end
 local snap=C.copy(s);eq(C.play(s,c.uid),false);same(s,snap)
 for i,v in ipairs(s.hand)do if v==c then table.remove(s.hand,i);break end end
 local resource=C.copy(s.keqingResource);local n=#s.hand;C.queueCard(s,c,{});require('abyss_card_actions').drain(C,s);same(s.keqingResource,resource);eq(#s.hand,n);eq(s.energy,3)
end end
for _,id in ipairs({'KQ031','KQ042'})do
 local s,c=fresh(id,false,0,2);assert(require('abyss_corruption').prepare(s));assert(require('abyss_corruption').apply(s,1));s.player.statuses.feel_no_pain=3;require('abyss_exhaust').rememberPower(s,'feel_no_pain');s.energy=0;s.player.noDraw=true
 assert(C.play(s,c.uid));eq(s.energy,0);eq(s.player.block,3);eq(s.exhaust[#s.exhaust],c)
end
-- A genuine drawn status triggers Fire Breathing and can end combat.
for _,id in ipairs({'KQ031','KQ042'})do
 local s,c=fresh(id,false,0,2);local wound=s.draw[1];wound.cardId='wound';s.draw={wound};s.enemies[1].hp=1
 assert(require('abyss_warrior_status_cards').applyPower(s,'fire_breathing',6))
 assert(C.play(s,c.uid));eq(s.enemies[1].hp,0);eq(s.keqingResource.wedgeUntil,id~='KQ031'and 2 or nil)
end
for _,expiry in ipairs({1,5})do
 local s,c=fresh('KQ031',false,0,0);s.turn=3;s.keqingResource.wedgeUntil=expiry;local snap=C.copy(s);eq(pcall(C.play,s,c.uid),false);same(s,snap)
end
print('KEQING_DRAW_PAID_PASS '..count..' matrix /8 capacity /8 empty-shuffle /16 invalid paid+auto /Corruption-FNP /2 drawn-status terminal')
