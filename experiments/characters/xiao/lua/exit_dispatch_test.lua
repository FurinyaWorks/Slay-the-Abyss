package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C,Q,D,A,S=require('abyss_combat'),require('abyss_action_queue'),require('abyss_data'),require('abyss_actor'),require('abyss_power_schedule')
local X,O=require('abyss_xiao_dispatch'),require('abyss_xiao_owner_end');local H=dofile('tests/helpers/act2_event_relics.lua');local eq,same=H.eq,H.same
for _,id in ipairs({'xiao_mask','xiao_exit_guard'})do D.statuses.statuses[#D.statuses.statuses+1]={id=id,priority=5,kind='buff',stack='intensity',decay='none'}end
local function fresh(mask)
 local s=C.new(D,{deck={'strike'},enemies={'cultist'},seed=42});s.xiao={startingRelic=true,relicUsed=true};local card=s.hand[1];s.pendingPlay={uid=card.uid,targetId=s.enemies[1].id};s.cardInUse=card
 if mask>0 then A.applyPower(s,s.player,'xiao_mask',mask,s.player);S.recordApplied(s,s.player,'xiao_mask',nil)end
 return s
end
local function run(s,kind,value)
 Q.start(s,{{kind='effect',effect={op='xiaoCard',kind=kind,value=value,uid=s.pendingPlay.uid}}})
 Q.run(s,{effect=function(st,a,q)if a.effect.op=='xiaoCard'then return X.dispatch(C,st,a.effect,q)end C.applyEffects(st,{a.effect},st.player,st.player,st.cardInUse);return true end})
end
for _,guard in ipairs({4,6})do
 local s=fresh(2);run(s,'exitGuard',guard);eq(s.player.block,0)
 run(s,'shortenMask',1);eq(s.player.statuses.xiao_mask,1);eq(s.player.block,0)
 run(s,'shortenMask',1);eq(s.player.statuses.xiao_mask,nil);eq(s.player.block,guard)
 run(s,'maskCommit',0);eq(s.player.block,guard)
 local n=fresh(1);run(n,'exitGuard',guard);local hp=n.player.hp;O.apply(C,n,{op='xiaoOwnerEndMask',turn=n.turn},Q);eq(n.player.hp,hp-2);eq(n.player.block,0)
end
print('PASS x27 partial reduction versus true exit and x29 not triggered by natural expiry or empty exit')
local s=fresh(1);run(s,'exitGuard',4);run(s,'exitGuard',6);run(s,'maskCommit',0);eq(s.player.block,10)
local count=0;for _,e in ipairs(s.player.powerScheduleOrder or {})do if e.id=='xiao_exit_guard'then count=count+1 end end;eq(count,1)
s=fresh(1);run(s,'exitGuard',6);s.player.hp=0;run(s,'shortenMask',1);eq(s.player.block,0);eq(s.player.statuses.xiao_mask,1)
print('PASS exit ability accumulates once in schedule and death cannot collect exit defense')
s=fresh(1);s.player.statuses.xiao_exit_guard=false;local before=C.copy(s)
assert(not pcall(X.dispatch,C,s,{op='xiaoCard',kind='shortenMask',value=1,uid=s.pendingPlay.uid},Q));same(s,before)
s=fresh(1);local restore=require('abyss_snapshot').capture(s);before=C.copy(s)
local ok=pcall(function()run(s,'exitGuard',6);run(s,'shortenMask',1);error('after exit')end);assert(not ok);restore();same(s,before)
print('PASS malformed exit guard pre-reject and real snapshot restores acquired ability mask and shield')
