package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local Portraits=require('abyss_traveler_portraits')
local touched=0
local stage={GetChild=function()touched=touched+1;error('legacy battle art host touched')end}
local result=Portraits.new(stage,function()end,{battlePortrait=true},nil,{nativeBattle=true})
assert(result==nil and touched==0,'native battle must not even open the 4389-control legacy portrait factory')
print('NATIVE_PORTRAIT_ALLOCATION_PASS native battle never opens legacy factory even if old flag is enabled')
