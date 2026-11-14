package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local B=require('abyss_xiao_play_bridge');local Paid=require('abyss_xiao_paid_cards')
local function fresh(id,up,mask,count)
 local d=C.copy(D);for _,v in ipairs(B.mixedDefinitions())do d.cards.cards[#d.cards.cards+1]=v end
 local deck={};for i=1,20 do deck[i]=id end;local enemies={};for i=1,count do enemies[i]='cultist'end
 local s=C.new(d,{deck=deck,enemies=enemies,seed=42,candidateLifecycle={kind='xiao',relicEnabled=true}})
 for _,e in ipairs(s.enemies)do e.hp=500;e.maxHp=500 end
 if mask>0 then s.player.statuses.xiao_mask=mask end
 local c=s.hand[1];c.upgraded=up;return s,c
end
local n=0
for _,id in ipairs({'xiao_candidate_x30','xiao_candidate_x35','xiao_candidate_x40'})do for _,up in ipairs({false,true})do for mask=0,3 do for enemies=1,4 do
 local s,c=fresh(id,up,mask,enemies);s.player.statuses.strength=2;s.player.statuses.weak=1;s.player.statuses.dexterity=2;s.player.statuses.frail=1;s.enemies[1].statuses.vulnerable=1
 local amount=id=='xiao_candidate_x30'and(up and 8 or 5)or(up and 6 or 4);local hand=#s.hand
 local hit=C.attackAmount(s,s.player,s.enemies[1],amount+(mask>0 and 4 or 0));local block=C.blockAmount(s,s.player,math.min(enemies,3)*amount)
 assert(C.play(s,c.uid,1));eq(s.energy,2);eq(s.player.statuses.xiao_mask or 0,mask);eq(s.xiao.relicUsed,false)
 if id=='xiao_candidate_x40'then eq(s.player.block,block);eq(s.enemies[1].hp,500)
 else eq(s.enemies[1].hp,500-hit*(id=='xiao_candidate_x35'and 2 or 1));eq(s.player.block,0)end
 eq(#s.hand,hand-1+(id=='xiao_candidate_x30'and mask==0 and 1 or 0));eq(s.discard[#s.discard],c);n=n+1
end end end end
-- Live mask state between damage stages and between damage and the draw gate.
for _,id in ipairs({'xiao_candidate_x30','xiao_candidate_x35'})do for _,mask in ipairs({0,1})do
 local s,c=fresh(id,false,mask,1);local hand=#s.hand;local old=Paid.dispatch;local touched=false
 Paid.dispatch=function(core,state,e,q)if state==s and e.step==2 then touched=true;s.player.statuses.xiao_mask=mask==0 and 1 or nil end;return old(core,state,e,q)end
 assert(C.play(s,c.uid,1));Paid.dispatch=old;assert(touched)
 if id=='xiao_candidate_x30'then eq(#s.hand,hand-1+(mask==1 and 1 or 0));eq(s.enemies[1].hp,500-5-(mask>0 and 4 or 0))else eq(s.enemies[1].hp,488)end
end end
for _,flag in ipairs({'escaped','halfDead','isDying'})do local s,c=fresh('xiao_candidate_x40',false,0,3);s.enemies[2][flag]=true;assert(C.play(s,c.uid));eq(s.player.block,8)end
-- Do not retarget a second hit, or revive tail draw after combat/death terminal queues.
do local s,c=fresh('xiao_candidate_x35',false,0,2);s.enemies[1].hp=1;assert(C.play(s,c.uid,1));eq(s.enemies[1].hp,0);eq(s.enemies[2].hp,500)end
for _,id in ipairs({'xiao_candidate_x30','xiao_candidate_x35'})do
 local s,c=fresh(id,false,0,1);local hand=#s.hand;s.enemies[1].hp=1;assert(C.play(s,c.uid,1));eq(#s.hand,hand-1)
 s,c=fresh(id,false,0,1);hand=#s.hand;s.player.hp=1;s.enemies[1].statuses.thorns=5;assert(C.play(s,c.uid,1));eq(s.player.hp,0);eq(#s.hand,hand-1)
end
for _,id in ipairs({'xiao_candidate_x30','xiao_candidate_x35','xiao_candidate_x40'})do for _,field in ipairs({'cost','extra','face','effects','marker','retain','type','target'})do
 local s,c=fresh(id,false,0,1);local d=s.catalog.cards[id]
 if field=='cost'then d.cost=99 elseif field=='extra'then d.extra=true elseif field=='face'then c.upgraded='false'elseif field=='effects'then d.effects[1].value=99 elseif field=='marker'then d.xiaoCandidate=nil elseif field=='retain'then d.selfRetain=true elseif field=='type'then d.type='power'else d.target='SELF'end
 local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before)
 for i,x in ipairs(s.hand)do if x==c then table.remove(s.hand,i);break end end
 local hand=#s.hand;C.queueCard(s,c,{targetIndex=1});require('abyss_card_actions').drain(C,s);eq(s.enemies[1].hp,500);eq(s.player.block,0);eq(#s.hand,hand);eq(s.energy,3)
end end
-- Stage identity replay must fail atomically after the first valid dispatch.
for _,field in ipairs({'uid','turn','playId','step','replay','payloadValue','payloadKind'})do
 local s,c=fresh('xiao_candidate_x35',false,0,1);local before=C.copy(s);local original=Paid.dispatch;local hit=false
 Paid.dispatch=function(core,state,e,q)if state==s then local bad=C.copy(e);if field=='replay'then original(core,state,e,q)elseif field=='payloadValue'then bad.payload.value=999 elseif field=='payloadKind'then bad.payload.kind='damageAll'else bad[field]=field=='uid'and 'wrong' or e[field]+1 end;hit=true;return original(core,state,bad,q)end;return original(core,state,e,q)end
 eq(pcall(C.play,s,c.uid,1),false);Paid.dispatch=original;assert(hit);same(s,before);assert(C.play(s,c.uid,1))
end
for _,up in ipairs({false,true})do
 local s,c=fresh('xiao_candidate_x30',up,0,1);s.player.noDraw=true;local hand=#s.hand;assert(C.play(s,c.uid,1));eq(#s.hand,hand-1)
 s,c=fresh('xiao_candidate_x40',up,0,2);assert(require('abyss_corruption').prepare(s));assert(require('abyss_corruption').apply(s,1));s.player.statuses.feel_no_pain=3;require('abyss_exhaust').rememberPower(s,'feel_no_pain');s.energy=0;assert(C.play(s,c.uid));eq(s.energy,0);eq(s.player.block,2*(up and 6 or 4)+3);eq(s.exhaust[#s.exhaust],c)
end
print('XIAO_MIXED_PAID_PASS '..n..' masks/faces/enemies/modifiers /live gates/presence/terminal /24 malformed paid+auto /7 stage binding/payload/replay rollback')
