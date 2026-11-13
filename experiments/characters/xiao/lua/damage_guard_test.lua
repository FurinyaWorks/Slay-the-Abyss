package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local X,P,Q=require('abyss_xiao_dispatch'),require('abyss_xiao_card_plan'),require('abyss_action_queue')
local function fresh(hp,armor)
 local s=C.new(D,{deck={'strike'},enemies={'cultist','cultist'},seed=42});s.xiao={relicUsed=true,startingRelic=true};s.cardInUse=table.remove(s.hand);s.pendingPlay={uid=s.cardInUse.uid,targetId=s.enemies[1].id};s.enemies[1].hp=hp;s.enemies[1].block=armor;return s
end
local function run(s,up)
 local e=P.plan({hp=s.player.hp,mask=0,relicUsed=true,startingRelic=true},{id='x46',upgraded=up}).orderedEffects[1];e.uid=s.pendingPlay.uid
 Q.start(s,{{kind='effect',effect=e}});Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='xiaoCard'then return X.dispatch(C,st,a.effect,q)end
  local target=st.player;for _,enemy in ipairs(st.enemies)do if enemy.id==a.effect.targetId then target=enemy end end
  C.applyEffects(st,{a.effect},st.player,target,st.cardInUse);return true
 end})
end
for _,up in ipairs({false,true})do for _,hp in ipairs({2,30})do for _,armor in ipairs({0,6,20})do
 local s=fresh(hp,armor);local playerHp=s.player.hp;local loss=math.min(hp,math.max(0,(up and 10 or 7)-armor));run(s,up)
 eq(s.enemies[1].hp,hp-loss);eq(s.player.block,math.min(up and 6 or 4,loss));eq(s.player.hp,playerHp)
end end end
print('PASS x46 actual HP loss excludes armor and overkill, caps block and never heals')
local s=fresh(30,0);s.player.statuses.xiao_mask=2;run(s,false);eq(s.enemies[1].hp,19);eq(s.player.block,4)
s=fresh(30,20);require('abyss_actor').applyPower(s,s.player,'dexterity',2,s.player);run(s,false);eq(s.player.block,0)
print('PASS masked attack increases real damage but not shield cap; zero loss queues no block even with Dex')
s=fresh(30,0);local before=C.copy(s);local restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()run(s,true);error('after HP-derived shield')end));restore();same(s,before)
s=fresh(0,0);before=C.copy(s);assert(not pcall(X.dispatch,C,s,{op='xiaoCard',kind='damageGuard',value=7,cap=4,uid=s.pendingPlay.uid},Q));same(s,before)
print('PASS dead target rejected before effects and whole host Snapshot restores damage plus shield')
