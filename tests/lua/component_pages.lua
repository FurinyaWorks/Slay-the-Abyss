local Bridge=require('abyss_component_bridge')
local created,destroyed,fail,onCreate=0,0,false,nil
local function native(name)
    local node={name=name,alive=true,visible=true,children={},sizeDeltaX=100,anchorMinX=.5,anchorMaxX=.5}
    function node:GetChild(key)assert(self.alive);return self.children[key]end
    function node:GetChildren()
        assert(self.alive);local list={}
        for _,child in pairs(self.children)do list[#list+1]=child end
        return list
    end
    function node:SetVisible(value)assert(self.alive);self.visible=value;return true end
    function node:SetAnchoredPosition()assert(self.alive);return true end
    function node:SetLocalScale()assert(self.alive);return true end
    function node:SetAsLastSibling()assert(self.alive);return true end
    function node:AddCursorEventListener(event,callback)self.events=self.events or {};self.events[event]=callback end
    return node
end
local stage=native('stage')
stage.children.componentLoading=native('componentLoading')
local root={name='stage',kind='container',children={}}
local placements={}
for _,name in ipairs({'menuPanel','mapPanel','battlePanel','characterPanel'})do
    local page=native(name);stage.children[name]=page
    local spec={name=name,kind='container',children={}}
    root.children[#root.children+1]=spec
    for index=1,3 do
        local child=native('slot'..index);child.children.__kitOriginal=native('__kitOriginal');page.children[child.name]=child
        spec.children[#spec.children+1]={name=child.name,kind='container'}
        placements[#placements+1]={path=name..'/'..child.name,templateId=index,host='__kitOriginal'}
    end
end
local bridge=Bridge.new(stage,{schemaVersion=1,root=root,templates={},placements=placements},{prepareBudget=2,cachedPageLimit=1,
    instantiate=function(id,host)
        if fail and id==2 then error('injected mount fault')end
        created=created+1;local image=native('original');host.children['original'..created]=image
        if onCreate then local callback=onCreate;onCreate=nil;callback()end
        return image
    end,
    destroy=function(item)item.alive=false;destroyed=destroyed+1;return true end})
if ABYSS_COMPONENT_METHOD_PROBE then
    local probe=bridge.root:GetChild('menuPanel'):GetChild('slot1')
    assert(probe.SetAnchoredPosition==probe.SetAnchoredPosition,'H3 method lookup allocates a fresh wrapper')
    print('PASS stable native method wrapper');return
end
assert(created==0,'H2: cold construction must not mount offscreen component pages')
local menu=bridge.root:GetChild('menuPanel')
local retiredVisibility=menu.SetVisible
assert(menu:SetVisible(true)==true)
assert(not stage.children.menuPanel.visible,'H1: a requested page must stay completely hidden')
assert(stage.children.componentLoading.visible,'preparing must display a complete loading cover')
bridge:step();assert(created==2 and not stage.children.menuPanel.visible)
bridge:step();assert(created==3 and stage.children.menuPanel.visible)
assert(not stage.children.componentLoading.visible,'ready page must dismiss loading cover')
assert(bridge:pageState('menuPanel')=='visible')
menu:SetVisible(false);menu:SetVisible(true);assert(created==3,'cached page must not remount')
-- Cached proxy wrappers retain identity, resolve replacement native methods,
-- and never turn a rejected/throwing setter into a cached success.
local slot=menu:GetChild('slot1')
local invoked=0
slot:AddCursorEventListener('click',function()invoked=invoked+1 end)
local callback=stage.children.menuPanel.children.slot1.events.click
callback();assert(invoked==1)
local setter=slot.SetAnchoredPosition
assert(setter==slot.SetAnchoredPosition,'H3: repeated method reads must not allocate closures')
stage.children.menuPanel.children.slot1.SetAnchoredPosition=function()return false end
assert(setter(slot,1,2)==false,'false must stay observable')
stage.children.menuPanel.children.slot1.SetAnchoredPosition=function()error('setter fault')end
assert(not pcall(setter,slot,1,2),'throw must stay observable')
stage.children.menuPanel.children.slot1.SetAnchoredPosition=function()return 'replacement' end
assert(setter(slot,1,2)=='replacement','wrapper must retry the current native method')
menu:SetVisible(false)
assert(callback()==true and invoked==1,'hidden page must consume stale callbacks')
local map=bridge.root:GetChild('mapPanel');map:SetVisible(true)
fail=true;assert(not pcall(function()bridge:step()end),'page failure must leave indefinite loading and propagate to Host')
assert(not stage.children.componentLoading.visible,'failure must dismiss loading before propagating to the Host fault UI')
assert(bridge:pageState('mapPanel')=='failed' and not stage.children.mapPanel.visible)
assert(destroyed==1,'failed page must roll back earlier successful mounts')
fail=false;assert(bridge:retryPage('mapPanel'))
bridge:step();assert(not stage.children.mapPanel.visible)
bridge:step();assert(stage.children.mapPanel.visible)
map:SetVisible(false)
local battle=bridge.root:GetChild('battlePanel');battle:SetVisible(true);bridge:step()
assert(not stage.children.battlePanel.visible)
onCreate=function()bridge:cancelPage('battlePanel')end
battle:SetVisible(true);bridge:step()
assert(bridge:pageState('battlePanel')=='unprepared' and not battle.visible,
    'synchronous cancel while instantiate returns must not commit the old job cursor')
local _,_,remaining=bridge:pageState('battlePanel');assert(remaining==0,'late root must be cleaned after job unwinds')
assert(bridge:cancelPage('battlePanel'))
assert(bridge:pageState('battlePanel')=='unprepared')
assert(not stage.children.battlePanel.visible)
battle:SetVisible(true);bridge:step();local partial=created-destroyed
battle:SetVisible(false)
assert(bridge:pageState('battlePanel')=='unprepared' and created-destroyed==partial-2,
    'hiding during preparation must release partial resources rather than escaping the cache budget')
-- Twenty switches exercise eviction and recreation. Native semantic anchors
-- remain engine-owned; only mounted visual roots count against this ledger.
for index=1,20 do
    local name=index%2==0 and 'battlePanel' or 'characterPanel'
    for _,other in ipairs({'menuPanel','mapPanel','battlePanel','characterPanel'})do bridge.root:GetChild(other):SetVisible(other==name)end
    bridge:step();bridge:step()
    assert(bridge:pageState(name)=='visible')
    assert(created-destroyed<=6,'visible plus one cached page must bound mounted roots')
end
-- Two simultaneous hosts must never reuse proxy methods or native identities.
local secondNative=native('second')
local second=Bridge.new(secondNative,{schemaVersion=1,root={name='second',kind='container'},templates={},placements={}},{
    instantiate=function()error('no second-host component expected')end,destroy=function()return true end})
assert(second.root~=bridge.root and second.root.SetVisible~=bridge.root.SetVisible)
second.root:SetVisible(false);assert(stage.visible and not secondNative.visible)
second:onEngineDestroy();assert(bridge.root.alive)
-- A dead placement host must fail closed before READY; no cached lookup may
-- carry it into a fresh preparation attempt.
assert(bridge:cancelPage('battlePanel'))
local host=stage.children.battlePanel.children.slot1.children.__kitOriginal
host.alive=false;battle:SetVisible(true)
assert(not pcall(function()bridge:step()end));assert(bridge:pageState('battlePanel')=='failed')
host.alive=true;assert(bridge:retryPage('battlePanel'))
onCreate=function()bridge:onEngineDestroy()end
bridge:step()
bridge:onEngineDestroy()
assert(not slot.alive and not pcall(setter,slot,0,0),'retired wrapper must not use borrowed native handles')
assert(not pcall(retiredVisibility,menu,true),'retired page setter must reject a cached method')
assert(callback()==true and invoked==1,'destroyed Host must consume stale callbacks')
print('PASS component pages H1/H2/H3, rollback, retry, cancel and 20 switches; created='..created..' destroyed='..destroyed)
