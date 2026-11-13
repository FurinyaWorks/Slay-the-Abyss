package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local X,T,Q=require('abyss_xiao_dispatch'),require('abyss_xiao_turn_start'),require('abyss_action_queue')
D.statuses.statuses[#D.statuses.statuses+1]={id='xiao_calm_draw',priority=5,kind='buff',stack='intensity',decay='none'}
local function fresh()
 local deck={};for i=1,20 do deck[i]='strike'end
 local s=C.new(D,{deck=deck,enemies={'cultist'},seed=42});s.xiao={relicUsed=true,startingRelic=true};s.cardInUse=table.remove(s.hand);s.pendingPlay={uid=s.cardInUse.uid};return s
end
local function install(s,n)return X.dispatch(C,s,{op='xiaoCard',kind='calmDraw',value=n,uid=s.pendingPlay.uid},Q)end
local function tick(s)return T.apply(C,s,{op='xiaoStartCalmDraw',turn=s.turn})end
for _,n in ipairs({1,2})do for mask=0,3 do
 local s=fresh();local hand=#s.hand;install(s,n);eq(#s.hand,hand);s.player.statuses.xiao_mask=mask>0 and mask or nil
 tick(s);eq(#s.hand,hand+(mask==0 and n or 0));local before=C.copy(s);assert(not pcall(tick,s));same(s,before)
end end
print('PASS x33 actual Power install never draws immediately; post-draw hook only in calm and once per turn')
local s=fresh();install(s,1);install(s,2);eq(s.player.statuses.xiao_calm_draw,3)
local count=0;for _,v in ipairs(require('abyss_power_schedule').list(s.player))do if v.id=='xiao_calm_draw'then count=count+1 end end;eq(count,1)
C.draw(s,5);eq(#s.hand,9);tick(s);eq(#s.hand,10)
print('PASS accumulated calm draw preserves one Power slot and real hand cap')
s=fresh();install(s,2);s.discard=s.draw;s.draw={};local before=C.copy(s);local draw=s.draw;local restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()tick(s);error('after actual shuffle draw')end));restore();same(s,before);eq(s.draw,draw);tick(s);eq(#s.hand,#before.hand+2)
s=fresh();s.player.statuses.xiao_calm_draw=false;before=C.copy(s);assert(not pcall(tick,s));same(s,before)
s=fresh();s.player.statuses.xiao_calm_draw=2147483647;before=C.copy(s);assert(not pcall(install,s,1));same(s,before)
print('PASS actual shuffle snapshot restores hook marker and strict false/Power overflow reject before mutation')
