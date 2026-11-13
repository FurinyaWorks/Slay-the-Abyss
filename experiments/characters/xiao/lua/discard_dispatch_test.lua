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
 Q.start(s,{{kind='effect',effect={op='xiaoCard',kind='discardAttacksDraw',value=bonus,uid=s.pendingPlay.uid}}})
 Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='xiaoCard'then return X.dispatch(C,st,a.effect,q)end
  C.applyEffects(st,{a.effect},st.player,st.player,st.cardInUse);return true
 end})
end
for _,bonus in ipairs({0,1})do
 local s=fresh();local ids={};for _,c in ipairs(s.hand)do ids[c.uid]=c end
 run(s,bonus);eq(#s.hand,3);eq(#s.discard,0);eq(#s.draw,0)
 for _,c in ipairs(s.hand)do eq(c,ids[c.uid]);assert(c.uid~=s.cardInUse.uid)end
end
print('PASS x24 base/up actual discard then reshuffle draws same attack entities without resolving card')
for _,bonus in ipairs({0,1})do
 local s=fresh();for i=#s.hand,1,-1 do if s.hand[i].cardId=='strike'then s.draw[#s.draw+1]=table.remove(s.hand,i)end end
 local before=C.copy(s);run(s,bonus);same(s,before)
end
print('PASS no attack fuel means no bonus draw and no pile/RNG mutation')
local s=fresh();local before=C.copy(s);local hand=s.hand;local original=s.hand[1];local restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()run(s,1);error('after discard and shuffle')end));restore();same(s,before);eq(s.hand,hand);eq(s.hand[1],original)
local bad=fresh();before=C.copy(bad);assert(not pcall(X.dispatch,C,bad,{op='xiaoCard',kind='discardAttacksDraw',value=2147483647,uid=bad.pendingPlay.uid},Q));same(bad,before)
print('PASS post-shuffle host Snapshot restores original references and overflow rejects before discard')
