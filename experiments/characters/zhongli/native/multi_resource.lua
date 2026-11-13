-- Isolated multi-enemy storage endpoint only. Does NOT initialize a battle,
-- install/target a pillar, admit a paid card or relax the shared Run gate.
local L=require('experiments.characters.zhongli.native.lifecycle')
local Actors=require('abyss_actor')
local M={}
local function check(s,kind,value)
 local z=L.validateStorage(s)
 assert(Actors.isActive(s.player),'inactive player')
 assert(type(s.enemies)=='table'and #s.enemies>0,'missing enemy list')
 local live=false;local count=0
 for k,e in pairs(s.enemies)do
  assert(type(k)=='number'and k%1==0 and k>=1 and k<=#s.enemies and type(e)=='table','invalid enemy list')
  count=count+1;if Actors.isActive(e)then live=true end
 end
 assert(count==#s.enemies and live,'inactive or sparse enemies')
 assert(kind=='gainJade'or kind=='spendJade'or kind=='emptyJade','unknown jade operation')
 assert(type(value)=='number'and value%1==0 and value>=0 and value<=20,'invalid jade quantity')
 if kind=='spendJade'then assert(z.jade>=value,'insufficient jade')end
 return z
end
function M.canApply(s,kind,value)local ok,why=pcall(check,s,kind,value);if ok then return true,nil end;return false,why end
function M.apply(s,kind,value)
 local z=check(s,kind,value)
 if kind=='gainJade'then z.jade=math.min(20,z.jade+value)
 elseif kind=='spendJade'then z.jade=z.jade-value
 elseif z.jade==0 then z.jade=value end
 return z.jade
end
return M
