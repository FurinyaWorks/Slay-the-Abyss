package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local X=require('abyss_xiao_turn_start')
local function fresh(n)local s=C.new(D,{deck={'strike'},enemies={'cultist'},seed=42});s.xiao={reservedEnergy=n};return s end
local function run(s)return X.apply(C,s,{op='xiaoStartEnergy',turn=s.turn})end
for _,n in ipairs({0,1,2,7})do
 local s=fresh(n);local e=s.energy;assert(run(s));eq(s.energy,e+n);eq(s.xiao.reservedEnergy,0)
 local before=C.copy(s);assert(not pcall(run,s));same(s,before)
 s.turn=s.turn+1;s.energy=3;assert(run(s));eq(s.energy,3)
end
print('PASS real native reserved energy once after host refill; next turn cannot pay reserve again')
local s=fresh(2147483644);s.energy=3;run(s);eq(s.energy,2147483647)
for _,field in ipairs({'reservedEnergy','startEnergyTurn'})do
 s=fresh(2);s.xiao[field]=false;local before=C.copy(s);assert(not pcall(run,s));same(s,before)
end
s=fresh(2147483645);s.energy=3;local before=C.copy(s);assert(not pcall(run,s));same(s,before)
s=fresh(2);before=C.copy(s);assert(not pcall(X.apply,C,s,{op='xiaoStartEnergy',turn=s.turn+1}));same(s,before)
print('PASS exact native energy boundary accepted; overflow false flags and stale turn reject before mutation')
s=fresh(4);s.player.hp=0;before=C.copy(s);assert(run(s));same(s,before)
s=fresh(4);before=C.copy(s);local x=s.xiao;local restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()run(s);error('after energy payout')end));restore();same(s,before);eq(s.xiao,x);assert(run(s));eq(s.energy,before.energy+4)
print('PASS dead player receives nothing and actual host Snapshot restores reserve marker and energy for retry')
D.statuses.statuses[#D.statuses.statuses+1]={id='xiao_mask',priority=5,kind='buff',stack='intensity',decay='none'}
s=fresh(0);s.player.hp=10;s.player.statuses.xiao_expiry_energy=2
require('abyss_actor').applyPower(s,s.player,'xiao_mask',1,s.player);require('abyss_power_schedule').recordApplied(s,s.player,'xiao_mask',nil)
assert(require('abyss_xiao_owner_end').apply(C,s,{op='xiaoOwnerEndMask',turn=s.turn},require('abyss_action_queue')))
eq(s.player.hp,8);eq(s.xiao.reservedEnergy,2);eq(s.player.statuses.xiao_mask,nil)
s.turn=s.turn+1;s.energy=3;run(s);eq(s.energy,5);eq(s.xiao.reservedEnergy,0)
print('PASS actual owner-end expiry reserve flows into separate next-turn native payout; host hooks remain unregistered')
