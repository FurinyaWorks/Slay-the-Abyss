package.path='experiments/characters/xiao/lua/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C,Q,D,X,B=require('abyss_combat'),require('abyss_action_queue'),require('abyss_data'),require('abyss_xiao_dispatch'),require('abyss_xiao_play_bridge')
local H=dofile('tests/helpers/act2_event_relics.lua');local eq,same=H.eq,H.same
local function fresh(up)
 local data=C.copy(D);for _,d in ipairs(B.definitions())do d.color='colorless';d.rarity='special';data.cards.cards[#data.cards.cards+1]=d end
 local s=C.new(data,{deck={{cardId='xiao_candidate_x06',upgraded=up},{cardId='xiao_candidate_x06',upgraded=false},{cardId='xiao_candidate_x01',upgraded=up},{cardId='xiao_candidate_x02'}},enemies={'cultist'},seed=42})
 s.xiao={relicUsed=true,startingRelic=true};local all=s.hand;s.hand={};s.discard={}
 local first,second,attack,paid
 for _,c in ipairs(all)do if c.cardId=='xiao_candidate_x06'then if not first then first=c else second=c end elseif c.cardId=='xiao_candidate_x01'then attack=c else paid=c end end
 if up and second.upgraded then first,second=second,first end
 s.discard={attack,first,second};s.cardInUse=paid;s.pendingPlay={uid=paid.uid,targetId=s.enemies[1].id};return s,first,second,attack
end
local function run(s,id,up)
 local plan=require('abyss_xiao_card_plan').plan({hp=s.player.hp,mask=s.player.statuses.xiao_mask or 0,relicUsed=true,startingRelic=true},{id=id,upgraded=up})
 local actions={};for _,e in ipairs(plan.orderedEffects)do e.uid=s.pendingPlay.uid;actions[#actions+1]={kind='effect',effect=e}end
 Q.start(s,actions);Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='xiaoCard'then return X.dispatch(C,st,a.effect,q)end
  C.applyEffects(st,{a.effect},st.player,st.player,st.cardInUse);return true
 end})
end
for _,up in ipairs({false,true})do
 local s,first,second,attack=fresh(up);run(s,'x16',up);eq(s.hand[1],first);eq(s.player.block,up and 6 or 3)
 -- Recovery did not turn the retrieved exit into a free execution or consume it.
 eq(#s.exhaust,0);eq(s.xiao.relicUsed,true);eq(s.pendingPlay.uid,s.cardInUse.uid)
 local n,_,_,top=fresh(up);run(n,'x39',up);eq(n.player.block,up and 7 or 4)
 run(n,'x09',up);eq(n.hand[1],top);eq(#n.hand,up and 3 or 2)
 for _,c in ipairs(n.hand)do assert(c.uid~=n.cardInUse.uid)end
end
print('PASS x16 recovery before block and x39 topdeck before x09 actual draw preserve UID and base/up counts')
for _,up in ipairs({false,true})do
 local s,first=fresh(up);s.hand={first};s.discard={};s.draw={};run(s,'x16',up);eq(#s.hand,1);eq(s.player.block,up and 6 or 3)
 run(s,'x39',up);eq(s.player.block,(up and 6 or 3)+(up and 7 or 4));eq(#s.draw,0)
end
print('PASS no eligible discard still grants configured defense without duplicating cards')
local s,first=fresh(true);local before=C.copy(s);local discard=s.discard;local restore=require('abyss_snapshot').capture(s)
assert(not pcall(function()run(s,'x39',true);run(s,'x09',true);error('after topdeck draw reshuffle')end));restore();same(s,before);eq(s.discard,discard);eq(s.discard[2],first)
print('PASS topdeck draw and actual reshuffle host snapshot restores original pile references')
