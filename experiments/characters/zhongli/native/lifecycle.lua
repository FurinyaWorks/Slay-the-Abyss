-- Explicit offline driver. No shared registration, card dispatch or automatic hooks.
local Copy=require('abyss_copy')
local Actors=require('abyss_actor')
local Schedule=require('abyss_power_schedule')
local M={}
local ids={pillar='zl_candidate_pillar',repair='zl_candidate_repair'}
local function integer(n,lo,hi)return type(n)=='number'and n==n and n%1==0 and n>=lo and n<=hi end
local function alive(s)return Actors.isActive(s.player)and #s.enemies==1 and Actors.isActive(s.enemies[1])end
local function validate(s)
 assert(type(s)=='table'and type(s.zhongliCandidate)=='table','missing candidate lifecycle')
 local z=s.zhongliCandidate
 assert(integer(z.jade,0,20)and integer(z.lastOwnerEnd,0,2147483646),'invalid lifecycle state')
 assert(#s.enemies==1,'single-enemy prototype only')
 for kind,id in pairs(ids)do local value=s.player.statuses[id];if value==nil then value=0 end;assert(integer(value,0,kind=='pillar'and 6 or 3),'invalid candidate Power')end
 return z
end
function M.start(state,battleId,withRelic)
 assert(type(battleId)=='string'and #battleId>0 and type(withRelic)=='boolean','invalid lifecycle options')
 assert(not state.zhongliCandidate,'battle already initialized')
 assert(alive(state),'battle must be active and single-enemy')
 local s=Copy.copy(state)
 for _,id in pairs(ids)do assert(s.player.statuses[id]==nil,'stale candidate Power')end
 -- Definitions belong to this copied fixture, never the shared catalog.
 for _,id in pairs(ids)do s.player.statusDefinitions[id]={id=id,priority=5,stack='intensity',decay='none',kind='buff'}end
 s.zhongliCandidate={battleId=battleId,jade=withRelic and 3 or 0,lastOwnerEnd=0}
 validate(s);return s
end
-- Host must provide whole-command snapshot rollback for this in-place effect.
function M.applyInstall(s,kind,strength)
 validate(s);assert(alive(s),'inactive battle')
 local id=assert(ids[kind],'unknown candidate Power')
 assert(integer(strength,1,kind=='pillar'and 6 or 3),'invalid Power strength')
 local before=s.player.statuses[id]
 s.player.statuses[id]=math.max(before or 0,strength)
 Schedule.recordApplied(s,s.player,id,before)
 validate(s)
end
function M.install(state,kind,strength)
 local s=Copy.copy(state);M.applyInstall(s,kind,strength);return s
end
M.validate=validate
function M.removePillar(state)
 validate(state);assert(alive(state),'inactive battle')
 assert((state.player.statuses[ids.pillar]or 0)>0,'missing pillar')
 local s=Copy.copy(state);Schedule.remove(s,s.player,ids.pillar);s.player.statuses[ids.pillar]=nil
 validate(s);return s
end
function M.ownerEnd(state,sequence)
 local z=validate(state);assert(not z.ownerEndPending,'queued owner-end pending');assert(alive(state),'inactive battle')
 assert(integer(sequence,1,2147483646)and sequence==z.lastOwnerEnd+1,'duplicate or skipped owner-end')
 local s=Copy.copy(state);s.zhongliCandidate.lastOwnerEnd=sequence
 local pillar=s.player.statuses[ids.pillar]or 0
 -- Native fixed damage retains native Intangible, Block and reaction contracts.
 if pillar>0 then Actors.damage(s,s.player,s.enemies[1],pillar,true)end
 -- Actual native reactions can kill the player. Never repair either dead side.
 if alive(s)then s.zhongliCandidate.jade=math.min(20,s.zhongliCandidate.jade+(s.player.statuses[ids.repair]or 0))end
 validate(s);return s
end
return M
