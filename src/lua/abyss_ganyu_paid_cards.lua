-- Explicit 03/05/06 paid vertical slices; formal registration remains disabled.
local R=require('abyss_ganyu_resources')
local Queued=require('abyss_ganyu_queued_card')
local Storm=require('abyss_ganyu_storm_card')
local Copy=require('abyss_copy').copy
local Presence=require('abyss_actor_presence')
local Native=require('abyss_ganyu_native_cards')
local M={}
local function same(a,b)
 if type(a)~='table'or type(b)~='table'then return a==b end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end;return true
end
function M.supportsStorm(e)
 if type(e)~='table'or getmetatable(e)or e.op~='ganyuStorm'or(e.amount~=4 and e.amount~=6)or e.turns~=2 then return false end
 for k in pairs(e)do if k~='op'and k~='amount'and k~='turns'then return false end end
 return true
end
function M.supports(e)
 if M.supportsStorm(e)then return true end
 if type(e)~='table' or getmetatable(e) or e.op~='ganyuCard'then return false end
 local allowed=e.kind=='charge'and {op=true,kind=true,amount=true}
  or e.kind=='chargedShot'and {op=true,kind=true,direct=true,bloom=true}
 if not allowed then return false end
 for k in pairs(e)do if not allowed[k]then return false end end
 return pcall(R.plan,R.initial(),e.kind=='charge'and {op='charge',amount=e.amount}
  or {op='charged_shot',direct=e.direct,bloom=e.bloom})
end
function M.canUse(state,card,targetIndex,instance)
 if card.ganyuNativeCandidate~=nil or instance and Native.known(instance.cardId)then return Native.canUse(state,instance,card,targetIndex)end
 if card.ganyuCandidate==nil then
  for _,e in ipairs(card.effects)do if e.op=='ganyuCard'or e.op=='ganyuStorm'then return false,'unmarked_ganyu_card'end end
  return true
 end
 if card.ganyuCandidate~=true or state.characterCandidate~='ganyu' or state.experimentalMechanics~=true
  or state.originalV4 or card.experimental~=true or card.runNativeABI or card.originalV4
  or card.silentFinalCard or card.costMode or card.keqingCandidate~=nil
  or #card.effects~=1 or not M.supports(card.effects[1])then return false,'ganyu_candidate_unavailable'end
 local shot=card.effects[1].kind=='chargedShot'
 if shot then
  if card.type~='attack' or card.target~='ENEMY' or not Presence.isActive(state.enemies[targetIndex])then return false,'invalid_target'end
 elseif card.type~='skill' or card.target~='SELF'then return false,'ganyu_candidate_unavailable'end
 return true
end
function M.prepare(combat,state,card,effects,target)
 if card.ganyuCandidate==nil then return effects end
 local context=assert(state.pendingPlay,'missing Ganyu pending use')
 local index;for i,enemy in ipairs(state.enemies)do if rawequal(enemy,target)then index=i end end
 local ok,why=M.canUse(state,card,index,state.cardInUse);assert(ok,why)
 assert(context.ganyuPaid==nil,'duplicate Ganyu preparation')
 if card.ganyuNativeCandidate then
  assert(state.cardInUse and state.cardInUse.uid==context.uid,'invalid Ganyu native paid identity')
  context.ganyuPaid={uid=context.uid,turn=state.turn,playId=#state.cardsPlayedThisCombat,native=true}
  return effects
 end
 local storm=effects[1].op=='ganyuStorm'
 if storm then assert(effects[1].amount==(state.cardInUse.upgraded and 6 or 4),'invalid storm face')end
 local e=storm and Storm.prepare(combat,state,effects[1],context.uid)or Queued.prepare(combat,state,effects[1],target,context.uid)
 local playId=#assert(state.cardsPlayedThisCombat,'missing Ganyu accepted use history')
 context.ganyuPaid={uid=context.uid,turn=state.turn,playId=playId,payload=Copy(e),storm=storm}
 return {{op='ganyuPaidStage',payload=e,uid=context.uid,turn=state.turn,playId=playId}}
end
function M.dispatch(combat,state,e,queue)
 local context=assert(state.pendingPlay,'missing Ganyu use')
 local paid=assert(context.ganyuPaid,'missing Ganyu paid context')
 assert(state.characterCandidate=='ganyu' and state.experimentalMechanics and not state.originalV4
  and e.uid==paid.uid and e.turn==paid.turn and e.turn==state.turn and e.playId==paid.playId
  and not paid.completed,'stale Ganyu stage')
 assert(same(e.payload,paid.payload),'mutated Ganyu paid effect')
 if paid.storm then Storm.dispatch(combat,state,e.payload,queue)else Queued.dispatch(combat,state,e.payload,queue)end
 paid.completed=true
 return true
end
return M
