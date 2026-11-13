-- Dedicated paid-effect endpoint. Host owns admission, payment, UID and rollback.
local Lifecycle=require('experiments.characters.zhongli.native.lifecycle')
local M={}
local kinds={installPillar='pillar',installRepair='repair'}
function M.dispatch(_combat,state,effect,_queue)
 assert(type(effect)=='table'and getmetatable(effect)==nil,'invalid Zhongli effect')
 for k in pairs(effect)do assert(k=='op'or k=='kind'or k=='value','unknown Zhongli effect field')end
 assert(effect.op=='zhongliCard'and kinds[effect.kind],'unsupported Zhongli effect')
 Lifecycle.applyInstall(state,kinds[effect.kind],effect.value)
 return true
end
-- Role preflight only. Shared Combat still checks dynamic cost, target and turn.
function M.prepare(state,uid)
 Lifecycle.validate(state)
 local Actors=require('abyss_actor')
 assert(Actors.isActive(state.player)and #state.enemies==1 and Actors.isActive(state.enemies[1]),'inactive candidate battle')
 local plan=require('experiments.characters.zhongli.native.power_plan').plan(state,uid)
 local definitions=require('experiments.characters.zhongli.native.power_candidates')
 local definition
 for _,d in ipairs(definitions)do if d.id==plan.cardId then definition=require('abyss_copy').copy(d)end end
 assert(definition,'missing Power candidate')
 local instance
 for _,c in ipairs(state.hand)do if c.uid==uid then instance=c end end
 local upgraded=instance.upgraded==true
 return {uid=uid,cardId=plan.cardId,upgraded=upgraded,definition=definition,
  effects=require('abyss_copy').copy(upgraded and definition.upgrade.effects or definition.effects)}
end
function M.canUse(state,uid)
 local ok,result=pcall(M.prepare,state,uid)
 return ok,ok and nil or result
end
return M
