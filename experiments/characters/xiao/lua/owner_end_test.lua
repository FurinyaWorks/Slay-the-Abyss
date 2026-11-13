package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local M=require('abyss_xiao_owner_end')
local C,A,Q,End=require('abyss_combat'),require('abyss_actor'),require('abyss_action_queue'),require('abyss_end_turn_powers')
local D=require('abyss_data')
for _,id in ipairs({'xiao_mask','xiao_mask_guard','xiao_expiry_energy'})do D.statuses.statuses[#D.statuses.statuses+1]={id=id,priority=5,kind='buff',stack='intensity',decay='none'}end
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
local function fresh(hp,mask)
 local s=C.new(D,{deck={},enemies={'cultist'},seed=42,enableStances=true,orbSlots=0,cardRandomSeed='42'})
 s.player.hp=hp;for _,item in ipairs({{'xiao_mask',mask},{'xiao_mask_guard',4},{'xiao_expiry_energy',2}})do A.applyPower(s,s.player,item[1],item[2],s.player);require('abyss_power_schedule').recordApplied(s,s.player,item[1],nil)end
 return s
end
local function execute(s)
 local actions=End.prepare(s,C,M);eq(#actions,1);Q.start(s,actions);Q.run(s,{effect=function(st,a)return M.apply(C,st,a.effect,Q)end})
end
local s=fresh(8,1);execute(s);eq(s.player.hp,6);eq(s.player.block,4);eq(s.player.statuses.xiao_mask,nil);eq(s.xiao.reservedEnergy,2)
for _,entry in ipairs(s.player.powerScheduleOrder or {})do assert(entry.id~='xiao_mask')end
print('PASS true ordinary owner-end plan and queue uses HP loss then block expiry, removes schedule')
s=fresh(2,1);execute(s);eq(s.player.hp,0);eq(s.player.block,0);eq(s.xiao.reservedEnergy,nil)
print('PASS lethal payment prevents guard and expiry')
s=fresh(8,2);execute(s);eq(s.player.statuses.xiao_mask,1);eq(s.xiao.reservedEnergy,0)
local hp=s.player.hp;assert(not pcall(M.apply,C,s,{op='xiaoOwnerEndMask',turn=s.turn},Q));eq(s.player.hp,hp)
assert(not pcall(M.apply,C,s,{op='xiaoOwnerEndMask',turn=s.turn+1},Q));eq(s.player.hp,hp)
print('PASS retained mask, duplicate and stale actions reject before payment')
s=fresh(8,1);A.applyPower(s,s.player,'intangible',1,s.player);Q.start(s,{{kind='effect',effect={op='xiaoOwnerEndMask',turn=s.turn}}});Q.run(s,{effect=function(st,a)return M.apply(C,st,a.effect,Q)end});eq(s.player.hp,7)
print('PASS formal host Intangible modifies HP payment: explicitly not raw JS parity')
s=fresh(8,1);local plan=End.prepare(s,C,M);Q.start(s,{{kind='effect',effect={op='testPause'}},plan[1]});local handlers={effect=function(st,a)if a.effect.op=='testPause'then return 'pause'end return M.apply(C,st,a.effect,Q)end};eq(Q.run(s,handlers),'pause');eq(s.player.hp,8);eq(s.xiao,nil);Q.resume(s,handlers);eq(s.player.hp,6);eq(s.xiao.reservedEnergy,2)
print('PASS pending action pause does not prepay; resume pays once')
s=fresh(8,1);s.player.block=2147483647;local before=s.player.hp;assert(not pcall(M.apply,C,s,{op='xiaoOwnerEndMask',turn=s.turn},Q));eq(s.player.hp,before);eq(s.xiao,nil)
print('PASS resource overflow preflight is nonmutating')
