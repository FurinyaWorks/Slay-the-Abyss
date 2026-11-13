-- Isolated first-eight plus x12-x15 effect adapter; not registered in shared dispatch.
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
 assert(effect.kind=='damage'or effect.kind=='plunge'or effect.kind=='maskCommit'or effect.kind=='maskBlock'or effect.kind=='maskGuard'or effect.kind=='damageAll'or effect.kind=='breakBlock'or effect.kind=='unmaskedDraw'or effect.kind=='exhaustDamage'or effect.kind=='exhaustBlock'or effect.kind=='shortenMask'or effect.kind=='exitGuard'or effect.kind=='spendEnergyBlock'or effect.kind=='spendBlockDraw'or effect.kind=='damageHits'or effect.kind=='blockDamage'or effect.kind=='enemyCountBlock'or effect.kind=='lastMaskDamage'or effect.kind=='exitEnergy'or effect.kind=='recoverExit'or effect.kind=='topdeckAttack'or effect.kind=='discardAttacksDraw'or effect.kind=='burnSkillsBlock'or effect.kind=='calmDraw'or effect.kind=='maskedAttackDraw'or effect.kind=='sequenceDamage'or effect.kind=='beforeAttackBlock','unsupported Xiao executable kind')
 local paid=assert(state.pendingPlay,'no paid card context');local card=assert(state.cardInUse,'no resolving card')
 assert((type(paid.uid)=='string'and paid.uid~='')or(type(paid.uid)=='number'and paid.uid>0 and paid.uid%1==0),'invalid paid UID')
 assert(effect.uid==paid.uid and card.uid==paid.uid,'Xiao paid UID mismatch')
 assert(effect.targetId==nil or effect.targetId==paid.targetId,'Xiao target context mismatch')
 local r=resource(state);integer(effect.value,effect.kind=='maskCommit'and 3 or 2147483647)
 if r.hp==0 then return true end
 local value=effect.value
 if effect.kind=='burnSkillsBlock'then
  local selected={}
  for _,instance in ipairs(state.hand)do
   if instance.uid~=paid.uid and combat.cardDefinition(state,instance).type=='skill'then selected[#selected+1]=instance end
  end
  local block=Plan.scaledCount(#selected,value)
  local actions=require('abyss_card_actions')
  for _,instance in ipairs(selected)do assert(actions.exhaust(combat,state,instance,state.hand),'stale Xiao skill fuel')end
  queue.pushTop(state,{kind='effect',effect={op='block',value=block}})
  return true
 end
 if effect.kind=='discardAttacksDraw'then
  local selected={}
  for _,instance in ipairs(state.hand)do
   if instance.uid~=paid.uid and combat.cardDefinition(state,instance).type=='attack'then selected[#selected+1]=instance end
  end
  assert(value<=2147483647-#selected,'Xiao discard draw overflow')
  for _,instance in ipairs(selected)do
   for i,c in ipairs(state.hand)do if c==instance then table.remove(state.hand,i);break end end
   state.discard[#state.discard+1]=instance
   require('abyss_events').emit(state,'discard',{uid=instance.uid,cardId=instance.cardId,manual=true})
  end
  if #selected>0 then queue.pushTop(state,{kind='effect',effect={op='draw',value=#selected+value}})end
  return true
 end
 if effect.kind=='recoverExit'or effect.kind=='topdeckAttack'then
  assert(value==1,'unsupported recovery count')
  if effect.kind=='recoverExit'and #state.hand>=state.rules.player.maxHand then return true end
  for i,instance in ipairs(state.discard)do
   local definition=combat.cardDefinition(state,instance);local matches=effect.kind=='topdeckAttack'and definition.type=='attack'
   if effect.kind=='recoverExit'then
    for _,e in ipairs(definition.effects)do if e.op=='xiaoCard'and e.kind=='maskCommit'and e.value==0 then matches=true;break end end
   end
   if matches and instance.uid~=paid.uid then
    table.remove(state.discard,i)
    if effect.kind=='recoverExit'then
     require('abyss_card_actions').toHand(state,instance)
     require('abyss_events').emit(state,'recover',{uid=instance.uid,cardId=instance.cardId})
    else state.draw[#state.draw+1]=instance end
    break
   end
  end
  return true
 end
 if effect.kind=='sequenceDamage'or effect.kind=='beforeAttackBlock'then
  local count=require('abyss_xiao_attack_finish').attackCount(state);integer(effect.bonus)
  local extra
  if effect.kind=='sequenceDamage'then integer(effect.cap);extra=Plan.scaledCount(math.min(count,effect.cap),effect.bonus)
  else extra=count==0 and effect.bonus or 0 end
  assert(value<=2147483647-extra,'Xiao sequence output overflow');value=value+extra
  if effect.kind=='beforeAttackBlock'then queue.pushTop(state,{kind='effect',effect={op='block',value=value}});return true end
 end
 if effect.kind=='lastMaskDamage'then value=Plan.lastMaskDamage(r.mask,value,effect.bonus)end
 if effect.kind=='blockDamage'then
  integer(state.player.block);integer(effect.cap);value=Plan.scaledCount(state.player.block,value,effect.cap)
 end
 if effect.kind=='enemyCountBlock'then
  local live=0;for _,enemy in ipairs(state.enemies)do if Actors.isActive(enemy)then live=live+1 end end
  local block=Plan.enemyCountBlock(live,value,effect.cap)
  queue.pushTop(state,{kind='effect',effect={op='block',value=block}});return true
 end
 if effect.kind=='spendEnergyBlock'then
  integer(state.energy);local block=Plan.scaledCount(state.energy,value)
  state.energy=0;queue.pushTop(state,{kind='effect',effect={op='block',value=block}});return true
 end
 if effect.kind=='spendBlockDraw'then
  local patch=Plan.spendBlockDraw(state.player.block,value,effect.cap)
  state.player.block=patch.block
  queue.pushTop(state,{kind='effect',effect={op='draw',value=patch.draw}});return true
 end
 if effect.kind=='unmaskedDraw'then
  if r.mask==0 then queue.pushTop(state,{kind='effect',effect={op='draw',value=value}})end
  return true
 end
 if effect.kind=='exhaustDamage'or effect.kind=='exhaustBlock'then
  local pile=state.exhaust;assert(type(pile)=='table'and getmetatable(pile)==nil,'invalid exhaust pile')
  local count=0;for k in pairs(pile)do integer(k);assert(k>=1,'invalid exhaust index');count=count+1 end
  for i=1,count do assert(type(pile[i])=='table','sparse exhaust pile')end
  integer(effect.cap);value=Plan.scaledCount(count,value,effect.cap)
  if effect.kind=='exhaustBlock'then queue.pushTop(state,{kind='effect',effect={op='block',value=value}});return true end
 end
 if effect.kind=='maskBlock'then
  queue.pushTop(state,{kind='effect',effect={op='block',value=Plan.maskBlock(r.mask,effect.value)}})
  return true
 end
 if effect.kind=='maskGuard'or effect.kind=='exitGuard'or effect.kind=='calmDraw'or effect.kind=='maskedAttackDraw'then
  local status=effect.kind=='maskGuard'and 'xiao_mask_guard'or effect.kind=='calmDraw'and 'xiao_calm_draw'or effect.kind=='maskedAttackDraw'and 'xiao_masked_attack_draw'or 'xiao_exit_guard'
  local previous=state.player.statuses[status]
  local before=previous;if before==nil then before=0 end
  Plan.addMaskGuard(before,effect.value) -- reject unsafe accumulation before mutation
  Actors.applyPower(state,state.player,status,effect.value,state.player)
  Schedule.recordApplied(state,state.player,status,previous)
  return true
 end
 if effect.kind=='maskCommit'or effect.kind=='shortenMask'or effect.kind=='exitEnergy'then
  local duration=effect.kind=='exitEnergy'and 0 or effect.kind=='shortenMask'and Plan.shortenMask(r.mask,effect.value).mask or effect.value
  local patch=effect.kind=='shortenMask'and {mask=duration,relicUsed=r.relicUsed,effects={}}or Plan.maskCommit(r,duration)
  local exitGuard=state.player.statuses.xiao_exit_guard;if exitGuard==nil then exitGuard=0 end
  integer(exitGuard)
  if r.mask>0 and patch.mask==0 and exitGuard>0 then patch.effects[#patch.effects+1]={op='block',value=exitGuard}end
  if effect.kind=='exitEnergy'and r.mask>0 then
   integer(state.energy);assert(effect.value<=2147483647-state.energy,'Xiao exit energy overflow')
   patch.effects[#patch.effects+1]={op='energy',value=effect.value}
  end
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
 local all=effect.kind=='damageAll'or effect.kind=='plunge'and r.mask>0
 local target
 if not all then
  for _,enemy in ipairs(state.enemies)do if enemy.id==paid.targetId then target=enemy;break end end
  assert(target and Actors.isActive(target),'invalid Xiao living target')
 end
 if effect.kind=='breakBlock'then target.block=0;return true end
 local bonus=r.mask>0 and Data.maskRules.attackBonus or 0
 assert(value<=2147483647-bonus,'Xiao attack overflow')
 -- Delegate actual damage, modifiers and reactions to the host queue.
 local native={op=all and 'damageAll'or 'damage',value=value+bonus}
 if effect.kind=='damageHits'then integer(effect.hits,2);assert(effect.hits>=1,'empty hit count');native.times=effect.hits end
 if not all then native.targetId=target.id end
 queue.pushTop(state,{kind='effect',effect=native})
 return true
end
return M
