-- Paid endpoint extracted from reviewed 28dc5f81; host owns admission.
-- Dedicated paid-effect endpoint. Host owns admission, payment, UID and rollback.
local Lifecycle=require('abyss_zhongli_lifecycle')
local M={}
local kinds={installPillar='pillar',installRepair='repair'}
function M.dispatch(_combat,state,effect,_queue)
 assert(type(effect)=='table'and getmetatable(effect)==nil,'invalid Zhongli effect')
 for k in pairs(effect)do assert(k=='op'or k=='kind'or k=='value','unknown Zhongli effect field')end
 assert(effect.op=='zhongliCard'and kinds[effect.kind],'unsupported Zhongli effect')
 Lifecycle.applyInstall(state,kinds[effect.kind],effect.value)
 return true
end
return M
