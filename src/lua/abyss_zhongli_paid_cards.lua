-- Single-enemy paid-install slice only; no owner-end or jade interception.
local Lifecycle=require('abyss_zhongli_lifecycle')
local Dispatch=require('abyss_zhongli_card_effects')
local Presence=require('abyss_actor_presence')
local Copy=require('abyss_copy').copy
local M={}
local specs={zl21={kind='installPillar',base=3,upgraded=4},zl31={kind='installRepair',base=2,upgraded=3}}
function M.supports(e)
 if type(e)~='table'or getmetatable(e)or e.op~='zhongliCard'then return false end
 for k in pairs(e)do if k~='op'and k~='kind'and k~='value'then return false end end
 local max=e.kind=='installPillar'and 6 or e.kind=='installRepair'and 3
 return max~=false and max~=nil and type(e.value)=='number'and e.value%1==0 and e.value>=1 and e.value<=max
end
function M.canUse(state,instance,card)
 if card.zhongliCandidate==nil then
  for _,e in ipairs(card.effects)do if e.op=='zhongliCard'then return false,'unmarked_zhongli_card'end end
  return true
 end
 local spec=specs[instance.cardId]
 if card.zhongliCandidate~=true or not spec or state.characterCandidate~='zhongli' or state.experimentalMechanics~=true
  or state.originalV4 or card.experimental~=true or card.originalV4 or card.runNativeABI or card.silentFinalCard
  or card.costMode or card.keqingCandidate~=nil or card.ganyuCandidate~=nil or card.xiaoCandidate~=nil
  or card.type~='power' or card.target~='SELF' or #card.effects~=1
  or instance.upgraded~=nil and type(instance.upgraded)~='boolean'then return false,'zhongli_candidate_unavailable'end
 local e=card.effects[1]
 if not M.supports(e)or e.kind~=spec.kind or e.value~=(instance.upgraded and spec.upgraded or spec.base)then return false,'zhongli_effect_unavailable'end
 if #state.enemies~=1 or not Presence.isActive(state.player)or not Presence.isActive(state.enemies[1])then return false,'inactive_zhongli_battle'end
 local ok=pcall(Lifecycle.validate,state);if not ok then return false,'invalid_zhongli_resource'end
 return true
end
function M.prepare(state,card,effects)
 if card.zhongliCandidate==nil then return effects end
 local context=assert(state.pendingPlay,'missing Zhongli pending use')
 local instance=assert(state.cardInUse,'missing Zhongli limbo')
 local ok,why=M.canUse(state,instance,card);assert(ok,why)
 assert(instance.uid==context.uid and context.zhongliPaid==nil,'duplicate or invalid Zhongli paid context')
 local playId=#assert(state.cardsPlayedThisCombat,'missing Zhongli accepted history')
 context.zhongliPaid={uid=instance.uid,turn=state.turn,playId=playId}
 return {{op='zhongliPaidStage',payload=Copy(effects[1]),uid=instance.uid,turn=state.turn,playId=playId}}
end
function M.dispatch(combat,state,e,queue)
 local context=assert(state.pendingPlay,'missing Zhongli pending use')
 local paid=assert(context.zhongliPaid,'missing Zhongli paid context')
 assert(state.characterCandidate=='zhongli'and state.experimentalMechanics and not state.originalV4
  and e.uid==paid.uid and e.turn==state.turn and e.turn==paid.turn and e.playId==paid.playId
  and not paid.completed,'stale Zhongli stage')
 assert(state.cardInUse and state.cardInUse.uid==paid.uid and context.uid==paid.uid,'wrong Zhongli paid instance')
 Dispatch.dispatch(combat,state,e.payload,queue);paid.completed=true
 return true
end
return M
