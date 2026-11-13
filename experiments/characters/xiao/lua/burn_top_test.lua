package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local X,P,Q=require('abyss_xiao_dispatch'),require('abyss_xiao_card_plan'),require('abyss_action_queue')
local function fresh()
 local deck={};for i=1,20 do deck[i]='strike'end
 local s=C.new(D,{deck=deck,enemies={'cultist'},seed=42});s.xiao={relicUsed=true,startingRelic=true};s.cardInUse=table.remove(s.hand);s.pendingPlay={uid=s.cardInUse.uid};return s
end
local function run(s,up)
 local e=P.plan({hp=s.player.hp,mask=0,relicUsed=true,startingRelic=true},{id='x48',upgraded=up}).orderedEffects[1];e.uid=s.pendingPlay.uid
 Q.start(s,{{kind='effect',effect=e}});Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='xiaoCard'then return X.dispatch(C,st,a.effect,q)end
  C.applyEffects(st,{a.effect},st.player,st.player,st.cardInUse);return true
 end})
end
for _,up in ipairs({false,true})do
 local s=fresh();local top=s.draw[#s.draw];local hand=#s.hand;run(s,up);eq(s.exhaust[1],top);eq(#s.hand,hand+(up and 3 or 2))
 for _,c in ipairs(s.hand)do assert(c~=top and c~=s.cardInUse)end
 local n=fresh();C.draw(n,6);eq(#n.hand,10);top=n.draw[#n.draw];run(n,up);eq(#n.hand,10);eq(n.exhaust[1],top)
end
print('PASS x48 burns actual top before base/up native draw; full hand still burns but cannot draw')
local s=fresh();s.discard=s.draw;s.draw={};local before=C.copy(s);local draw=s.draw;local restore=require('abyss_snapshot').capture(s)
run(s,false);eq(#s.exhaust,1);eq(#s.hand,#before.hand+2);assert(#s.draw>0)
restore();same(s,before);eq(s.draw,draw)
s=fresh();s.discard={};s.draw={};local count=#s.hand;run(s,true);eq(#s.exhaust,0);eq(#s.hand,count)
print('PASS native reshuffle feeds top exhaust; host Snapshot restores piles/RNG; empty library has no fuel')
s=fresh();require('abyss_actor').applyPower(s,s.player,'feel_no_pain',3,s.player);require('abyss_power_schedule').recordApplied(s,s.player,'feel_no_pain',nil)
run(s,true);require('abyss_card_actions').drain(C,s);eq(s.player.block,3)
print('PASS native exhaust reactions retained without pretending the burned card was drawn')
