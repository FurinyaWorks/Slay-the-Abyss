-- Silent source-exclusive bottles, registered with the Silent runtime catalog.
local M={}
function M.register(data)
 local seen={};for _,p in ipairs(data.potions.potions)do seen[p.id]=true end
 for _,p in ipairs({
  {id='cunning_potion',name='狡诈药水',rarity='uncommon',effects={{op='silentShivs',value=3}}},
  {id='ghost_in_a_jar',name='瓶中幽灵',rarity='rare',effects={{op='silentGhost',value=1}}},
 })do if not seen[p.id]then data.potions.potions[#data.potions.potions+1]=p end end
 return data
end
-- The action owner supplies one lazy, call-local set of Shiv capabilities.
function M.shivs(state,n,shivHost)
 local host=shivHost()
 for _=1,n do
  local card=host.fresh(state);assert(host.canUpgrade(state,card),'missing upgraded Shiv')
  host.upgrade(state,card);host.created(state,card);host.created(state,card);host.toHand(state,card)
 end
end
return M
