package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C,Q,D,X=require('abyss_combat'),require('abyss_action_queue'),require('abyss_data'),require('abyss_xiao_dispatch')
local H=dofile('tests/helpers/act2_event_relics.lua');local eq,same=H.eq,H.same
local function fresh()
 local deck={};for i=1,12 do deck[i]='strike'end
 local s=C.new(D,{deck=deck,enemies={'cultist'},seed=42});s.xiao={relicUsed=true,startingRelic=true}
 local c=table.remove(s.hand);s.cardInUse=c;s.pendingPlay={uid=c.uid,targetId=s.enemies[1].id};return s
end
local handlers={effect=function(s,a,q)if a.effect.op=='xiaoCard'then return X.dispatch(C,s,a.effect,q)end if a.effect.op=='faultProbe'then error('after spend')end C.applyEffects(s,{a.effect},s.player,s.player,s.cardInUse);return true end}
local function action(s,kind,value,cap)return {kind='effect',effect={op='xiaoCard',kind=kind,value=value,cap=cap,uid=s.pendingPlay.uid}}end
local function run(s,a)Q.start(s,{a});Q.run(s,handlers)end
for _,value in ipairs({5,7})do for _,energy in ipairs({0,1,3})do local s=fresh();s.energy=energy;run(s,action(s,'spendEnergyBlock',value));eq(s.energy,0);eq(s.player.block,energy*value)end end
print('PASS x23 spends actual remaining energy once for base/up native block')
for _,cap in ipairs({2,3})do for _,block in ipairs({0,4,5,9,10,15,21})do local s=fresh();s.player.block=block;local n=#s.hand;run(s,action(s,'spendBlockDraw',5,cap));eq(s.player.block,0);eq(#s.hand,n+math.min(math.floor(block/5),cap))end end
local s=fresh();s.draw={};s.discard={};s.player.block=21;local n=#s.hand;run(s,action(s,'spendBlockDraw',5,3));eq(s.player.block,0);eq(#s.hand,n)
print('PASS x38 loses remainder and excess shield even when actual draw pile is empty')
for _,kind in ipairs({'spendEnergyBlock','spendBlockDraw'})do
 s=fresh();s.energy=3;s.player.block=16;local before=C.copy(s);local hand=s.hand;local restore=require('abyss_snapshot').capture(s)
 local ok=pcall(function()Q.start(s,{action(s,kind,5,3),{kind='effect',effect={op='faultProbe'}}});Q.run(s,handlers)end)
 assert(not ok);restore();same(s,before);eq(s.hand,hand)
end
for _,bad in ipairs({false,-1,0/0,1.5})do s=fresh();s.energy=bad;local before=C.copy(s);assert(not pcall(X.dispatch,C,s,{op='xiaoCard',kind='spendEnergyBlock',value=5,uid=s.pendingPlay.uid},Q));if bad==bad then same(s,before)end end
s=fresh();s.energy=2147483647;local before=C.copy(s);assert(not pcall(X.dispatch,C,s,{op='xiaoCard',kind='spendEnergyBlock',value=7,uid=s.pendingPlay.uid},Q));same(s,before)
print('PASS invalid spend input and product overflow pre-reject; host rollback restores spend draw and RNG')
s=fresh();s.energy=0;require('abyss_actor').applyPower(s,s.player,'dexterity',2,s.player)
run(s,action(s,'spendEnergyBlock',5));eq(s.player.block,2)
print('PASS recorded semantic risk: native Dexterity grants block on zero-energy base-zero effect')
