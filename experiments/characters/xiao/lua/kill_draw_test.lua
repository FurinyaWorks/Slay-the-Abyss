package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local X,P,Q=require('abyss_xiao_dispatch'),require('abyss_xiao_card_plan'),require('abyss_action_queue')
local function fresh(hp,block)
 local deck={};for i=1,12 do deck[i]='strike'end
 local s=C.new(D,{deck=deck,enemies={'cultist','cultist'},seed=42});s.xiao={relicUsed=true,startingRelic=true};s.cardInUse=table.remove(s.hand);s.pendingPlay={uid=s.cardInUse.uid,targetId=s.enemies[1].id};s.enemies[1].hp=hp;s.enemies[1].block=block;return s
end
local function run(s,up)
 local plan=P.plan({hp=s.player.hp,mask=0,relicUsed=true,startingRelic=true},{id='x43',upgraded=up})
 local actions={};for _,e in ipairs(plan.orderedEffects)do e.uid=s.pendingPlay.uid;actions[#actions+1]={kind='effect',effect=e}end
 Q.start(s,actions);Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='xiaoCard'then return X.dispatch(C,st,a.effect,q)end
  local target=st.player;for _,enemy in ipairs(st.enemies)do if enemy.id==a.effect.targetId then target=enemy end end
  C.applyEffects(st,{a.effect},st.player,target,st.cardInUse);return true
 end})
end
for _,up in ipairs({false,true})do for _,block in ipairs({0,20})do
 local s=fresh(5,block);local hand=#s.hand;run(s,up);eq(#s.hand,hand+(block==0 and 2 or 0));eq(s.xiao.damageWitness.used,true)
 local before=C.copy(s);assert(not pcall(X.dispatch,C,s,{op='xiaoCard',kind='killDraw',value=2,uid=s.pendingPlay.uid},Q));same(s,before)
end end
print('PASS x43 actual stable target kill draws two once; armor survival does not draw')
local s=fresh(0,0);local before=C.copy(s);assert(not pcall(X.dispatch,C,s,{op='xiaoCard',kind='killDraw',value=2,uid=s.pendingPlay.uid},Q));same(s,before)
s=fresh(5,0);s.player.statuses.xiao_mask=1;run(s,false);eq(s.enemies[1].hp,0)
print('PASS no prior living-target damage witness rejects; masked damage remains compatible')
s=fresh(5,0);before=C.copy(s);local restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()run(s,true);error('after kill draw')end));restore();same(s,before);eq(s.xiao.damageWitness,nil)
print('PASS real host snapshot restores victim draw and consumed witness for command retry')
