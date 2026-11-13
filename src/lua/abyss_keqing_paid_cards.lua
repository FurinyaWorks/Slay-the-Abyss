-- Opt-in paid bridge. KQ003/004 remain experimental: terminal resource policy is HOLD.
local Resources=require('abyss_keqing_resources')
local Lifecycle=require('abyss_character_owner_end')
local Planner=require('abyss_keqing_staged_plan')
local Finisher=require('abyss_keqing_finisher_plan')
local copy=require('abyss_copy').copy
local function same(a,b)
 if type(a)~='table'or type(b)~='table'then return a==b end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end
 return true
end
local M={}
local allowed={damage=true,damageAll=true,block=true,scry=true,keqingDiscard=true,keqingInspect=true}
function M.supportsDiscard(e)
 if type(e)~='table'or getmetatable(e)or e.op~='keqingDiscard'or(e.value~=4 and e.value~=7)then return false end
 for key in pairs(e)do if key~='op'and key~='value'then return false end end
 return true
end
function M.supportsInspect(e)
 if type(e)~='table'or getmetatable(e)or e.op~='keqingInspect'or(e.value~=3 and e.value~=4)then return false end
 for key in pairs(e)do if key~='op'and key~='value'then return false end end
 return true
end
function M.canUse(state,card)
 if card.keqingCandidate==nil then
  for _,e in ipairs(card.effects)do if e.op=='keqingDiscard'or e.op=='keqingInspect'then return false,'unmarked_keqing_choice'end end
  if state.characterOwnerEnd=='keqing'and card.type=='attack'then return false,'keqing_candidate_effect_unavailable'end
  return true
 end
 if card.keqingCandidate~=true or not Lifecycle.active(state)or card.experimental~=true
  or card.runNativeABI or card.originalV4 or card.silentFinalCard or card.costMode
  or card.type~='attack'and card.type~='skill'then return false,'keqing_candidate_unavailable'end
 for _,e in ipairs(card.effects)do
  if not allowed[e.op]or e.times=='X'then return false,'keqing_candidate_effect_unavailable'end
 end
 if card.keqingStage=='044'then
  if card.type~='skill'or card.target~='SELF'or card.exhaust~=true or #card.effects~=1 or not M.supportsInspect(card.effects[1])then return false,'keqing_inspect_unavailable'end
  return true
 end
 for _,e in ipairs(card.effects)do if e.op=='keqingInspect'then return false,'missing_keqing_inspect_stage'end end
 if card.keqingStage=='043'then
  if card.type~='skill'or card.target~='SELF'or #card.effects~=1 or not M.supportsDiscard(card.effects[1])then return false,'keqing_discard_unavailable'end
  return true
 end
 for _,e in ipairs(card.effects)do if e.op=='keqingDiscard'then return false,'missing_keqing_discard_stage'end end
 if card.keqingStage~=nil then
  if card.keqingStage~='003'and card.keqingStage~='004' or card.type~='attack' or card.target~='ENEMY' or #card.effects~=1
   or card.effects[1].op~='damage' then return false,'keqing_staged_card_unavailable'end
  for key in pairs(card.effects[1])do
   if key~='op'and key~='value'and not(card.keqingStage=='004'and key=='times'and card.effects[1].times==2)then return false,'keqing_staged_effect_unavailable'end
  end
  if card.keqingStage=='004'and card.effects[1].times~=2 then return false,'keqing_finisher_hits_unavailable'end
 end
 return true
end
function M.inspect(state,e)
 local p=assert(state.pendingPlay,'missing inspect paid context');local paid=assert(p.keqingPaid,'missing paid inspect plan')
 assert(Lifecycle.active(state)and state.cardInUse and state.cardInUse.uid==p.uid and p.uid==e.uid
  and paid.uid==e.uid and paid.turn==state.turn and e.turn==state.turn and e.playId==paid.playId
  and e.value==paid.inspectWindow and not paid.inspectStarted,'stale inspect stage')
 paid.inspectStarted=true
 return require('abyss_pile_choice').begin(state,'keqingInspect',1,state.combatGeneration or 0,nil,e.value)
end
function M.prepare(state,card,effects,combat,target)
 if card.keqingCandidate==nil then return effects end
 local ok,why=M.canUse(state,card);assert(ok,why)
 local r=state.keqingResource;local snapshot=Resources.attackSnapshot(r)
 local context=assert(state.pendingPlay,'missing paid card context')
 assert(context.keqingPaid==nil,'duplicate paid card plan')
 context.keqingPaid={turn=state.turn,uid=context.uid,attack=card.type=='attack',infused=card.type=='attack'and r.infusion>0}
 if card.keqingStage=='044'then
  local instance=assert(state.cardInUse,'missing paid inspect instance')
  assert(instance.uid==context.uid and card.effects[1].value==(instance.upgraded and 4 or 3),'invalid inspect face')
  local paid=context.keqingPaid;paid.inspectWindow=card.effects[1].value;paid.playId=#state.cardsPlayedThisCombat
  return {{op='keqingInspectStage',value=paid.inspectWindow,uid=context.uid,turn=state.turn,playId=paid.playId}}
 end
 if card.keqingStage=='043'then
  local instance=assert(state.cardInUse,'missing paid discard instance')
  assert(instance.uid==context.uid and card.effects[1].value==(instance.upgraded and 7 or 4),'invalid discard face')
  -- Normal queued preparation captures block modifiers before the reveal.
  -- The native requestDiscard owns the non-cancellable choice and continuation.
  return {{op='draw',value=1},{op='requestDiscard',value=1},{op='block',value=card.effects[1].value}}
 end
 if card.keqingStage=='003'or card.keqingStage=='004'then
  local instance=assert(state.cardInUse,'missing paid instance')
  assert(instance.uid==context.uid and target and target.id==context.targetId,'stale staged target')
  local up=instance.upgraded==true
  local finisher=card.keqingStage=='004'
  assert(card.effects[1].value==(finisher and(up and 5 or 4)or(up and 7 or 5)),'invalid staged face')
  -- Accepted uses are recorded before prepare; snapshot rollback removes the record
  -- together with all its actions. A new use of the same UID has a new ordinal.
  local playId=#assert(state.cardsPlayedThisCombat,'missing accepted use history')
  local input={turn=state.turn,uid=instance.uid,playId=playId,upgraded=up,infusion=r.infusion,wedgeUntil=r.wedgeUntil}
  local contract={base={setup=5,release=8,attacks=2},upgraded={setup=7,release=11,attacks=2},bonusPerHit=2}
  local plan
  if finisher then
   contract.finisher={base={hit=4,burst=4},upgraded={hit=5,burst=6}};plan=Finisher.plan(input,contract)
  else plan=Planner.plan(input,contract)end
  local paid=context.keqingPaid;paid.plan=plan;paid.cursor=1;paid.playId=playId;paid.finisher=finisher;paid.captures={}
  local out={}
  for _,a in ipairs(plan.actions)do
   local e={op='keqingCardStage',action=copy(a),targetId=context.targetId}
   if a.op=='rawDamage'or a.op=='rawTargetHit'then
    local amount=a.value+plan.context.bonusPerHit
    e.payload={op='damage',value=amount,normalAmount=combat.attackAmount(state,state.player,target,amount),targetId=target.id}
   elseif a.op=='currentWedgeBurstGate'then
    local amount=a.value+plan.context.bonusPerHit
    e.payload={op='damageAll',value=amount,normalAmounts={}}
    for _,enemy in ipairs(state.enemies)do e.payload.normalAmounts[enemy.id]=combat.attackAmount(state,state.player,enemy,amount)end
   end
   if e.payload then paid.captures[a.step]=copy(e.payload)end
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
 local expected=assert(plan.actions[paid.cursor],'staged action exhausted')
 assert(same(a,expected),'mutated staged action')
 if paid.finisher then
  Planner.validateAction({op='rawDamage',value=0,turn=a.turn,uid=a.uid,playId=a.playId,step=1},plan.binding,1)
 else Planner.validateAction(a,plan.binding,paid.cursor)end
 if effect.payload then assert(same(effect.payload,paid.captures[a.step]),'mutated captured payload')end
 if a.op=='rawDamage'or a.op=='rawTargetHit'then
  local payload=assert(effect.payload,'missing captured damage')
  assert(payload.op=='damage' and payload.targetId==context.targetId
   and payload.value==a.value+plan.context.bonusPerHit,'invalid staged damage')
  queue.pushTop(state,{kind='effect',effect=copy(payload)})
 elseif a.op=='currentWedgeBurstGate'then
  local actions=Finisher.gate(a,plan.binding,state.keqingResource.wedgeUntil)
  if #actions>0 then
   assert(effect.payload and effect.payload.op=='damageAll','missing captured burst')
   state.keqingResource.wedgeUntil=nil
   queue.pushTop(state,{kind='effect',effect=copy(effect.payload)})
  end
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
