-- Isolated first-eight plus x13/x14 effect adapter; not registered in shared dispatch.
local Plan=require('abyss_xiao_card_plan')
local Data=require('abyss_xiao_core_data')
local Actors=require('abyss_actor')
local Schedule=require('abyss_power_schedule')
local M={}
local function integer(v,max)assert(type(v)=='number'and v==v and v%1==0 and v>=0 and v<=(max or 2147483647),'invalid Xiao execution number');return v end
local function resource(state)
 local x=state.xiao;assert(type(x)=='table','missing Xiao combat resource')
 local mask=state.player.statuses.xiao_mask;if mask==nil then mask=0 end
 integer(mask,3);integer(state.player.hp)
 assert(type(x.relicUsed)=='boolean'and type(x.startingRelic)=='boolean','invalid Xiao relic flags')
 return {hp=state.player.hp,mask=mask,relicUsed=x.relicUsed,startingRelic=x.startingRelic}
end
function M.dispatch(combat,state,effect,queue)
 if effect.op~='xiaoCard'then return false end
 assert(effect.kind=='damage'or effect.kind=='plunge'or effect.kind=='maskCommit'or effect.kind=='maskBlock'or effect.kind=='maskGuard','unsupported Xiao executable kind')
 local paid=assert(state.pendingPlay,'no paid card context');local card=assert(state.cardInUse,'no resolving card')
 assert((type(paid.uid)=='string'and paid.uid~='')or(type(paid.uid)=='number'and paid.uid>0 and paid.uid%1==0),'invalid paid UID')
 assert(effect.uid==paid.uid and card.uid==paid.uid,'Xiao paid UID mismatch')
 assert(effect.targetId==nil or effect.targetId==paid.targetId,'Xiao target context mismatch')
 local r=resource(state);integer(effect.value,effect.kind=='maskCommit'and 3 or 2147483647)
 if r.hp==0 then return true end
 if effect.kind=='maskBlock'then
  queue.pushTop(state,{kind='effect',effect={op='block',value=Plan.maskBlock(r.mask,effect.value)}})
  return true
 end
 if effect.kind=='maskGuard'then
  local previous=state.player.statuses.xiao_mask_guard
  local before=previous;if before==nil then before=0 end
  Plan.addMaskGuard(before,effect.value) -- reject unsafe accumulation before mutation
  Actors.applyPower(state,state.player,'xiao_mask_guard',effect.value,state.player)
  Schedule.recordApplied(state,state.player,'xiao_mask_guard',previous)
  return true
 end
 if effect.kind=='maskCommit'then
  local patch=Plan.maskCommit(r,effect.value)
  if patch.mask==0 then
   Schedule.remove(state,state.player,'xiao_mask');state.player.statuses.xiao_mask=nil
  elseif r.mask==0 then
   Actors.applyPower(state,state.player,'xiao_mask',patch.mask,state.player)
   Schedule.recordApplied(state,state.player,'xiao_mask',nil)
  else state.player.statuses.xiao_mask=patch.mask end
  state.xiao.relicUsed=patch.relicUsed
  for i=#patch.effects,1,-1 do queue.pushTop(state,{kind='effect',effect=patch.effects[i]})end
  return true
 end
 local all=effect.kind=='plunge'and r.mask>0
 local target
 if not all then
  for _,enemy in ipairs(state.enemies)do if enemy.id==paid.targetId then target=enemy;break end end
  assert(target and Actors.isActive(target),'invalid Xiao living target')
 end
 local bonus=r.mask>0 and Data.maskRules.attackBonus or 0
 assert(effect.value<=2147483647-bonus,'Xiao attack overflow')
 -- Delegate actual damage, modifiers and reactions to the host queue.
 local native={op=all and 'damageAll'or 'damage',value=effect.value+bonus}
 if not all then native.targetId=target.id end
 queue.pushTop(state,{kind='effect',effect=native})
 return true
end
return M
