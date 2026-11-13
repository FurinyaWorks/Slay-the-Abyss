-- Candidate-only pure resource reducer. No Combat, queue, Actor or GUI imports.
-- The caller must dispatch exactly once AFTER a successful paid card resolves.
local M={}
local function integer(n,a,b)return type(n)=='number'and n%1==0 and n>=a and n<=b end
local function boolean(v)return type(v)=='boolean'end
local function valid(r)
 assert(type(r)=='table'and getmetatable(r)==nil,'invalid resources')
 for k in pairs(r)do assert(k=='infusion'or k=='wedgeUntil'or k=='relicEnabled'or k=='relicUsed'or k=='bonusPerHit'or k=='relicBlock','unknown resource field')end
 assert(integer(r.infusion,0,2)and boolean(r.relicEnabled)and boolean(r.relicUsed),'invalid resources')
 assert(integer(r.bonusPerHit,0,999)and integer(r.relicBlock,0,999),'invalid resource constants')
 assert(r.wedgeUntil==nil or integer(r.wedgeUntil,1,1000000),'invalid wedge')
end
local function copy(r)return{infusion=r.infusion,wedgeUntil=r.wedgeUntil,relicEnabled=r.relicEnabled,relicUsed=r.relicUsed,bonusPerHit=r.bonusPerHit,relicBlock=r.relicBlock}end
function M.new(enabled,constants)
 assert(boolean(enabled)and type(constants)=='table','invalid lifecycle configuration')
 local r={infusion=0,relicEnabled=enabled,relicUsed=false,bonusPerHit=constants.bonusPerHit,relicBlock=constants.relicBlock};valid(r);return r
end
function M.attackSnapshot(r)valid(r);return{bonusPerHit=r.infusion>0 and r.bonusPerHit or 0,hasWedge=r.wedgeUntil~=nil}end
function M.resolved(r,turn,isAttack,resourceEvent)
 valid(r);assert(integer(turn,1,999999)and boolean(isAttack),'invalid resolved card')
 assert(resourceEvent=='none'or resourceEvent=='setup'or resourceEvent=='recast'or resourceEvent=='detonate','invalid resource event')
 assert(not r.wedgeUntil or r.wedgeUntil>=turn and r.wedgeUntil<=turn+1,'stale wedge')
 assert(resourceEvent~='setup'or not r.wedgeUntil,'setup requires absent wedge')
 assert((resourceEvent~='recast'and resourceEvent~='detonate')or r.wedgeUntil,'consumption requires wedge')
 local out=copy(r);local effects={}
 if isAttack and out.infusion>0 then out.infusion=out.infusion-1 end
 if resourceEvent=='setup'then
  out.wedgeUntil=turn+1
  if out.relicEnabled and not out.relicUsed then
   out.relicUsed=true;effects[1]={op='block',value=r.relicBlock,fixed=true}
  end
 elseif resourceEvent=='recast'then out.wedgeUntil=nil;out.infusion=2
 elseif resourceEvent=='detonate'then out.wedgeUntil=nil end
 valid(out);return out,effects
end
-- This is a queued owner-end ACTION, not a public endTurn request callback.
-- Calling endTurn may pause before owner-end; do not call this at that entry.
function M.ownerEnd(r,turn)
 valid(r);assert(integer(turn,1,999999),'invalid owner turn')
 assert(not r.wedgeUntil or r.wedgeUntil>=turn and r.wedgeUntil<=turn+1,'stale wedge')
 local out=copy(r);out.infusion=0
 if out.wedgeUntil and out.wedgeUntil<=turn then out.wedgeUntil=nil end
 return out
end
return M
