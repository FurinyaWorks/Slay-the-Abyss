-- Offline host-seam proof, not a registered character or Combat callback.
-- Inject the pure reducer into the call-stack object, never saved state.
local M={}
function M.new(reducer)
 local base=require('abyss_act3_powers')
 assert(type(reducer)=='table'and type(reducer.ownerEnd)=='function','missing resource reducer')
 local id='keqing_owner_end_probe'
 local extension={ownerEndIds={[id]=true}}
 for power in pairs(base.ownerEndIds)do extension.ownerEndIds[power]=true end
 function extension.ownerEndPlan(state,power,amount)
  if power~=id then return base.ownerEndPlan(state,power,amount)end
  assert(power==id and amount==1 and state.player.statuses[id]==1,'invalid lifecycle marker')
  assert(type(state.keqingResource)=='table','missing Keqing resource')
  return {bottom={{op='keqingOwnerEndProbe',turn=state.turn}}}
 end
 function extension.apply(state,effect)
  assert(effect.op=='keqingOwnerEndProbe'and effect.turn==state.turn,'stale owner-end action')
  assert(state.keqingOwnerEndTurn~=effect.turn,'duplicate owner-end action')
  local nextResource=reducer.ownerEnd(state.keqingResource,effect.turn)
  state.keqingResource=nextResource;state.keqingOwnerEndTurn=effect.turn
  return true
 end
 return extension
end
return M
