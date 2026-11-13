package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C,Q,D,X,A,S=require('abyss_combat'),require('abyss_action_queue'),require('abyss_data'),require('abyss_xiao_dispatch'),require('abyss_actor'),require('abyss_power_schedule')
local H=dofile('tests/helpers/act2_event_relics.lua');local eq,same=H.eq,H.same
for _,id in ipairs({'xiao_mask','xiao_exit_guard'})do D.statuses.statuses[#D.statuses.statuses+1]={id=id,priority=5,kind='buff',stack='intensity',decay='none'}end
local function fresh(mask)
 local s=C.new(D,{deck={'strike'},enemies={'cultist'},seed=42});s.xiao={relicUsed=true,startingRelic=true};local card=s.hand[1];s.cardInUse=card;s.pendingPlay={uid=card.uid,targetId=s.enemies[1].id};s.enemies[1].hp=100;s.enemies[1].block=3
 if mask>0 then A.applyPower(s,s.player,'xiao_mask',mask,s.player);S.recordApplied(s,s.player,'xiao_mask',nil)end;return s
end
local function action(s,kind,value,bonus)return {kind='effect',effect={op='xiaoCard',kind=kind,value=value,bonus=bonus,uid=s.pendingPlay.uid}}end
local function run(s,actions)
 Q.start(s,actions);Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='xiaoCard'then return X.dispatch(C,st,a.effect,q)end
  C.applyEffects(st,{a.effect},st.player,a.effect.targetId and st.enemies[1]or st.player,st.cardInUse);return true
 end})
end
for _,up in ipairs({false,true})do for mask=0,3 do
 local s=fresh(mask);local base=up and 14 or 10;local bonus=up and 12 or 10
 run(s,{action(s,'lastMaskDamage',base,bonus)})
 eq(s.enemies[1].hp,100-(base+(mask==1 and bonus or 0)+(mask>0 and 4 or 0)-3));eq(s.player.statuses.xiao_mask,mask>0 and mask or nil)
end end
local s=fresh(2);run(s,{action(s,'shortenMask',1),action(s,'lastMaskDamage',10,10)});eq(s.enemies[1].hp,79)
print('PASS x28 actual current last-mask window bonus after prior shortening without auto-exit')
for _,refund in ipairs({1,2})do for mask=0,2 do
 s=fresh(mask);local energy=s.energy;run(s,{action(s,'exitEnergy',refund)});eq(s.energy,energy+(mask>0 and refund or 0));eq(s.player.statuses.xiao_mask,nil)
 run(s,{action(s,'exitEnergy',refund)});eq(s.energy,energy+(mask>0 and refund or 0))
end end
print('PASS x34 actual energy refund only once on real positive-to-zero exit')
s=fresh(1);run(s,{action(s,'exitGuard',4)});local energy=s.energy;run(s,{action(s,'exitEnergy',2)});eq(s.player.block,4);eq(s.energy,energy+2)
s=fresh(1);s.energy=2147483647;local before=C.copy(s)
assert(not pcall(X.dispatch,C,s,action(s,'exitEnergy',1).effect,Q));same(s,before)
s=fresh(1);before=C.copy(s);local restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()run(s,{action(s,'exitEnergy',2)});error('after refund')end));restore();same(s,before)
print('PASS exit shield plus refund and overflow pre-rejection with host rollback')
