-- Exact first-arrow retrieval, no hidden-pile presentation or random selection.
local Paid=dofile('experiments/characters/ganyu-lua/queued-card.lua')
local Actions=require('abyss_card_actions')
local M={}
local function validate(e,prepared)
 assert(type(e)=='table'and getmetatable(e)==nil and e.op=='ganyuRetrieve','invalid retrieval namespace')
 for k in pairs(e)do assert(k=='op'or k=='zone'or prepared and k=='uid','unknown retrieval field')end
 assert(e.zone=='draw'or e.zone=='discard','invalid retrieval zone')
end
function M.prepare(combat,state,e,uid)
 validate(e,false);Paid.prepare(combat,state,{op='ganyuCard',kind='charge',amount=0},nil,uid)
 return {op=e.op,zone=e.zone,uid=uid}
end
function M.dispatch(combat,state,e,queue)
 validate(e,true);assert(e.uid~=nil,'missing retrieval uid')
 Paid.prepare(combat,state,{op='ganyuCard',kind='charge',amount=0},nil,e.uid)
 local seen={};for _,name in ipairs({'hand','draw','discard','exhaust'})do
  for _,card in ipairs(state[name])do
   assert(type(card.uid)=='number'and card.uid%1==0 and card.uid>0 and not seen[card.uid]and card.uid~=e.uid,'invalid retrieval instance graph')
   assert(state.catalog.cards[card.cardId]and(card.upgraded==nil or type(card.upgraded)=='boolean'),'invalid retrieval card')
   seen[card.uid]=true
  end
 end
 if #state.hand>=state.rules.player.maxHand then return true end
 local pile=state[e.zone]
 for i,card in ipairs(pile)do
  if card.cardId=='ganyu_lab_03'then
   table.remove(pile,i);Actions.toHand(state,card);break
  end
 end
 return true
end
return M
