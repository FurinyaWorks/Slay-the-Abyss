-- Exact first-arrow retrieval, no hidden-pile presentation or random selection.
local Paid=require('abyss_ganyu_queued_card')
local Actions=require('abyss_card_actions')
local M={}
local function validate(e,prepared)
 assert(type(e)=='table'and getmetatable(e)==nil and e.op=='ganyuRetrieve','invalid retrieval namespace')
 for k in pairs(e)do assert(k=='op'or k=='zone'or k=='selector'or prepared and k=='uid','unknown retrieval field')end
 assert(e.zone=='draw'or e.zone=='discard','invalid retrieval zone')
 assert(e.selector==nil or e.selector=='block'or e.selector=='charge'or e.selector=='storm','invalid retrieval selector')
 assert(e.selector==nil or e.zone=='draw','effect retrieval only searches draw')
end
function M.prepare(combat,state,e,uid)
 validate(e,false);Paid.prepare(combat,state,{op='ganyuCard',kind='charge',amount=0},nil,uid)
 return {op=e.op,zone=e.zone,selector=e.selector,uid=uid}
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
  local match=not e.selector and card.cardId=='ganyu_lab_03'
  if e.selector then
   local definition=combat.cardDefinition(state,card)
   for _,effect in ipairs(definition.effects)do
    if e.selector=='block'and effect.op=='block'or e.selector=='charge'and effect.op=='ganyuCard'and effect.kind=='charge'or e.selector=='storm'and effect.op=='ganyuStorm'then match=true end
   end
  end
  if match then
   table.remove(pile,i);Actions.toHand(state,card);break
  end
 end
 return true
end
return M
