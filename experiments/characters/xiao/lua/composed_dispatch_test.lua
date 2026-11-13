package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C,Q,D,X,P,A,S=require('abyss_combat'),require('abyss_action_queue'),require('abyss_data'),require('abyss_xiao_dispatch'),require('abyss_xiao_card_plan'),require('abyss_actor'),require('abyss_power_schedule')
local H=dofile('tests/helpers/act2_event_relics.lua');local eq,same=H.eq,H.same
D.statuses.statuses[#D.statuses.statuses+1]={id='xiao_mask',priority=5,kind='buff',stack='intensity',decay='none'}
local function fresh(mask)
 local s=C.new(D,{deck={'strike','strike','strike','strike','strike','strike','strike','strike'},enemies={'cultist','cultist'},seed=42})
 s.xiao={relicUsed=false,startingRelic=true};s.cardInUse=table.remove(s.hand);s.pendingPlay={uid=s.cardInUse.uid,targetId=s.enemies[1].id}
 for _,e in ipairs(s.enemies)do e.hp=100;e.block=2 end
 if mask>0 then A.applyPower(s,s.player,'xiao_mask',mask,s.player);S.recordApplied(s,s.player,'xiao_mask',nil)end
 return s
end
local function run(s,id,up)
 local plan=P.plan({hp=s.player.hp,mask=s.player.statuses.xiao_mask or 0,relicUsed=s.xiao.relicUsed,startingRelic=true},{id=id,upgraded=up})
 local actions={};for _,e in ipairs(plan.orderedEffects)do e.uid=s.pendingPlay.uid;actions[#actions+1]={kind='effect',effect=e}end
 Q.start(s,actions);Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='xiaoCard'then return X.dispatch(C,st,a.effect,q)end
  C.applyEffects(st,{a.effect},st.player,a.effect.targetId and st.enemies[1]or st.player,st.cardInUse);return true
 end})
end
for _,up in ipairs({false,true})do
 local s=fresh(2);run(s,'x11',up);eq(s.enemies[1].hp,100-((up and 14 or 10)+4-2));eq(s.enemies[2].hp,100);eq(s.player.statuses.xiao_mask,nil)
 s=fresh(2);run(s,'x18',up);for _,e in ipairs(s.enemies)do eq(e.hp,100-((up and 24 or 18)+4-2))end;eq(s.player.statuses.xiao_mask,nil)
end
print('PASS composed x11/x18 base/up damage uses pre-exit mask then actual schedule exit')
for _,up in ipairs({false,true})do
 local s=fresh(0);local hp=s.player.hp;local hand=#s.hand;run(s,'x10',up);eq(s.player.hp,hp-2);eq(s.player.statuses.xiao_mask,1);eq(s.player.block,up and 11 or 8);eq(#s.hand,hand+1);eq(s.xiao.relicUsed,true)
 s=fresh(3);hp=s.player.hp;hand=#s.hand;run(s,'x10',up);eq(s.player.hp,hp-2);eq(s.player.statuses.xiao_mask,3);eq(#s.hand,hand);eq(s.xiao.relicUsed,false)
end
print('PASS composed x10 pays life before entry and draw, refresh does not shorten or trigger relic')
for _,up in ipairs({false,true})do
 local s=fresh(0);local hp=s.player.hp;local energy=s.energy;run(s,'x17',up);eq(s.player.hp,hp-3);eq(s.energy,energy+(up and 3 or 2))
 for mask=0,1 do s=fresh(mask);local hand=#s.hand;run(s,'x30',up);eq(#s.hand,hand+(mask==0 and 1 or 0));eq(s.enemies[1].hp,100-((up and 8 or 5)+mask*4-2))end
end
print('PASS composed x17 actual loseHp then energy and x30 actual conditional post-attack draw')
local s=fresh(0);s.player.hp=3;local before=C.copy(s);assert(not pcall(run,s,'x17',false));same(s,before)
s=fresh(2);before=C.copy(s);local player=s.player;local restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()run(s,'x18',true);error('post composed exit')end));restore();same(s,before);eq(s.player,player)
print('PASS composed life precondition rejects before queue and full native sequence host rollback')
s=fresh(0);A.applyPower(s,s.player,'intangible',1,s.player);local hp=s.player.hp;local energy=s.energy;run(s,'x17',false)
eq(s.player.hp,hp-1);eq(s.energy,energy+2)
print('PASS native Intangible reduces x17 life cost to one but keeps energy; parity HOLD')
