-- Explicit candidate adapter. Whole-command snapshot remains the host's responsibility.
local Act3=require('abyss_act3_powers')
local L=require('abyss_zhongli_lifecycle')
local Actors=require('abyss_actor')
local M={ownerEndIds={zl_candidate_pillar=true,zl_candidate_repair=true}}
for id in pairs(Act3.ownerEndIds)do M.ownerEndIds[id]=true end
function M.active(s)
 if s.characterCandidate~='zhongli'then return false end
 assert(s.experimentalMechanics==true and not s.originalV4,'invalid Zhongli lifecycle host')
 L.validate(s);return true
end
local function living(s)return Actors.isActive(s.player)and #s.enemies==1 and Actors.isActive(s.enemies[1])end
local function action(phase,sequence,turn)return {kind='effect',effect={op='zhongliOwnerEnd',phase=phase,sequence=sequence,turn=turn}}end
function M.ownerEndPlan(s,id,n)
 if id~='zl_candidate_pillar'and id~='zl_candidate_repair'then return Act3.ownerEndPlan(s,id,n)end
 assert(M.active(s),'inactive candidate')
 -- Anchor the pair to the pillar's schedule slot when present, never acquisition order.
 local anchor=(s.player.statuses.zl_candidate_pillar or 0)>0 and 'zl_candidate_pillar'or 'zl_candidate_repair'
 if id~=anchor then return {}end
 local z=s.zhongliCandidate
 assert(not z.ownerEndPending and z.lastOwnerEnd<2147483646,'pending/overflow owner end')
 return {bottom={action('begin',z.lastOwnerEnd+1,s.turn).effect}}
end
function M.cleanupAllowed(s,e)
 if type(e)~='table'or e.op~='zhongliOwnerEnd'or e.phase~='repair'or s.characterCandidate~='zhongli'then return false end
 local z=s.zhongliCandidate;local p=z and z.ownerEndPending
 return p~=nil and p.stage=='repair'and p.sequence==e.sequence and p.turn==e.turn and e.turn==s.turn
end
function M.apply(_combat,s,e,q)
 assert(M.active(s)and e.turn==s.turn,'stale Zhongli owner end')
 local z=s.zhongliCandidate
 assert(type(e.sequence)=='number'and e.sequence%1==0 and e.sequence>=1 and e.sequence<=2147483646,'invalid owner end token')
 if e.phase=='begin'then
  assert(not z.ownerEndPending and z.ownerEndTurn~=s.turn and e.sequence==z.lastOwnerEnd+1,'duplicate owner end')
  z.lastOwnerEnd=e.sequence;z.ownerEndTurn=s.turn
  if not living(s)then return true end
  z.ownerEndPending={sequence=e.sequence,turn=s.turn,stage='pillar'}
  q.pushTop(s,action('repair',e.sequence,s.turn));q.pushTop(s,action('pillar',e.sequence,s.turn))
 elseif e.phase=='pillar'then
  local p=z.ownerEndPending
  assert(p and p.sequence==e.sequence and p.turn==e.turn and p.stage=='pillar','invalid pillar continuation')
  p.stage='repair'
  if living(s)and(s.player.statuses.zl_candidate_pillar or 0)>0 then
   Actors.damage(s,s.player,s.enemies[1],s.player.statuses.zl_candidate_pillar,true)
  end
 elseif e.phase=='repair'then
  assert(M.cleanupAllowed(s,e),'invalid repair continuation')
  if living(s)then z.jade=math.min(20,z.jade+(s.player.statuses.zl_candidate_repair or 0))end
  z.ownerEndPending=nil
 else error('unknown Zhongli owner-end phase')end
 L.validate(s);return true
end
return M
