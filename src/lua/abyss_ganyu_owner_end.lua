-- Explicit Ganyu candidate only: bank before discard, storm after discard.
local Resource=require('abyss_ganyu_resources')
local Presence=require('abyss_actor_presence')
local M={}
function M.active(state)
 if state.characterCandidate~='ganyu'then return false end
 assert(state.experimentalMechanics==true and not state.originalV4
  and type(state.ganyuRelicEnabled)=='boolean','invalid Ganyu lifecycle host')
 return true
end
function M.actions(state,phase)
 if not M.active(state)then return {}end
 assert(phase=='bank'or phase=='storm','unknown Ganyu owner-end phase')
 return {{kind='effect',effect={op='ganyuOwnerEnd',phase=phase,turn=state.turn}}}
end
function M.apply(_combat,state,effect,queue)
 assert(M.active(state)and effect.turn==state.turn and Presence.isActive(state.player),'stale Ganyu owner end')
 if effect.phase=='bank'then
  local plan=Resource.bankBeforeDiscard(state.ganyuResource,state.turn,state.energy,state.ganyuRelicEnabled)
  state.ganyuResource=plan.after
  -- Disabled starter relic must leave native retention (for example Ice Cream) intact.
  if state.ganyuRelicEnabled then state.energy=plan.energyAfter end
 elseif effect.phase=='storm'then
  local plan=Resource.stormAfterDiscard(state.ganyuResource,state.turn)
  state.ganyuResource=plan.after
  for i=#plan.afterDiscard,1,-1 do queue.pushTop(state,{kind='effect',effect=plan.afterDiscard[i]})end
 else error('unknown Ganyu owner-end phase')end
 return true
end
return M
