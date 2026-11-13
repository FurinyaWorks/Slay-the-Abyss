-- Paid-only first-eight candidate boundary. No owner-end or turn-start activation.
local Bridge=require('abyss_xiao_play_bridge')
local Dispatch=require('abyss_xiao_dispatch')
local Presence=require('abyss_actor_presence')
local M={}
local canonical={}
for _,d in ipairs(Bridge.definitions())do
 if d.id=='xiao_candidate_x01'or d.id=='xiao_candidate_x02'or d.id=='xiao_candidate_x04'or d.id=='xiao_candidate_x05'or d.id=='xiao_candidate_x06'or d.id=='xiao_candidate_x03'or d.id=='xiao_candidate_x07'or d.id=='xiao_candidate_x08'then canonical[d.id]=d end
end
for _,d in ipairs(Bridge.additionalDefinitions())do canonical[d.id]=d end
local function same(a,b)
 if type(a)~='table'or type(b)~='table'then return a==b end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end
 return true
end
function M.supports(e)
 if type(e)~='table'or getmetatable(e)or e.op~='xiaoCard'
  or e.kind~='unmaskedDraw'and e.kind~='exhaustDamage'and e.kind~='exhaustBlock'and e.kind~='maskBlock'and e.kind~='breakBlock'and e.kind~='damage'and e.kind~='damageAll'and e.kind~='plunge'and e.kind~='maskCommit'then return false end
 for k in pairs(e)do if k~='op'and k~='kind'and k~='value'and not(k=='cap'and(e.kind=='exhaustDamage'or e.kind=='exhaustBlock'))and not(k=='requiresAlive'and e.kind=='maskCommit'and e.requiresAlive==true)then return false end end
 if e.kind=='exhaustDamage'or e.kind=='exhaustBlock'then if type(e.cap)~='number'or e.cap%1~=0 or e.cap<0 or e.cap>2147483647 then return false end end
 return type(e.value)=='number'and e.value%1==0 and e.value>=0 and e.value<=2147483647
end
function M.canUse(state,instance,card,targetIndex)
 if card.xiaoCandidate==nil then
  if canonical[instance.cardId]then return false,'unmarked_xiao_card'end
  for _,e in ipairs(card.effects)do if e.op=='xiaoCard'then return false,'unmarked_xiao_card'end end
  return true
 end
 local c=canonical[instance.cardId]
 if card.xiaoCandidate~=true or not c or state.characterCandidate~='xiao' or state.experimentalMechanics~=true
  or state.originalV4 or card.experimental~=true or card.originalV4 or card.runNativeABI or card.silentFinalCard
  or card.costMode or card.keqingCandidate~=nil or card.ganyuCandidate~=nil
  or card.type~=c.type or card.target~=c.target
  or card.exhaust~=c.exhaust
  or not same(card.effects,instance.upgraded and c.upgrade.effects or c.effects)then return false,'xiao_candidate_unavailable'end
 if (instance.cardId=='xiao_candidate_x01'or instance.cardId=='xiao_candidate_x03'or instance.cardId=='xiao_candidate_x07'or instance.cardId=='xiao_candidate_x11'or instance.cardId=='xiao_candidate_x15'or instance.cardId=='xiao_candidate_x21')and not Presence.isActive(state.enemies[targetIndex])then return false,'invalid_target'end
 return Bridge.canUse(state,instance,targetIndex)
end
function M.prepare(state,card,effects,target)
 if card.xiaoCandidate==nil then return effects end
 local context=assert(state.pendingPlay,'missing Xiao pending use')
 local instance=assert(state.cardInUse,'missing Xiao limbo')
 local index;for i,enemy in ipairs(state.enemies)do if rawequal(enemy,target)then index=i end end
 local ok,why=M.canUse(state,instance,card,index);assert(ok,why)
 assert(context.xiaoPaid==nil,'duplicate Xiao prepare')
 local playId=#assert(state.cardsPlayedThisCombat,'missing Xiao accepted history')
 context.xiaoPaid={uid=instance.uid,turn=state.turn,playId=playId,cursor=1}
 local out={};local step=0
 for _,e in ipairs(effects)do
  if e.op=='xiaoCard'then
   step=step+1
   out[#out+1]={op='xiaoPaidStage',payload=Bridge.prepare(state,e),uid=instance.uid,
    turn=state.turn,playId=playId,step=step}
  else out[#out+1]=e end
 end
 return out
end
function M.dispatch(combat,state,e,queue)
 local context=assert(state.pendingPlay,'missing Xiao use')
 local paid=assert(context.xiaoPaid,'missing Xiao paid context')
 assert(state.characterCandidate=='xiao'and state.experimentalMechanics and not state.originalV4
  and e.uid==paid.uid and e.turn==state.turn and e.turn==paid.turn and e.playId==paid.playId
  and e.step==paid.cursor,'stale Xiao stage')
 assert(state.cardInUse and state.cardInUse.uid==paid.uid and context.uid==paid.uid,'wrong Xiao paid instance')
 -- A target invalidated by an earlier queued action is skipped, as native damage
 -- is. Never roll back a paid card simply because a previous reaction killed it.
 assert(type(e.payload)=='table'and e.payload.op=='xiaoCard'and e.payload.uid==paid.uid
  and(e.payload.targetId==nil or e.payload.targetId==context.targetId),'wrong Xiao stage payload')
 local skip=false
 if e.payload.kind=='exhaustDamage'or e.payload.kind=='breakBlock'or e.payload.kind=='damage'or e.payload.kind=='plunge'and(state.player.statuses.xiao_mask or 0)==0 then
  local target;for _,enemy in ipairs(state.enemies)do if enemy.id==context.targetId then target=enemy end end
  skip=not Presence.isActive(target)
 end
 if not skip then assert(Dispatch.dispatch(combat,state,e.payload,queue),'unhandled Xiao stage')end
 paid.cursor=paid.cursor+1
 return true
end
return M
