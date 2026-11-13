package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local B=require('abyss_xiao_play_bridge');local Actions=require('abyss_card_actions')
local function fresh(id,up)
 local data=C.copy(D);for _,d in ipairs(B.additionalDefinitions())do data.cards.cards[#data.cards.cards+1]=d end
 local deck={{cardId='xiao_candidate_'..id,upgraded=up}};for i=1,10 do deck[#deck+1]='strike'end
 local s=C.new(data,{deck=deck,enemies={'cultist','cultist'},seed=42,candidateLifecycle={kind='xiao',relicEnabled=false}})
 local card
 for _,pile in ipairs({s.hand,s.draw})do for i,c in ipairs(pile)do if c.cardId=='xiao_candidate_'..id then card=table.remove(pile,i);break end end end
 assert(card);for _,e in ipairs(s.enemies)do e.hp=100;e.block=0 end;return s,card
end
for _,id in ipairs({'x12','x18'})do for _,up in ipairs({false,true})do
 for _,mode in ipairs({'normal','unmarked','runNativeABI','effects','dead'})do
  local s,c=fresh(id,up);local d=s.catalog.cards[c.cardId];require('abyss_actor').applyPower(s,s.player,'xiao_mask',2,s.player)
  if mode=='unmarked'then d.xiaoCandidate=nil elseif mode=='runNativeABI'then d.runNativeABI=true elseif mode=='effects'then d.effects[1].value=99;d.upgrade.effects[1].value=99 elseif mode=='dead'then s.player.hp=0 end
  local energy,hand=s.energy,#s.hand
  C.queueCard(s,c,{targetIndex=1,exhaustCards=false});Actions.drain(C,s);eq(s.energy,energy)
  if mode=='normal'then
   if id=='x18'then eq(s.player.statuses.xiao_mask,nil)else eq(s.player.statuses.xiao_mask,2)end
   local n=id=='x12'and(up and 13 or 10)or(up and 28 or 22);for _,e in ipairs(s.enemies)do eq(e.hp,100-n)end
  else eq(s.enemies[1].hp,100);eq(#s.hand,hand);eq(s.player.statuses.xiao_mask,2)end
 end
end end
print('XIAO_AREA_AUTO_PASS 20 base upgrade actual automatic accepted corrupt and dead cases')
