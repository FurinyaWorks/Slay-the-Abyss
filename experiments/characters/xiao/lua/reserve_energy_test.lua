package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local X,T,P,Q=require('abyss_xiao_dispatch'),require('abyss_xiao_turn_start'),require('abyss_xiao_card_plan'),require('abyss_action_queue')
local function fresh()
 local s=C.new(D,{deck={'strike'},enemies={'cultist'},seed=42});s.xiao={relicUsed=true,startingRelic=true,reservedEnergy=0};s.cardInUse=table.remove(s.hand);s.pendingPlay={uid=s.cardInUse.uid};return s
end
local function reserve(s,up)
 local p=P.plan({hp=s.player.hp,mask=0,relicUsed=true,startingRelic=true},{id='x45',upgraded=up});eq(p.cost,1)
 local e=p.orderedEffects[1];e.uid=s.pendingPlay.uid;return X.dispatch(C,s,e,Q)
end
for _,up in ipairs({false,true})do
 local s=fresh();local energy=s.energy;reserve(s,up);eq(s.energy,energy);eq(s.xiao.reservedEnergy,up and 3 or 2)
 s.turn=s.turn+1;s.energy=3;T.apply(C,s,{op='xiaoStartEnergy',turn=s.turn});eq(s.energy,up and 6 or 5);eq(s.xiao.reservedEnergy,0)
 s.turn=s.turn+1;s.energy=3;T.apply(C,s,{op='xiaoStartEnergy',turn=s.turn});eq(s.energy,3)
end
print('PASS x45 base/up stores no immediate energy then native next-turn payout exactly once')
local s=fresh();reserve(s,false);reserve(s,true);eq(s.xiao.reservedEnergy,5)
s.player.hp=0;local energy=s.energy;T.apply(C,s,{op='xiaoStartEnergy',turn=s.turn});eq(s.energy,energy);eq(s.xiao.reservedEnergy,5)
print('PASS multiple reserves add but dead player cannot collect future energy')
for _,up in ipairs({false,true})do
 s=fresh();s.xiao.reservedEnergy=2147483647-(up and 3 or 2);reserve(s,up);eq(s.xiao.reservedEnergy,2147483647)
 local before=C.copy(s);assert(not pcall(reserve,s,up));same(s,before)
end
s=fresh();s.xiao.reservedEnergy=false;local before=C.copy(s);assert(not pcall(reserve,s,false));same(s,before)
s=fresh();before=C.copy(s);local resource=s.xiao;local restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()reserve(s,true);error('after reserve')end));restore();same(s,before);eq(s.xiao,resource)
print('PASS exact accumulation bound and false rejection; host Snapshot restores deferred resource')
