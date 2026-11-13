package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C,Q,D,X,A=require('abyss_combat'),require('abyss_action_queue'),require('abyss_data'),require('abyss_xiao_dispatch'),require('abyss_actor')
local H=dofile('tests/helpers/act2_event_relics.lua');local eq,same=H.eq,H.same
local function fresh(mask)
 local s=C.new(D,{deck={'strike'},enemies={'cultist','cultist','cultist','cultist'},seed=42});s.xiao={relicUsed=true,startingRelic=true};s.player.statuses.xiao_mask=mask>0 and mask or nil
 local card=s.hand[1];s.cardInUse=card;s.pendingPlay={uid=card.uid,targetId=s.enemies[1].id};for _,e in ipairs(s.enemies)do e.hp=100;e.block=0 end;return s
end
local function run(s,kind,value,cap)
 Q.start(s,{{kind='effect',effect={op='xiaoCard',kind=kind,value=value,cap=cap,uid=s.pendingPlay.uid}}})
 Q.run(s,{effect=function(st,a,q)if a.effect.op=='xiaoCard'then return X.dispatch(C,st,a.effect,q)end C.applyEffects(st,{a.effect},st.player,a.effect.targetId and st.enemies[1]or st.player,st.cardInUse);return true end})
end
for _,cap in ipairs({14,20})do for _,block in ipairs({0,1,14,20,40})do for mask=0,1 do
 local s=fresh(mask);s.player.block=block;run(s,'blockDamage',1,cap)
 eq(s.player.block,block);eq(s.enemies[1].hp,100-math.min(block,cap)-mask*4)
end end end
print('PASS x37 current block base/up capped damage preserves shield and applies mask after cap')
for _,value in ipairs({4,6})do for live=0,4 do
 local s=fresh(0);for i=live+1,4 do s.enemies[i].hp=0 end
 run(s,'enemyCountBlock',value,3);eq(s.player.block,math.min(live,3)*value)
end end
local s=fresh(0);A.applyPower(s,s.player,'dexterity',2,s.player);run(s,'enemyCountBlock',4,3);eq(s.player.block,14)
print('PASS x40 actual live enemy count capped at three then host block modifiers')
s=fresh(0);s.player.block=false;local before=C.copy(s)
assert(not pcall(X.dispatch,C,s,{op='xiaoCard',kind='blockDamage',value=1,cap=14,uid=s.pendingPlay.uid},Q));same(s,before)
s=fresh(1);s.player.block=18;before=C.copy(s);local restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()run(s,'blockDamage',1,14);run(s,'enemyCountBlock',6,3);error('after state-based effects')end));restore();same(s,before)
print('PASS invalid shield pre-reject and real host snapshot restores chained state-based effects')
