-- Opt-in paid bridge. KQ003 remains experimental: terminal resource policy is HOLD.
local Resources=require('abyss_keqing_resources')
local Lifecycle=require('abyss_character_owner_end')
local Planner=require('abyss_keqing_staged_plan')
local copy=require('abyss_copy').copy
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
 if card.keqingStage~=nil then
  if card.keqingStage~='003' or card.type~='attack' or card.target~='ENEMY' or #card.effects~=1
   or card.effects[1].op~='damage' then return false,'keqing_staged_card_unavailable'end
  for key in pairs(card.effects[1])do
   if key~='op'and key~='value'then return false,'keqing_staged_effect_unavailable'end
  end
 end
 return true
end
function M.prepare(state,card,effects,combat,target)
 if card.keqingCandidate==nil then return effects end
 local ok,why=M.canUse(state,card);assert(ok,why)
 local r=state.keqingResource;local snapshot=Resources.attackSnapshot(r)
 local context=assert(state.pendingPlay,'missing paid card context')
 assert(context.keqingPaid==nil,'duplicate paid card plan')
 context.keqingPaid={turn=state.turn,uid=context.uid,attack=card.type=='attack',infused=card.type=='attack'and r.infusion>0}
 if card.keqingStage=='003' then
  local instance=assert(state.cardInUse,'missing paid instance')
  assert(instance.uid==context.uid and target and target.id==context.targetId,'stale staged target')
  local up=instance.upgraded==true
  assert(card.effects[1].value==(up and 7 or 5),'invalid staged face')
  -- Accepted uses are recorded before prepare; snapshot rollback removes the record
  -- together with all its actions. A new use of the same UID has a new ordinal.
  local playId=#assert(state.cardsPlayedThisCombat,'missing accepted use history')
  local plan=Planner.plan({turn=state.turn,uid=instance.uid,playId=playId,upgraded=up,
   infusion=r.infusion,wedgeUntil=r.wedgeUntil},{base={setup=5,release=8,attacks=2},
   upgraded={setup=7,release=11,attacks=2},bonusPerHit=2})
  local paid=context.keqingPaid;paid.plan=plan;paid.cursor=1;paid.playId=playId
  local out={}
  for _,a in ipairs(plan.actions)do
   local e={op='keqingCardStage',action=copy(a),targetId=context.targetId}
   if a.op=='rawDamage'then
    local amount=a.value+plan.context.bonusPerHit
    e.payload={op='damage',value=amount,normalAmount=combat.attackAmount(state,state.player,target,amount),targetId=target.id}
   end
   out[#out+1]=e
  end
  return out
 end
 if card.type=='attack'and snapshot.bonusPerHit>0 then
  for _,e in ipairs(effects)do
   if e.op=='damage'or e.op=='damageAll'then e.value=e.value+snapshot.bonusPerHit end
  end
 end
 return effects
end
function M.dispatch(_combat,state,effect,queue)
 local context=assert(state.pendingPlay,'missing staged pending use')
 local paid=assert(context.keqingPaid,'missing staged paid context')
 local instance=assert(state.cardInUse,'missing staged limbo card')
 assert(Lifecycle.active(state) and instance.uid==context.uid and paid.uid==instance.uid
  and paid.turn==state.turn and not paid.completed and effect.targetId==context.targetId,'stale staged context')
 local plan=assert(paid.plan,'missing staged plan');local a=effect.action
 Planner.validateAction(a,plan.binding,paid.cursor)
 local expected=assert(plan.actions[paid.cursor],'staged action exhausted')
 for k,v in pairs(expected)do assert(a[k]==v,'mutated staged action')end
 if a.op=='rawDamage'then
  local payload=assert(effect.payload,'missing captured damage')
  assert(payload.op=='damage' and payload.targetId==context.targetId
   and payload.value==a.value+plan.context.bonusPerHit,'invalid staged damage')
  queue.pushTop(state,{kind='effect',effect=copy(payload)})
 elseif a.op=='consumeWedge'then
  assert(state.keqingResource.wedgeUntil,'missing wedge')
  state.keqingResource.wedgeUntil=nil
 elseif a.op=='setWedgeUntil'then
  assert(state.keqingResource.wedgeUntil==nil,'duplicate wedge setup')
  state.keqingResource.wedgeUntil=a.value;paid.didSetup=true
 elseif a.op=='deferInfusion'then paid.newInfusion=a.value end
 paid.cursor=paid.cursor+1
 return true
end
function M.complete(state,context,instance,queue)
 local paid=context.keqingPaid;if not paid then return end
 assert(Lifecycle.active(state)and paid.turn==state.turn and paid.uid==instance.uid,'stale paid card context')
 assert(not paid.completed,'duplicate paid card completion')
 -- Only an entry-time charge is consumed; new buffs never apply retroactively.
 if paid.infused then
  assert(state.keqingResource.infusion>0,'lost paid card infusion')
  state.keqingResource=Resources.resolved(state.keqingResource,state.turn,true,'none')
 end
 if paid.newInfusion then state.keqingResource.infusion=paid.newInfusion end
 if paid.didSetup and state.keqingResource.relicEnabled and not state.keqingResource.relicUsed then
  assert(queue,'missing relic queue')
  state.keqingResource.relicUsed=true
  queue.pushTop(state,{kind='effect',effect={op='block',value=state.keqingResource.relicBlock,fixed=true}})
 end
 paid.completed=true
end
return M
