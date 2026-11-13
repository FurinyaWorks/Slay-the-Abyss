package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C,Q,D,X=require('abyss_combat'),require('abyss_action_queue'),require('abyss_data'),require('abyss_xiao_dispatch')
local H=dofile('tests/helpers/act2_event_relics.lua');local eq,same=H.eq,H.same
local function fresh(mask)
 local s=C.new(D,{deck={'strike'},enemies={'cultist','cultist'},seed=42});s.xiao={relicUsed=true,startingRelic=true};s.player.statuses.xiao_mask=mask>0 and mask or nil
 local card=s.hand[1];s.pendingPlay={uid=card.uid,targetId=s.enemies[1].id};s.cardInUse=card
 for _,e in ipairs(s.enemies)do e.hp=50;e.block=0 end
 return s
end
local function run(s,value)
 Q.start(s,{{kind='effect',effect={op='xiaoCard',kind='damageHits',value=value,hits=2,uid=s.pendingPlay.uid}}})
 Q.run(s,{effect=function(st,a,q)if a.effect.op=='xiaoCard'then return X.dispatch(C,st,a.effect,q)end C.applyEffects(st,{a.effect},st.player,st.enemies[1],st.cardInUse);return true end})
end
for _,value in ipairs({4,6})do for mask=0,1 do
 local s=fresh(mask);s.enemies[1].block=5;run(s,value)
 eq(s.enemies[1].hp,50-math.max(0,2*(value+mask*4)-5));eq(s.enemies[1].block,0);eq(s.enemies[2].hp,50)
end end
print('PASS x35 base/up two native hits each receive mask bonus with sequential armor')
local s=fresh(1);s.enemies[1].hp=1;run(s,4);eq(s.enemies[1].hp,0);eq(s.enemies[2].hp,50)
print('PASS first-hit kill cannot redirect remaining native hit to another enemy')
for _,hits in ipairs({0,3,false,1.5})do
 s=fresh(1);local before=C.copy(s)
 assert(not pcall(X.dispatch,C,s,{op='xiaoCard',kind='damageHits',value=4,hits=hits,uid=s.pendingPlay.uid},Q));same(s,before)
end
s=fresh(1);local before=C.copy(s);local restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()run(s,6);error('after native hits')end));restore();same(s,before)
print('PASS malformed hit count pre-reject and real snapshot restores both damage events')
