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
 local s=fresh();run(s,'x53',up);eq(s.player.block,0);local hp=s.player.hp;local hand=#s.hand;local ops={};run(s,'x54',up,ops)
 eq(s.player.hp,hp-2);eq(s.player.block,up and 6 or 4);eq(#s.hand,hand+1);eq(s.enemies[1].hp,100-(up and 14 or 11));eq(table.concat(ops,','),'loseHp,block,draw,damage')
 run(s,'x54',up);eq(s.player.block,up and 6 or 4);eq(#s.hand,hand+1)
end
print('PASS x53/x54 real life entry guard relic draw attack order; refresh cannot re-trigger entry benefits')
local s=fresh();run(s,'x53',false);run(s,'x53',true);eq(s.player.statuses.xiao_entry_guard,10)
local slots=0;for _,e in ipairs(require('abyss_power_schedule').list(s.player))do if e.id=='xiao_entry_guard'then slots=slots+1 end end;eq(slots,1)
run(s,'x54',false);run(s,'x06',false);local before=s.player.block;run(s,'x54',false);eq(s.player.block,before+10)
print('PASS stacked entry Power one schedule slot; actual exit permits fresh entry shield but no second relic draw')
s=fresh();run(s,'x53',true);local before=C.copy(s);local restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()run(s,'x54',true);error('after guarded entry')end));restore();same(s,before)
s=fresh();s.player.statuses.xiao_entry_guard=false;before=C.copy(s);assert(not pcall(X.dispatch,C,s,{op='xiaoCard',kind='maskCommit',value=1,uid=s.pendingPlay.uid},Q));same(s,before)
print('PASS host Snapshot restores life entry shield relic draw damage; false Power rejects before entry mutation')
