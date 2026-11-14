-- Native page readiness is independent of visibility deliberately suppressed by the cover.
local View=require('abyss_game_ui_view')
local owner={openingPrepared=6,starting=false,run={},map={},mode='node'}
local target={active=false}
local visits=0
local function child(name)
    visits=visits+1
    assert(name==(owner.mode=='node' and 'nodePanel' or 'mapPanel'),'read an unrelated page')
    return target
end
local progress=View.openingProgress(owner,child,{nativePageLifecycle=true,
    background=setmetatable({},{__index=function()error('unrelated background readiness read')end})})
assert(progress()==6 and visits==1,'inactive native destination is not ready')
target.active=true;assert(progress()==7)
owner.starting=true;assert(progress()==6);owner.starting=false
owner.openingPrepared=4;local before=visits;assert(progress()==4 and visits==before)
owner.openingPrepared=6;owner.mode='map';target.active=false;assert(progress()==6)
target.active=true;assert(progress()==7)
owner.mode='battle';before=visits;assert(progress()==6 and visits==before)
print('LUA_OPENING_NATIVE_READINESS_PASS')
