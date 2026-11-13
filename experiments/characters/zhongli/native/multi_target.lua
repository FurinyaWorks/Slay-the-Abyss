-- Target identity feasibility only; no shared paid admission or retarget policy.
local Presence=require('abyss_actor_presence')
local M={}
local function enemies(s)
 assert(type(s)=='table'and Presence.isActive(s.player),'inactive player')
 assert(type(s.enemies)=='table'and #s.enemies>0,'missing enemies')
 local ids,count={},0
 for k,e in pairs(s.enemies)do
  assert(type(k)=='number'and k%1==0 and k>=1 and k<=#s.enemies and type(e)=='table','invalid enemy list')
  assert(type(e.id)=='string'and #e.id>0 and not ids[e.id],'ambiguous enemy identity');ids[e.id]=true;count=count+1
 end
 assert(count==#s.enemies,'sparse enemies');return s.enemies
end
function M.select(s,index)
 local list=enemies(s)
 assert(type(index)=='number'and index%1==0 and index>=1 and index<=#list,'invalid selected target')
 local e=list[index];assert(Presence.isActive(e),'inactive selected target')
 return {targetId=e.id}
end
function M.resolve(s,binding)
 local list=enemies(s)
 assert(type(binding)=='table'and getmetatable(binding)==nil,'invalid target binding')
 for k in pairs(binding)do assert(k=='targetId','unknown target binding field')end
 assert(type(binding.targetId)=='string','missing target identity')
 for _,e in ipairs(list)do if e.id==binding.targetId then assert(Presence.isActive(e),'selected target no longer active');return e end end
 error('selected target absent')
end
return M
