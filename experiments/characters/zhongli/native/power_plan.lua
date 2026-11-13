local Copy=require('abyss_copy').copy
local catalog=require('experiments.characters.zhongli.native.power_plans')
local M={}
function M.plan(state,uid)
 assert(type(state)=='table'and type(state.hand)=='table','invalid plan state')
 assert(type(uid)=='string' or type(uid)=='number','invalid instance uid')
 assert(not state.actionQueue and not state.pendingChoice and not state.pendingPotionChoice and not state.pendingPlay and not state.pendingHandChoice and not state.pendingPileChoice and not state.pendingScry and not state.pendingDiscard,'unfinished host action')
 local instance
 for _,c in ipairs(state.hand)do if c.uid==uid then assert(not instance,'duplicate instance');instance=c end end
 assert(instance,'instance not in hand');assert(instance.upgraded==nil or type(instance.upgraded)=='boolean','invalid upgrade identity')
 local definition
 for _,c in ipairs(catalog)do if c.id==instance.cardId then definition=c end end
 assert(definition,'unsupported candidate Power')
 local actions={}
 for _,effect in ipairs(instance.upgraded and definition.upgraded or definition.base)do actions[#actions+1]={kind='effect',effect=Copy(effect)}end
 return {cardId=definition.id,uid=uid,type='power',baseCost=definition.cost,target=definition.target,
  actions=actions,approval='HOLD',requiresHostPayment=true,requiresHostTargetValidation=true,requiresHostPowerDisposition=true}
end
return M
