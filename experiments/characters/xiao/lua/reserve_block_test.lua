package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local X,P,T,Q=require('abyss_xiao_dispatch'),require('abyss_xiao_card_plan'),require('abyss_xiao_turn_start'),require('abyss_action_queue')
local function fresh()
 local s=C.new(D,{deck={'strike','defend'},enemies={'cultist'},seed=42})
 s.xiao={relicUsed=false,startingRelic=true};s.cardInUse=table.remove(s.hand);s.pendingPlay={uid=s.cardInUse.uid,targetId=s.enemies[1].id};return s
end
local function reserve(s,up)
 local p=P.plan({hp=s.player.hp,mask=0,relicUsed=false,startingRelic=true},{id='x58',upgraded=up})
 local e=p.orderedEffects[1];e.uid=s.pendingPlay.uid;return X.dispatch(C,s,e,Q)
end
local function pay(s)return T.apply(C,s,{op='xiaoStartBlock',turn=s.turn})end
for _,up in ipairs({false,true})do
 local s=fresh();reserve(s,up);eq(s.player.block,0);eq(s.xiao.reservedBlock,up and 14 or 10)
 s.turn=s.turn+1;s.player.block=0;pay(s);eq(s.player.block,up and 14 or 10);eq(s.xiao.reservedBlock,0)
 local before=C.copy(s);assert(not pcall(pay,s));same(s,before)
 s.turn=s.turn+1;s.player.block=0;pay(s);eq(s.player.block,0)
end
print('PASS x58 base upgrade reserve no immediate shield; native payout once and no repeated next-turn reward')
local s=fresh();reserve(s,false);reserve(s,true);eq(s.xiao.reservedBlock,24)
s.player.statuses.dexterity=2;pay(s);eq(s.player.block,26)
s=fresh();reserve(s,false);s.player.hp=0;local before=C.copy(s);pay(s);same(s,before)
print('PASS accumulated reserve uses native block modifiers; dead player neither paid nor marker consumed')
for _,field in ipairs({'reservedBlock','startBlockTurn'})do s=fresh();s.xiao[field]=false;before=C.copy(s);assert(not pcall(pay,s));same(s,before)end
s=fresh();s.xiao.reservedBlock=2147483647;before=C.copy(s);assert(not pcall(reserve,s,false));same(s,before)
s=fresh();reserve(s,true);before=C.copy(s);local restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()pay(s);error('after payout')end));restore();same(s,before);pay(s);eq(s.player.block,14)
print('PASS false resources and reserve overflow reject; host Snapshot restores reward and once marker for retry')
