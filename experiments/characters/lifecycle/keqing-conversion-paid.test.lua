package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,R,eq,same=H.C,H.Data,H.Run,H.eq,H.same
local M=require('abyss_keqing_conversion_cards');local Paid=require('abyss_keqing_paid_cards')
local function fresh(id,up,inf,wedge)
 local d=C.copy(D);for _,c in ipairs(M.definitions().cards)do d.cards.cards[#d.cards.cards+1]=c end
 local s=C.new(d,{deck={id,'defend','defend','defend','defend','defend'},enemies={'cultist'},seed=42,candidateLifecycle={kind='keqing',relicEnabled=true}})
 local c;for _,pile in ipairs({s.hand,s.draw})do for i=#pile,1,-1 do if pile[i].cardId==id then c=table.remove(pile,i)end end end;assert(c);c.upgraded=up;s.hand[#s.hand+1]=c
 s.keqingResource.infusion=inf;s.keqingResource.wedgeUntil=wedge>0 and s.turn+wedge-1 or nil;return s,c
end
local count=0
for _,id in ipairs({'KQ021','KQ022'})do for _,up in ipairs({false,true})do for inf=0,2 do for wedge=0,2 do for _,frail in ipairs({0,1})do
 local s,c=fresh(id,up,inf,wedge);s.player.statuses.dexterity=2;s.player.statuses.frail=frail
 local beforeWedge=s.keqingResource.wedgeUntil;local amount=id=='KQ021'and inf*(up and 4 or 3)or(up and 9 or 6)
 local expected=amount>0 and C.blockAmount(s,s.player,amount)or 0
 assert(C.play(s,c.uid));eq(s.energy,id=='KQ021'and 3 or 1);eq(s.player.block,expected);eq(s.keqingResource.infusion,id=='KQ021'and 0 or 1);eq(s.keqingResource.wedgeUntil,beforeWedge);eq(s.keqingResource.relicUsed,false);eq(s.exhaust[#s.exhaust],c)
 local snap=C.copy(s);eq(C.play(s,c.uid),false);same(s,snap);count=count+1
end end end end end
for _,id in ipairs({'KQ021','KQ022'})do for _,field in ipairs({'value','extra','exhaust','type','target','marker','face','stage'})do
 local s,c=fresh(id,false,2,2);local d=s.catalog.cards[id]
 if field=='value'then d.effects[1].value=99 elseif field=='extra'then d.effects[1].fixed=true elseif field=='exhaust'then d.exhaust=false elseif field=='type'then d.type='attack'elseif field=='target'then d.target='ENEMY'elseif field=='marker'then d.keqingCandidate=nil elseif field=='face'then c.upgraded='false'else d.keqingStage='003'end
 local snap=C.copy(s);eq(C.play(s,c.uid),false);same(s,snap)
 for i,v in ipairs(s.hand)do if v==c then table.remove(s.hand,i);break end end
 local r=C.copy(s.keqingResource);C.queueCard(s,c,{});require('abyss_card_actions').drain(C,s);same(s.keqingResource,r);eq(s.player.block,0);eq(s.energy,3)
end end
for _,id in ipairs({'KQ021','KQ022'})do
 local s,c=fresh(id,false,2,2);assert(require('abyss_corruption').prepare(s));assert(require('abyss_corruption').apply(s,1));s.player.statuses.feel_no_pain=3;require('abyss_exhaust').rememberPower(s,'feel_no_pain');s.energy=0
 assert(C.play(s,c.uid));eq(s.energy,0);eq(s.player.block,9);eq(s.exhaust[#s.exhaust],c)
end
-- Mid-stage failure restores resource identity, payment, limbo and all zones.
for _,id in ipairs({'KQ021','KQ022'})do for _,up in ipairs({false,true})do
 local s,c=fresh(id,up,2,2);local snap=C.copy(s);local resource,hand=s.keqingResource,s.hand;local original=Paid.dispatch;local hit=false
 Paid.dispatch=function(combat,state,e,q)local out=original(combat,state,e,q);hit=true;error('conversion after mutation')end
 eq(pcall(C.play,s,c.uid),false);Paid.dispatch=original;assert(hit);same(s,snap);eq(s.keqingResource,resource);eq(s.hand,hand);assert(C.play(s,c.uid))
end end
print('KEQING_CONVERSION_PAID_PASS '..count..' matrix /16 invalid paid+auto /Corruption /4 transactional retries')
