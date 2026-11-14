package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local M=require('abyss_keqing_utility_cards');local Paid=require('abyss_keqing_paid_cards')
local function fresh(id,up,inf,wedge)
 local d=C.copy(D);for _,c in ipairs(M.definitions().cards)do d.cards.cards[#d.cards.cards+1]=c end
 local deck={id};for i=1,15 do deck[#deck+1]='defend'end
 local s=C.new(d,{deck=deck,enemies={'cultist'},seed=42,candidateLifecycle={kind='keqing',relicEnabled=true}})
 local c;for _,pile in ipairs({s.hand,s.draw})do for i=#pile,1,-1 do if pile[i].cardId==id then c=table.remove(pile,i)end end end;assert(c);c.upgraded=up;s.hand[#s.hand+1]=c
 s.keqingResource.infusion=inf;s.keqingResource.wedgeUntil=wedge>0 and s.turn+wedge-1 or nil;return s,c
end
local count=0
for _,id in ipairs({'KQ046','KQ051','KQ066'})do for _,up in ipairs({false,true})do for inf=0,2 do for wedge=0,2 do
 local s,c=fresh(id,up,inf,wedge);local n=#s.hand;local r=C.copy(s.keqingResource);s.player.statuses.weak=2;s.player.statuses.vulnerable=3
 local bottom=table.remove(s.draw);s.discard[#s.discard+1]=bottom;local top=s.draw[#s.draw]
 assert(C.play(s,c.uid));same(s.keqingResource,r);eq(s.energy,id=='KQ051'and 2 or 1)
 if id=='KQ046'then eq(#s.hand,n-1+(up and 4 or 3));eq(s.player.noDraw,true)
 elseif id=='KQ051'then eq(#s.hand,n);eq(s.draw[1],bottom);eq(s.hand[#s.hand],top);eq(s.player.block,up and 5 or 2)
 else eq(#s.hand,n-1);eq(s.player.block,up and 13 or 10);eq(s.player.statuses.weak,1);eq(s.player.statuses.vulnerable,3)end
 eq((id=='KQ051'and s.discard or s.exhaust)[#(id=='KQ051'and s.discard or s.exhaust)],c);count=count+1
end end
 for _,mode in ipairs({'normal','full','empty','locked','shuffle'})do
  local s,c=fresh(id,up,0,0);local amount=id=='KQ046'and(up and 4 or 3)or id=='KQ051'and 1 or 0
  if mode=='full'then while #s.hand<10 do s.hand[#s.hand+1]=table.remove(s.draw)end elseif mode=='empty'then s.draw={} elseif mode=='locked'then require('abyss_actor').applyNoDraw(s,s.player) elseif mode=='shuffle'then s.discard=s.draw;s.draw={}end
  local n=#s.hand;assert(C.play(s,c.uid));eq(#s.hand,n-1+((mode=='empty'or mode=='locked')and 0 or math.min(amount,11-n)))
  if id=='KQ046'then eq(s.player.noDraw,true);assert(C.endTurn(s));eq(s.player.noDraw,false)end
 end
 for _,mode in ipairs({'cost','up','extra','flag','face','exhaust'})do
  local s,c=fresh(id,up,0,0);local d=s.catalog.cards[id]
  if mode=='cost'then d.cost=0 elseif mode=='up'then d.upgrade.cost=0 elseif mode=='extra'then d.effects[1].extra=true elseif mode=='flag'then d.productionEnabled=true elseif mode=='face'then c.upgraded='false'else d.exhaust=not d.exhaust end
  local b=C.copy(s);eq(C.play(s,c.uid),false);same(s,b)
 end
 for _,mode in ipairs({'step','op','repeat','after'})do
  local s,c=fresh(id,up,0,0);local b=C.copy(s);local dispatch=Paid.dispatch;local hit=false
  Paid.dispatch=function(core,state,e,q)hit=true;if mode=='step'then e.action.step=99 elseif mode=='op'then e.action.op='invalid'end;local out=dispatch(core,state,e,q);if mode=='repeat'then dispatch(core,state,e,q)elseif mode=='after'then error('post utility stage')end;return out end
  eq(pcall(C.play,s,c.uid),false);Paid.dispatch=dispatch;assert(hit);same(s,b);assert(C.play(s,c.uid))
 end
 local s,c=fresh(id,up,0,0);assert(require('abyss_corruption').prepare(s));assert(require('abyss_corruption').apply(s,1));s.player.statuses.feel_no_pain=3;require('abyss_exhaust').rememberPower(s,'feel_no_pain');s.energy=0;assert(C.play(s,c.uid));eq(s.exhaust[#s.exhaust],c);assert(s.player.block>=3)
end end
-- 066 reduces one Weak only, and clears last-layer schedule without spending Artifact.
for _,weak in ipairs({0,1,3})do
 local s,c=fresh('KQ066',false,0,0);if weak>0 then require('abyss_actor').applyPower(s,s.player,'weak',weak,s.enemies[1],true)end
 s.player.statuses.artifact=2;assert(C.play(s,c.uid));eq(s.player.statuses.weak or 0,math.max(0,weak-1));eq(s.player.statuses.artifact,2)
end
-- Native NoDraw inherits Artifact semantics rather than bypassing the engine.
do local s,c=fresh('KQ046',false,0,0);s.player.statuses.artifact=1;assert(C.play(s,c.uid));eq(s.player.statuses.artifact,0);assert(not s.player.noDraw)end
print('KEQING_UTILITY_PAID_PASS '..count..' faces/resources; capacity/locks/shuffle; 36 drift; 24 staged rollback; weak/artifact/corruption')
