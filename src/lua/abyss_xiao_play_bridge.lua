-- Default first-eight factory plus explicitly requested exit candidates. No natural pool registration.
local Plan=require('abyss_xiao_card_plan')
local Data=require('abyss_xiao_core_data')
local Actors=require('abyss_actor')
local Copy=require('abyss_copy').copy
local M={}
local prefix='xiao_candidate_'
local allowed={};for i=1,8 do allowed[prefix..Data.cards[i].id]=Data.cards[i]end
for _,i in ipairs({9,11})do allowed[prefix..Data.cards[i].id]=Data.cards[i]end
local function upgraded(v)if v==nil then return false end;assert(type(v)=='boolean','invalid upgraded flag');return v end
local function resource(s)
 assert(type(s.xiao)=='table','missing Xiao resource')
 local mask=s.player.statuses.xiao_mask;if mask==nil then mask=0 end
 return {hp=s.player.hp,mask=mask,relicUsed=s.xiao.relicUsed,startingRelic=s.xiao.startingRelic}
end
local function definitions(indices)
 local out={}
 for _,i in ipairs(indices)do
  local c=Data.cards[i];local effects={}
  for _,up in ipairs({false,true})do
   effects[up and 2 or 1]=Plan.plan({hp=70,mask=0,relicUsed=false,startingRelic=true},{id=c.id,upgraded=up}).orderedEffects
  end
  out[#out+1]={id=prefix..c.id,name='HOLD '..c.id,type=c.kind,cost=c.cost,exhaust=c.exhaust,
   experimental=true,xiaoCandidate=true,target='NONE',effects=effects[1],upgrade={effects=effects[2]}}
 end
 return out
end
function M.definitions()return definitions({1,2,3,4,5,6,7,8})end
function M.additionalDefinitions()return definitions({9,11})end
function M.canUse(state,instance,targetIndex)
 local c=type(instance)=='table'and allowed[instance.cardId];if not c then return false,'unsupported_xiao_card'end
 local ok,plan=pcall(function()return Plan.plan(resource(state),{id=c.id,upgraded=upgraded(instance.upgraded)})end)
 if not ok then return false,'xiao_life_or_resource_prerequisite'end
 local mask=resource(state).mask
 for _,e in ipairs(plan.orderedEffects)do
  if e.kind=='damage'or e.kind=='plunge'and mask==0 then
   if not Actors.isActive(state.enemies[targetIndex])then return false,'invalid_target'end
  end
 end
 return true
end
-- Called only after shared consume/pending, never a substitute for payment.
function M.prepare(state,effect)
 local context=assert(state.pendingPlay,'missing paid context');local instance=assert(state.cardInUse,'missing resolving card')
 assert(allowed[instance.cardId],'unsupported resolving Xiao card')
 assert(context.uid==instance.uid and context.uid~=nil,'paid Xiao UID mismatch')
 local out=Copy(effect)
 if out.op=='xiaoCard'then out.uid=context.uid;out.targetId=context.targetId end
 return out
end
return M
