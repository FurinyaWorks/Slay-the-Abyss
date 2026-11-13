-- Pure plans + in-place effect dispatch. Host owns payment and snapshot rollback.
local L=require('experiments.characters.zhongli.native.lifecycle')
local Actors=require('abyss_actor')
local M={}
local function active(s)return Actors.isActive(s.player)and #s.enemies==1 and Actors.isActive(s.enemies[1])end
local function action(op,sequence)return {kind='effect',effect={op=op,sequence=sequence}}end
function M.plan(state)
 local z=L.validate(state)
 assert(not z.ownerEndPending,'owner-end continuation pending')
 assert(z.lastOwnerEnd<2147483646,'owner-end sequence overflow')
 return {action('zlOwnerEnd',z.lastOwnerEnd+1)}
end
function M.dispatch(state,e,queue)
 local z=L.validate(state)
 if e.op=='zlInstall' then
  -- Called only by the host's successful paid effect stage, never on play=true.
  L.applyInstall(state,e.power,e.value);return true
 end
 assert(type(e.sequence)=='number'and e.sequence%1==0 and e.sequence>=1 and e.sequence<=2147483646,'invalid owner-end token')
 if e.op=='zlOwnerEnd' then
  assert(not z.ownerEndPending and e.sequence==z.lastOwnerEnd+1,'duplicate owner-end')
  z.lastOwnerEnd=e.sequence
  if not active(state)then return true end
  z.ownerEndPending={sequence=e.sequence,stage='pillar'}
  -- LIFO pushTop: insert repair first, pulse second. Acquisition order irrelevant.
  queue.pushTop(state,action('zlRepair',e.sequence));queue.pushTop(state,action('zlPillar',e.sequence))
 elseif e.op=='zlPillar' then
  assert(z.ownerEndPending and z.ownerEndPending.sequence==e.sequence and z.ownerEndPending.stage=='pillar','invalid pillar continuation')
  z.ownerEndPending.stage='repair'
  if active(state)and(state.player.statuses.zl_candidate_pillar or 0)>0 then
   Actors.damage(state,state.player,state.enemies[1],state.player.statuses.zl_candidate_pillar,true)
  end
 elseif e.op=='zlRepair' then
  assert(z.ownerEndPending and z.ownerEndPending.sequence==e.sequence and z.ownerEndPending.stage=='repair','invalid repair continuation')
  if active(state)then z.jade=math.min(20,z.jade+(state.player.statuses.zl_candidate_repair or 0))end
  z.ownerEndPending=nil
 else error('unknown Zhongli queue effect')end
 L.validate(state);return true
end
return M
