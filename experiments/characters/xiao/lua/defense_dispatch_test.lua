package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C,A,Q,D=require('abyss_combat'),require('abyss_actor'),require('abyss_action_queue'),require('abyss_data')
local X,Owner,Schedule=require('abyss_xiao_dispatch'),require('abyss_xiao_owner_end'),require('abyss_power_schedule')
for _,id in ipairs({'xiao_mask','xiao_mask_guard'})do D.statuses.statuses[#D.statuses.statuses+1]={id=id,priority=5,kind='buff',stack='intensity',decay='none'}end
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
local function fresh(mask,hp)
 local s=C.new(D,{deck={'strike'},enemies={'cultist'},seed=42})
 s.player.hp=hp or 10;s.xiao={relicUsed=true,startingRelic=true}
 local card=s.hand[1];s.pendingPlay={uid=card.uid,targetId=s.enemies[1].id};s.cardInUse=card
 if mask>0 then A.applyPower(s,s.player,'xiao_mask',mask,s.player);Schedule.recordApplied(s,s.player,'xiao_mask',nil)end
 return s
end
local function apply(s,kind,value)
 Q.start(s,{{kind='effect',effect={op='xiaoCard',kind=kind,value=value,uid=s.pendingPlay.uid}}})
 Q.run(s,{effect=function(st,a,q)if a.effect.op=='xiaoCard'then return X.dispatch(C,st,a.effect,q)end C.applyEffects(st,{a.effect},st.player,st.player,st.cardInUse);return true end})
end
for _,value in ipairs({8,12})do for mask=0,3 do
 local s=fresh(mask);apply(s,'maskBlock',value);eq(s.player.block,mask==0 and value/2 or value)
end end
local s=fresh(1);A.applyPower(s,s.player,'dexterity',2,s.player);apply(s,'maskBlock',8);eq(s.player.block,10)
print('PASS x13 actual queued host block uses current mask and native Dexterity')
for _,guard in ipairs({3,4})do
 s=fresh(1);apply(s,'maskGuard',guard);eq(s.player.block,0);eq(s.player.statuses.xiao_mask_guard,guard)
 apply(s,'maskGuard',guard);eq(s.player.statuses.xiao_mask_guard,guard*2)
 local count=0;for _,e in ipairs(s.player.powerScheduleOrder or {})do if e.id=='xiao_mask_guard'then count=count+1 end end;eq(count,1)
 Owner.apply(C,s,{op='xiaoOwnerEndMask',turn=s.turn},Q)
 eq(s.player.hp,8);eq(s.player.block,guard*2);eq(s.player.statuses.xiao_mask,nil)
end
print('PASS x14 actual Power stacks without duplicate acquisition then owner end pays before defense')
s=fresh(1,2);apply(s,'maskGuard',4);Owner.apply(C,s,{op='xiaoOwnerEndMask',turn=s.turn},Q);eq(s.player.hp,0);eq(s.player.block,0)
local n=fresh(0);eq(n.player.statuses.xiao_mask_guard,nil)
print('PASS mask HP death prevents defense and new battle has no leaked ability')
s=fresh(1);s.player.statuses.xiao_mask_guard=2147483647
local before=C.copy(s);local restore=require('abyss_snapshot').capture(s)
local ok=pcall(apply,s,'maskGuard',1);assert(not ok);restore()
local same=dofile('tests/helpers/act2_event_relics.lua').same;same(s,before)
s.player.statuses.xiao_mask_guard=false;local events=#s.events
assert(not pcall(X.dispatch,C,s,{op='xiaoCard',kind='maskGuard',value=3,uid=s.pendingPlay.uid},Q));eq(#s.events,events)
print('PASS unsafe and false ability accumulation rejects with host snapshot restoration')
