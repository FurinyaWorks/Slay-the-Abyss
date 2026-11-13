-- Explicit offline-candidate lifecycle only. No class/menu/catalog registration.
local Act3=require('abyss_act3_powers')
local Resource=require('abyss_keqing_resources')
local M={ownerEndIds={keqing_owner_end_probe=true}}
for id in pairs(Act3.ownerEndIds)do M.ownerEndIds[id]=true end
function M.active(state)
 if state.characterOwnerEnd==nil then return false end
 assert(state.characterOwnerEnd=='keqing'and state.experimentalMechanics==true
  and not state.originalV4,'unsupported candidate lifecycle')
 assert(state.player.statuses.keqing_owner_end_probe==1,'missing lifecycle marker')
 return true
end
function M.extension(state)
 return M.active(state)and M or Act3
end
function M.ownerEndPlan(state,id,amount)
 if id~='keqing_owner_end_probe'then return Act3.ownerEndPlan(state,id,amount)end
 assert(M.active(state)and amount==1,'invalid lifecycle marker')
 return {bottom={{op='keqingOwnerEnd',turn=state.turn}}}
end
function M.apply(state,effect)
 assert(M.active(state)and effect.turn==state.turn,'stale owner-end action')
 assert(state.keqingOwnerEndTurn~=effect.turn,'duplicate owner-end action')
 local nextResource=Resource.ownerEnd(state.keqingResource,effect.turn)
 state.keqingResource=nextResource;state.keqingOwnerEndTurn=effect.turn
 return true
end
return M
