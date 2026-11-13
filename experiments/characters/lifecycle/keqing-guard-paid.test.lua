package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local M=require('abyss_keqing_guard_cards');local Paid=require('abyss_keqing_paid_cards')
local function fresh(id,up,inf,wedge,count)
 local d=C.copy(D);for _,c in ipairs(M.definitions().cards)do d.cards.cards[#d.cards.cards+1]=c end
 local enemies={};for i=1,count do enemies[i]='cultist'end
 local s=C.new(d,{deck={id,'defend','defend','defend','defend','defend'},enemies=enemies,seed=42,candidateLifecycle={kind='keqing',relicEnabled=true}})
 local c;for _,pile in ipairs({s.hand,s.draw})do for i=#pile,1,-1 do if pile[i].cardId==id then c=table.remove(pile,i)end end end;assert(c);c.upgraded=up;s.hand[#s.hand+1]=c
 s.keqingResource.infusion=inf;s.keqingResource.wedgeUntil=wedge and s.turn+1 or nil;return s,c
end
local count=0
for _,id in ipairs({'KQ035','KQ036','KQ067'})do for _,up in ipairs({false,true})do for inf=0,2 do for _,wedge in ipairs({false,true})do for enemies=1,4 do
 local s,c=fresh(id,up,inf,wedge,enemies);s.player.statuses.dexterity=2;s.player.statuses.frail=1
 local base=id=='KQ036'and(up and 8 or 5)or(up and 7 or 4)
 local extra=id=='KQ035'and math.min(enemies,3)or id=='KQ036'and(inf==0 and not wedge and 3 or 0)or id=='KQ067'and(enemies==1 and 3 or 0)or 0
 local expected=C.blockAmount(s,s.player,base)+(extra>0 and C.blockAmount(s,s.player,extra)or 0);local resource=C.copy(s.keqingResource)
 assert(C.play(s,c.uid));eq(s.energy,2);eq(s.player.block,expected);same(s.keqingResource,resource);eq(s.discard[#s.discard],c)
 local snap=C.copy(s);eq(C.play(s,c.uid),false);same(s,snap);count=count+1
end end end end end
-- The second stage observes state AFTER the base Block, not a precomputed condition.
for _,id in ipairs({'KQ035','KQ036','KQ067'})do for _,entry in ipairs({false,true})do
 local s,c=fresh(id,false,entry and 1 or 0,false,entry and 2 or 1);local original=Paid.dispatch;local changed=false
 Paid.dispatch=function(core,state,e,q)
  if state==s and e.action.step==2 then
   eq(s.player.block,id=='KQ036'and 5 or 4);changed=true
   if id=='KQ036'then s.keqingResource.infusion=entry and 0 or 1
   elseif entry then s.enemies[2].escaped=true else local extra=C.copy(s.enemies[1]);extra.id='extra-live';s.enemies[#s.enemies+1]=extra end
  end
  return original(core,state,e,q)
 end
 assert(C.play(s,c.uid));Paid.dispatch=original;assert(changed)
 local extra=id=='KQ035'and(entry and 1 or 2)or(entry and 3 or 0);eq(s.player.block,(id=='KQ036'and 5 or 4)+extra)
end end
for _,flag in ipairs({'escaped','halfDead','isDying'})do
 local s,c=fresh('KQ035',false,0,false,2);s.enemies[2][flag]=true;assert(C.play(s,c.uid));eq(s.player.block,5)
end
for _,id in ipairs({'KQ035','KQ036','KQ067'})do for _,field in ipairs({'value','extra','exhaust','type','target','marker','face','stage'})do
 local s,c=fresh(id,false,0,false,1);local d=s.catalog.cards[id]
 if field=='value'then d.effects[1].value=99 elseif field=='extra'then d.effects[1].fixed=true elseif field=='exhaust'then d.exhaust=true elseif field=='type'then d.type='attack'elseif field=='target'then d.target='ENEMY'elseif field=='marker'then d.keqingCandidate=nil elseif field=='face'then c.upgraded='false'else d.keqingStage='003'end
 local snap=C.copy(s);eq(C.play(s,c.uid),false);same(s,snap)
 for i,v in ipairs(s.hand)do if v==c then table.remove(s.hand,i);break end end
 local resource=C.copy(s.keqingResource);C.queueCard(s,c,{});require('abyss_card_actions').drain(C,s);same(s.keqingResource,resource);eq(s.player.block,0);eq(s.energy,3)
end end
for _,id in ipairs({'KQ035','KQ036','KQ067'})do
 local s,c=fresh(id,false,0,false,1);assert(require('abyss_corruption').prepare(s));assert(require('abyss_corruption').apply(s,1));s.player.statuses.feel_no_pain=3;require('abyss_exhaust').rememberPower(s,'feel_no_pain');s.energy=0
 assert(C.play(s,c.uid));eq(s.energy,0);eq(s.player.block,id=='KQ035'and 8 or id=='KQ036'and 11 or 10);eq(s.exhaust[#s.exhaust],c)
end
print('KEQING_GUARD_PAID_PASS '..count..' split-block matrix /6 live gates /3 presence /24 malformed paid+auto /Corruption')
