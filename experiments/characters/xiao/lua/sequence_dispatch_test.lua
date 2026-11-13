package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local X,F,P,Q=require('abyss_xiao_dispatch'),require('abyss_xiao_attack_finish'),require('abyss_xiao_card_plan'),require('abyss_action_queue')
local function fresh()
 local s=C.new(D,{deck={'strike'},enemies={'cultist'},seed=42});s.xiao={relicUsed=true,startingRelic=true};s.cardInUse=table.remove(s.hand);s.pendingPlay={uid=s.cardInUse.uid,targetId=s.enemies[1].id};s.enemies[1].hp=100;s.enemies[1].block=2;return s
end
local function run(s,id,up)
 local e=P.plan({hp=s.player.hp,mask=s.player.statuses.xiao_mask or 0,relicUsed=true,startingRelic=true},{id=id,upgraded=up}).orderedEffects[1];e.uid=s.pendingPlay.uid
 Q.start(s,{{kind='effect',effect=e}});Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='xiaoCard'then return X.dispatch(C,st,a.effect,q)end
  C.applyEffects(st,{a.effect},st.player,a.effect.targetId and st.enemies[1]or st.player,st.cardInUse);return true
 end})
end
for _,up in ipairs({false,true})do for n=0,5 do
 local s=fresh();for i=1,n do F.capture(C,s);F.finish(C,s)end
 eq(F.attackCount(s),n);F.capture(C,s);run(s,'x41',up)
 eq(s.enemies[1].hp,100-((up and 5 or 3)+math.min(n,3)*(up and 4 or 3)-2))
 F.finish(C,s);eq(F.attackCount(s),n+1)
end end
print('PASS x41 base/up uses earlier completed attack count capped three excluding itself, then increments once')
for _,up in ipairs({false,true})do
 local s=fresh();run(s,'x42',up);local opening=(up and 6 or 4)+(up and 6 or 5);eq(s.player.block,opening)
 run(s,'x42',up);eq(s.player.block,opening*2)
 F.capture(C,s);F.finish(C,s);run(s,'x42',up);eq(s.player.block,opening*2+(up and 6 or 4))
 s.turn=s.turn+1;eq(F.attackCount(s),0);run(s,'x42',up);eq(s.player.block,opening*3+(up and 6 or 4))
end
print('PASS repeated pre-attack defense gets bonus; completed attack removes bonus and new turn resets count')
local s=fresh();s.xiao.attacksTurn=s.turn;s.xiao.attacksPlayed=2147483647;F.capture(C,s);local before=C.copy(s)
assert(not pcall(F.finish,C,s));same(s,before)
s=fresh();s.xiao.attacksPlayed=false;before=C.copy(s);assert(not pcall(F.attackCount,s));same(s,before)
s=fresh();before=C.copy(s);local restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()F.capture(C,s);run(s,'x41',true);F.finish(C,s);error('after count')end));restore();same(s,before)
print('PASS count overflow and false reject; host snapshot restores enemy damage capture and attack history')
