-- Explicit candidate host only. Existing Act3 ordering remains delegated.
local Act3=require('abyss_act3_powers')
local Owner=require('abyss_xiao_owner_end')
local M={ownerEndIds={xiao_mask=true}}
for id in pairs(Act3.ownerEndIds)do M.ownerEndIds[id]=true end
function M.active(s)
 if s.characterCandidate~='xiao'then return false end
 assert(s.experimentalMechanics==true and not s.originalV4 and type(s.xiao)=='table'and getmetatable(s.xiao)==nil,'invalid Xiao lifecycle host')
 return true
end
function M.ownerEndPlan(s,id,n)
 if id~='xiao_mask'then return Act3.ownerEndPlan(s,id,n)end
 assert(M.active(s),'inactive Xiao owner')
 return Owner.ownerEndPlan(s,id,n)
end
function M.startActions(s)
 if not M.active(s)then return {}end
 return {{kind='effect',effect={op='xiaoStartEnergy',turn=s.turn}}}
end
function M.ownerEnd(combat,s,e,q)
 assert(M.active(s),'inactive Xiao owner')
 return Owner.apply(combat,s,e,q)
end
function M.startEnergy(combat,s,e)
 assert(M.active(s),'inactive Xiao start')
 return require('abyss_xiao_turn_start').apply(combat,s,e)
end
return M
