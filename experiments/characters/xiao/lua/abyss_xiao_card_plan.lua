-- Pure first-eight-card proposal. Host owns cost, target, snapshots and effects.
local Data=require('abyss_xiao_core_data')
local M={supported={}}
local cards={};for _,c in ipairs(Data.cards)do cards[c.id]=c;M.supported[c.id]=true end
local function int(v,max)assert(type(v)=='number'and v==v and v%1==0 and v>=0 and v<=max,'invalid Xiao planning resource');return v end
local function copy(t)local out={};for k,v in pairs(t)do out[k]=type(v)=='table'and copy(v)or v end;return out end
function M.plan(resource,payload)
 assert(type(resource)=='table'and getmetatable(resource)==nil,'invalid resource')
 assert(type(payload)=='table'and getmetatable(payload)==nil,'invalid payload')
 int(resource.hp,2147483647);int(resource.mask,Data.maskRules.maxDuration)
 assert(type(resource.relicUsed)=='boolean'and type(resource.startingRelic)=='boolean','invalid relic flag')
 assert(type(payload.upgraded)=='boolean','upgrade must be boolean')
 local c=assert(cards[payload.id],'unsupported Xiao Lua card')
 local src=payload.upgraded and c.upgrade or c.base;local hpCost=0
 for _,e in ipairs(src)do if e.op=='loseHp'then hpCost=hpCost+e.value end end
 assert(resource.hp>hpCost,'life prerequisite')
 local effects={};local after={mask=resource.mask,relicUsed=resource.relicUsed}
 for _,e in ipairs(src)do
  if e.op=='mask'then
   effects[#effects+1]={op='xiaoCard',kind='maskCommit',value=e.value,requiresAlive=true}
   local entered=after.mask==0 and e.value>0;after.mask=e.value==0 and 0 or math.max(after.mask,e.value)
   if entered and resource.startingRelic and not after.relicUsed then after.relicUsed=true end
  elseif e.op=='plunge'then effects[#effects+1]={op='xiaoCard',kind='plunge',value=e.value}
  elseif e.op=='damage'then effects[#effects+1]={op='xiaoCard',kind='damage',value=e.value}
  else effects[#effects+1]=copy(e)end
 end
 return {id=c.id,cost=c.cost,kind=c.kind,exhaust=c.exhaust,lifePrerequisite=hpCost,
  orderedEffects=effects,expectedResourceAfterIfAlive=after,requiresHostTransaction=true,
  expectedOnly=true}
end
-- Initial relic effect must be consumed by successful actual 0->positive commit,
-- NOT by planning. Shared draw/death/hand-cap behavior remains host owned.
function M.maskCommit(resource,duration)
 int(duration,Data.maskRules.maxDuration);int(resource.mask,Data.maskRules.maxDuration);int(resource.hp,2147483647)
 assert(type(resource.relicUsed)=='boolean'and type(resource.startingRelic)=='boolean','invalid relic flag')
 if resource.hp==0 then return {mask=resource.mask,relicUsed=resource.relicUsed,effects={}}end
 local entered=resource.mask==0 and duration>0
 local out={mask=duration==0 and 0 or math.max(resource.mask,duration),relicUsed=resource.relicUsed,effects={}}
 if entered and resource.startingRelic and not resource.relicUsed then out.relicUsed=true;out.effects=copy(Data.startingRelic.effects)end
 return out
end
function M.startTurnPlan(state)
 assert(type(state)=='table'and type(state.xiao)=='table','missing Xiao turn resource')
 int(state.turn,2147483647);int(state.xiao.reservedEnergy,2147483647)
 if state.xiao.reservedEnergy==0 then return {}end
 return {{op='xiaoCard',kind='reservedEnergy',turn=state.turn}}
end
return M
