package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local X,P,Q=require('abyss_xiao_dispatch'),require('abyss_xiao_card_plan'),require('abyss_action_queue')
local function fresh(hp)
 local s=C.new(D,{deck={'strike'},enemies={'cultist'},seed=42});s.xiao={relicUsed=true,startingRelic=true};s.cardInUse=table.remove(s.hand);s.pendingPlay={uid=s.cardInUse.uid,targetId=s.enemies[1].id};s.player.hp=hp;s.player.maxHp=70;s.enemies[1].hp=100;s.enemies[1].block=2;return s
end
local function run(s,id,up)
 local plan=P.plan({hp=s.player.hp,mask=s.player.statuses.xiao_mask or 0,relicUsed=true,startingRelic=true},{id=id,upgraded=up});local actions={}
 for _,e in ipairs(plan.orderedEffects)do e.uid=s.pendingPlay.uid;actions[#actions+1]={kind='effect',effect=e}end
 Q.start(s,actions);Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='xiaoCard'then return X.dispatch(C,st,a.effect,q)end
  C.applyEffects(st,{a.effect},st.player,a.effect.targetId and st.enemies[1]or st.player,st.cardInUse);return true
 end})
end
for _,up in ipairs({false,true})do for _,hp in ipairs({70,61,60,59,20,1})do
 local s=fresh(hp);run(s,'x52',up);local extra=math.min(up and 12 or 10,math.floor((70-hp)/10)*2)
 eq(s.enemies[1].hp,100-((up and 6 or 4)+extra-2));eq(s.player.hp,hp)
end end
print('PASS x52 base/up current actual missing HP tiers and bonus cap do not spend or heal life')
for _,up in ipairs({false,true})do
 local s=fresh(62);run(s,'x51',up);eq(s.player.hp,59);eq(s.player.block,up and 12 or 9)
 run(s,'x52',up);eq(s.enemies[1].hp,100-(up and 6 or 4))
 s=fresh(3);local before=C.copy(s);assert(not pcall(run,s,'x51',up));same(s,before)
end
print('PASS x51 native life payment before defense crosses x52 tier; hp3 prerequisite rejects')
local s=fresh(62);require('abyss_actor').applyPower(s,s.player,'intangible',1,s.player);run(s,'x51',false);eq(s.player.hp,61);eq(s.player.block,9);run(s,'x52',false);eq(s.enemies[1].hp,98)
print('PASS native Intangible changes blood cost and following damage tier; explicit parity HOLD')
s=fresh(30);local before=C.copy(s);local restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()run(s,'x51',true);run(s,'x52',true);error('after damage')end));restore();same(s,before)
s=fresh(70);s.player.maxHp=60;before=C.copy(s);assert(not pcall(X.dispatch,C,s,{op='xiaoCard',kind='missingHpDamage',value=4,bonus=2,step=10,cap=10,uid=s.pendingPlay.uid},Q));same(s,before)
print('PASS host Snapshot restores life defense damage and inconsistent HP rejects before effects')
