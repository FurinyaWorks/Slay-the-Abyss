package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C,Q,D,X=require('abyss_combat'),require('abyss_action_queue'),require('abyss_data'),require('abyss_xiao_dispatch')
local H=dofile('tests/helpers/act2_event_relics.lua');local eq,same=H.eq,H.same
local function fresh()
 local s=C.new(D,{deck={'strike','strike','defend','defend'},enemies={'cultist'},seed=42})
 s.xiao={relicUsed=true,startingRelic=true};local paid
 for i,c in ipairs(s.hand)do if c.cardId=='defend'then paid=table.remove(s.hand,i);break end end
 s.cardInUse=paid;s.pendingPlay={uid=paid.uid,targetId=s.enemies[1].id};return s
end
local function run(s,bonus)
 Q.start(s,{{kind='effect',effect={op='xiaoCard',kind='burnSkillsBlock',value=bonus,uid=s.pendingPlay.uid}}})
 Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='xiaoCard'then return X.dispatch(C,st,a.effect,q)end
  C.applyEffects(st,{a.effect},st.player,st.player,st.cardInUse);return true
 end})
end
for _,value in ipairs({6,8})do
 local s=fresh();local fuel;for _,c in ipairs(s.hand)do if c.cardId=='defend'then fuel=c end end
 run(s,value);eq(#s.hand,2);eq(#s.exhaust,1);eq(s.exhaust[1],fuel);eq(s.player.block,value)
 for _,c in ipairs(s.hand)do eq(c.cardId,'strike')end
 assert(s.exhaust[1]~=s.cardInUse)
end
print('PASS x19 base/up exhaust only other real skill entities and gain native block')
local s=fresh();require('abyss_actor').applyPower(s,s.player,'feel_no_pain',3,s.player);require('abyss_power_schedule').recordApplied(s,s.player,'feel_no_pain',nil);run(s,6);require('abyss_card_actions').drain(C,s)
-- Real exhaust hook is admitted through host reaction queue, not simulated.
eq(#s.exhaust,1);eq(s.player.block,9)
print('PASS actual Feel No Pain exhaust reaction remains active alongside Xiao block')
s=fresh();local before=C.copy(s);local hand=s.hand;local fuel=s.hand[1];local restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()run(s,8);error('after exhaustion')end));restore();same(s,before);eq(s.hand,hand);eq(s.hand[1],fuel)
local bad=C.new(D,{deck={'defend','defend','defend'},enemies={'cultist'},seed=42});bad.xiao={relicUsed=true,startingRelic=true};bad.cardInUse=table.remove(bad.hand);bad.pendingPlay={uid=bad.cardInUse.uid};before=C.copy(bad)
assert(not pcall(X.dispatch,C,bad,{op='xiaoCard',kind='burnSkillsBlock',value=2147483647,uid=bad.pendingPlay.uid},Q));same(bad,before)
print('PASS post-exhaust snapshot restores original entities and output overflow rejects before fuel')
s=fresh();for i=#s.hand,1,-1 do if s.hand[i].cardId=='defend'then s.discard[#s.discard+1]=table.remove(s.hand,i)end end
require('abyss_actor').applyPower(s,s.player,'dexterity',2,s.player);run(s,6);eq(#s.exhaust,0);eq(s.player.block,2)
print('PASS zero fuel native zero block still receives Dexterity; explicit JS parity HOLD')
