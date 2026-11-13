package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local X,P,Q=require('abyss_xiao_dispatch'),require('abyss_xiao_card_plan'),require('abyss_action_queue')
local function fresh(n)
 local deck={};for i=1,20 do deck[i]='strike'end
 local s=C.new(D,{deck=deck,enemies={'cultist'},seed=42});s.xiao={relicUsed=true,startingRelic=true};s.cardInUse=table.remove(s.hand);s.pendingPlay={uid=s.cardInUse.uid,targetId=s.enemies[1].id};s.enemies[1].hp=100;s.enemies[1].block=2
 while #s.hand>n do s.draw[#s.draw+1]=table.remove(s.hand)end
 C.draw(s,n-#s.hand);return s
end
local function run(s,id,up)
 local e=P.plan({hp=s.player.hp,mask=0,relicUsed=true,startingRelic=true},{id=id,upgraded=up}).orderedEffects[1];e.uid=s.pendingPlay.uid
 Q.start(s,{{kind='effect',effect=e}});Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='xiaoCard'then return X.dispatch(C,st,a.effect,q)end
  C.applyEffects(st,{a.effect},st.player,a.effect.targetId and st.enemies[1]or st.player,st.cardInUse);return true
 end})
end
for _,up in ipairs({false,true})do for _,n in ipairs({0,1,4,5,10})do
 local s=fresh(n);run(s,'x49',up);eq(#s.hand,math.max(n,up and 5 or 4));for _,c in ipairs(s.hand)do assert(c~=s.cardInUse)end
end end
print('PASS x49 base/up refills only missing actual hand slots, excluding resolving card')
for _,up in ipairs({false,true})do for _,n in ipairs({0,1})do for mask=0,1 do
 local s=fresh(n);s.player.statuses.xiao_mask=mask;run(s,'x50',up)
 eq(s.enemies[1].hp,100-((up and 7 or 5)+(n==0 and (up and 11 or 9)or 0)+mask*4-2))
end end end
print('PASS x50 evaluates actual empty-other-hand then applies mask and native armor')
local s=fresh(0);s.discard=s.draw;s.draw={};local before=C.copy(s);local restore=require('abyss_snapshot').capture(s)
run(s,'x49',true);eq(#s.hand,5);restore();same(s,before)
s=fresh(0);local keep=s.draw[1];s.draw={keep};s.discard={};run(s,'x49',true);eq(#s.hand,1)
s=fresh(0);before=C.copy(s);restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()run(s,'x50',true);error('after empty attack')end));restore();same(s,before)
print('PASS refill uses native reshuffle/short library and whole Snapshot restores draws or damage')
