package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local B=require('abyss_xiao_play_bridge');local Paid=require('abyss_xiao_paid_cards');local A=require('abyss_actor')
local ids={'xiao_candidate_x27','xiao_candidate_x28','xiao_candidate_x37'}
local function fresh(id,up,mask)
 local d=C.copy(D);for _,v in ipairs(B.nextDefinitions())do d.cards.cards[#d.cards.cards+1]=v end
 local deck={};for i=1,20 do deck[i]=id end
 local s=C.new(d,{deck=deck,enemies={'cultist'},seed=42,candidateLifecycle={kind='xiao',relicEnabled=true}})
 s.enemies[1].hp=500;s.enemies[1].maxHp=500
 if mask>0 then A.applyPower(s,s.player,'xiao_mask',mask,s.player);require('abyss_power_schedule').recordApplied(s,s.player,'xiao_mask',nil)end
 local c=s.hand[1];c.upgraded=up;return s,c
end
local n=0
for _,id in ipairs(ids)do for _,up in ipairs({false,true})do for mask=0,3 do for _,block in ipairs({0,5,50})do
 local s,c=fresh(id,up,mask);s.player.block=block;s.player.statuses.strength=2;s.player.statuses.weak=1;s.player.statuses.dexterity=2;s.player.statuses.frail=1;s.enemies[1].statuses.vulnerable=1
 local raw=id=='xiao_candidate_x28'and((up and 14 or 10)+(mask==1 and(up and 12 or 10)or 0))or math.min(block,up and 20 or 14)
 local hit=C.attackAmount(s,s.player,s.enemies[1],raw+(mask>0 and 4 or 0));local gain=C.blockAmount(s,s.player,up and 10 or 7)
 assert(C.play(s,c.uid,1));eq(s.energy,id=='xiao_candidate_x28'and 1 or 2);eq(s.xiao.relicUsed,false)
 if id=='xiao_candidate_x27'then eq(s.player.statuses.xiao_mask or 0,math.max(0,mask-1));eq(s.player.block,block+gain);eq(s.enemies[1].hp,500)
 else eq(s.player.statuses.xiao_mask or 0,mask);eq(s.player.block,block);eq(s.enemies[1].hp,500-hit)end
 eq(s.discard[#s.discard],c);n=n+1
end end end end
-- Execution-time mask / block values, not preflight snapshots.
for _,id in ipairs({'xiao_candidate_x28','xiao_candidate_x37'})do
 local s,c=fresh(id,false,0);local old=Paid.dispatch;local hit=false
 Paid.dispatch=function(core,state,e,q)if state==s then hit=true;s.player.statuses.xiao_mask=1;s.player.block=11 end;return old(core,state,e,q)end
 assert(C.play(s,c.uid,1));Paid.dispatch=old;assert(hit);eq(s.enemies[1].hp,id=='xiao_candidate_x28'and 476 or 485);eq(s.player.block,11)
end
for _,field in ipairs({'exitGuard','exitDraw'})do
 local s,c=fresh(ids[1],false,1);s.xiao[field]=1;local snap=C.copy(s);eq(C.play(s,c.uid),false);same(s,snap)
 s,c=fresh(ids[1],false,1);snap=C.copy(s);local old=Paid.dispatch
 Paid.dispatch=function(core,state,e,q)if state==s then s.xiao[field]=1 end;return old(core,state,e,q)end
 eq(pcall(C.play,s,c.uid),false);Paid.dispatch=old;same(s,snap)
end
for _,id in ipairs(ids)do for _,field in ipairs({'cost','extra','face','effects','marker','retain','type','target','text'})do
 local s,c=fresh(id,false,0);local d=s.catalog.cards[id]
 if field=='cost'then d.cost=99 elseif field=='extra'then d.extra=true elseif field=='face'then c.upgraded='false'elseif field=='effects'then d.effects[1].value=99 elseif field=='marker'then d.xiaoCandidate=nil elseif field=='retain'then d.selfRetain=true elseif field=='type'then d.type='power'elseif field=='text'then d.text='drift'else d.target='SELF'end
 local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before)
end end
for _,id in ipairs(ids)do for _,field in ipairs({'uid','turn','playId','step','replay','payloadValue','payloadKind'})do
 local s,c=fresh(id,false,1);local before=C.copy(s);local original=Paid.dispatch;local hit=false
 Paid.dispatch=function(core,state,e,q)
  if state~=s then return original(core,state,e,q)end;hit=true;local bad=C.copy(e)
  if field=='replay'then original(core,state,e,q);return original(core,state,e,q)
  elseif field=='payloadValue'then bad.payload.value=999 elseif field=='payloadKind'then bad.payload.kind='damageAll'
  elseif field=='uid'then bad.uid='bad'else bad[field]=99 end;return original(core,state,bad,q)
 end
 eq(pcall(C.play,s,c.uid,1),false);Paid.dispatch=original;assert(hit);same(s,before);assert(C.play(s,c.uid,1))
end end
-- Native terminal and corruption handling, no custom discard/exhaust cleanup.
for _,id in ipairs({ids[2],ids[3]})do
 local s,c=fresh(id,false,1);s.player.block=25;s.enemies[1].hp=1;assert(C.play(s,c.uid,1));eq(s.enemies[1].hp,0)
 s,c=fresh(id,false,1);s.player.hp=1;s.enemies[1].statuses.thorns=99;assert(C.play(s,c.uid,1));eq(s.player.hp,0)
end
do local s,c=fresh(ids[1],false,1);assert(require('abyss_corruption').prepare(s));assert(require('abyss_corruption').apply(s,1));A.applyPower(s,s.player,'feel_no_pain',3,s.player);require('abyss_exhaust').rememberPower(s,'feel_no_pain');assert(C.play(s,c.uid));eq(s.energy,3);eq(s.exhaust[#s.exhaust],c);eq(s.player.block,10)end
print('XIAO_NEXT_PAID_PASS '..n..' faces/mask/block modifier combinations; live resource; exit passive fail closed; 27 drift; 21 staged rollback; terminal/corruption')
