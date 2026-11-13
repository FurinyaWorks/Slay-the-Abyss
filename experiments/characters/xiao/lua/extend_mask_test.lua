package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local X,P,Q=require('abyss_xiao_dispatch'),require('abyss_xiao_card_plan'),require('abyss_action_queue')
for _,id in ipairs({'xiao_mask','xiao_entry_guard'})do D.statuses.statuses[#D.statuses.statuses+1]={id=id,priority=5,kind='buff',stack='intensity',decay='none'}end
local function fresh()
 local deck={};for i=1,10 do deck[i]='strike'end
 local s=C.new(D,{deck=deck,enemies={'cultist'},seed=42});s.xiao={relicUsed=false,startingRelic=true};s.cardInUse=table.remove(s.hand);s.pendingPlay={uid=s.cardInUse.uid,targetId=s.enemies[1].id};s.enemies[1].hp=100;return s
end
local function run(s,id,up,observed)
 local plan=P.plan({hp=s.player.hp,mask=s.player.statuses.xiao_mask or 0,relicUsed=s.xiao.relicUsed,startingRelic=true},{id=id,upgraded=up});local actions={}
 for _,e in ipairs(plan.orderedEffects)do e.uid=s.pendingPlay.uid;actions[#actions+1]={kind='effect',effect=e}end
 Q.start(s,actions);Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='xiaoCard'then return X.dispatch(C,st,a.effect,q)end
  if observed then observed[#observed+1]=a.effect.op end
  C.applyEffects(st,{a.effect},st.player,a.effect.targetId and st.enemies[1]or st.player,st.cardInUse);return true
 end})
end
for _,up in ipairs({false,true})do
 for mask=0,3 do
  local s=fresh();s.player.statuses.xiao_mask=mask>0 and mask or nil
  local projected=P.plan({hp=s.player.hp,mask=mask,relicUsed=false,startingRelic=true},{id='x56',upgraded=up})
  eq(projected.expectedResourceAfterIfAlive.mask,mask>0 and math.min(3,mask+1)or 0)
  local hand=#s.hand;local hp=s.player.hp;run(s,'x56',up)
  eq(s.player.statuses.xiao_mask or 0,mask>0 and math.min(3,mask+1)or 0)
  eq(#s.hand,hand+(up and 2 or 1));eq(s.player.hp,hp);eq(s.xiao.relicUsed,false);eq(s.player.block,0)
 end
end
print('PASS x56 base upgrade actual draws at each duration; no entry relic shield or immediate HP payment')
local s=fresh();run(s,'x04',false);local slots=require('abyss_power_schedule').list(s.player);local count=#slots
run(s,'x56',true);eq(#require('abyss_power_schedule').list(s.player),count);eq(s.player.statuses.xiao_mask,3)
s.player.hp=4
local O=require('abyss_xiao_owner_end')
for i=1,2 do s.turn=i;O.apply(C,s,{op='xiaoOwnerEndMask',turn=i},Q)end
eq(s.player.hp,0)
print('PASS extension preserves schedule membership and still permits later native owner-end lethal life cost')
s=fresh();s.player.statuses.xiao_mask=1;local before=C.copy(s);local restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()run(s,'x56',true);error('after extension and draw')end));restore();same(s,before)
s.player.statuses.xiao_mask=false;before=C.copy(s);assert(not pcall(X.dispatch,C,s,{op='xiaoCard',kind='extendMask',value=1,uid=s.pendingPlay.uid},Q));same(s,before)
print('PASS host Snapshot restores duration draws and pile references; false mask rejected before mutation')
