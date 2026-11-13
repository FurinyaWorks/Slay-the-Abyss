-- Opt-in direct-card bridge only; wedge/recast and relic trigger are NOT routed.
local Resources=require('abyss_keqing_resources')
local Lifecycle=require('abyss_character_owner_end')
local M={}
local allowed={damage=true,damageAll=true,block=true,scry=true}
function M.canUse(state,card)
 if card.keqingCandidate==nil then
  if state.characterOwnerEnd=='keqing'and card.type=='attack'then return false,'keqing_candidate_effect_unavailable'end
  return true
 end
 if card.keqingCandidate~=true or not Lifecycle.active(state)or card.experimental~=true
  or card.runNativeABI or card.originalV4 or card.silentFinalCard or card.costMode
  or card.type~='attack'and card.type~='skill'then return false,'keqing_candidate_unavailable'end
 for _,e in ipairs(card.effects)do
  if not allowed[e.op]or e.times=='X'then return false,'keqing_candidate_effect_unavailable'end
 end
 return true
end
function M.prepare(state,card,effects)
 if card.keqingCandidate==nil then return effects end
 local ok,why=M.canUse(state,card);assert(ok,why)
 local r=state.keqingResource;local snapshot=Resources.attackSnapshot(r)
 local context=assert(state.pendingPlay,'missing paid card context')
 assert(context.keqingPaid==nil,'duplicate paid card plan')
 context.keqingPaid={turn=state.turn,uid=context.uid,attack=card.type=='attack',infused=card.type=='attack'and r.infusion>0}
 if card.type=='attack'and snapshot.bonusPerHit>0 then
  for _,e in ipairs(effects)do
   if e.op=='damage'or e.op=='damageAll'then e.value=e.value+snapshot.bonusPerHit end
  end
 end
 return effects
end
function M.complete(state,context,instance)
 local paid=context.keqingPaid;if not paid then return end
 assert(Lifecycle.active(state)and paid.turn==state.turn and paid.uid==instance.uid,'stale paid card context')
 assert(not paid.completed,'duplicate paid card completion')
 -- Only an entry-time charge is consumed; new buffs never apply retroactively.
 if paid.infused then
  assert(state.keqingResource.infusion>0,'lost paid card infusion')
  state.keqingResource=Resources.resolved(state.keqingResource,state.turn,true,'none')
 end
 paid.completed=true
end
return M
