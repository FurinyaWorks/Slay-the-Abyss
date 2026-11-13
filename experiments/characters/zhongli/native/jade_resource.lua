-- Character-local storage operations only. No incoming-damage hook or payment.
local L=require('experiments.characters.zhongli.native.lifecycle')
local Actors=require('abyss_actor')
local M={}
local function check(state,kind,value)
 local z=L.validate(state)
 assert(Actors.isActive(state.player)and Actors.isActive(state.enemies[1]),'inactive jade transaction')
 assert(kind=='gainJade'or kind=='spendJade','unknown jade operation')
 assert(type(value)=='number'and value==value and value%1==0 and value>=0 and value<=20,'invalid jade quantity')
 if kind=='spendJade'then assert(z.jade>=value,'insufficient jade')end
 return z
end
-- Host checks before energy payment, then checks again in the paid effect stage.
function M.canApply(state,kind,value)
 local ok,reason=pcall(check,state,kind,value)
 if ok then return true,nil end
 return false,reason
end
function M.apply(state,kind,value)
 local z=check(state,kind,value)
 if kind=='gainJade'then z.jade=math.min(20,z.jade+value)else z.jade=z.jade-value end
 return z.jade
end
return M
