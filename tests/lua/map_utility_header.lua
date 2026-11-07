local UI=require('abyss_potion_discard_ui')
local states={'normal','hover','pressed','disabled'}
local accesses,visualWrites,textWrites=0,0,0
local function control(spec)
    local c={spec=spec,visible=spec.visible~=false,children={},image=spec.image}
    local values={}
    function c:GetChild(name)accesses=accesses+1;return self.children[name]end
    function c:SetVisible(value)visualWrites=visualWrites+1;self.visible=value end
    function c:SetImage(_,id)visualWrites=visualWrites+1;self.image=id end
    setmetatable(c,{__index=function(_,key)return values[key]end,
        __newindex=function(_,key,value)
            assert(key=='text','entry repaint unexpectedly writes '..key)
            textWrites=textWrites+1;values[key]=value
        end})
    for _,s in ipairs(spec.children or {})do c.children[s.name]=control(s)end
    return c
end
local function find(spec,name)
    if spec.name==name then return spec end
    for _,child in ipairs(spec.children or {})do local found=find(child,name);if found then return found end end
end
local entry=assert(find({children=require('abyss_ui_layout')},'potionEntry'))
local root=control(find(entry,'open'))
local hit=root:GetChild('hit')
local run={potionSlots=3,potions={},data={rules={player={potionSlots=3}}}}
local function check(capacity,count)
    local inventory=run.potions;local before={}
    for i=1,5 do before[i]=inventory[i]end
    accesses,visualWrites,textWrites=0,0,0
    UI.refreshEntry(hit,run,{})
    assert(accesses==8,'refresh only looks up four native states and their labels')
    assert(textWrites==4 and visualWrites==0,'count repaint must not write hidden geometry or images')
    assert(run.potions==inventory,'painting must retain physical inventory identity')
    for _,name in ipairs(states)do
        local variant=hit:GetChild(name)
        assert(variant:GetChild('label').text=='药水 '..count..'/'..capacity)
        assert(variant:GetChild('label').visible,'approved large management count remains visible')
        for i=1,5 do
            assert(variant:GetChild('slot'..i)==nil,'unused entry slots must not be generated')
            assert(run.potions[i]==before[i],'painting must not consume or compact inventory')
        end
    end
end
check(3,0)
run.potions={[1]='fire_potion',[3]='block_potion'};check(3,2)
run.potionSlots=5;run.potions[5]='energy_potion';check(5,3)
run.potions[1]=nil;check(5,2)
run.potions[3]='strength_potion';check(5,2)
run.potionSlots=3;check(3,1)
accesses,visualWrites,textWrites=0,0,0
UI.refreshEntry(hit,nil,{})
assert(accesses==8 and textWrites==4 and visualWrites==0,'nil run only resets captions')
for _,name in ipairs(states)do
    local variant=hit:GetChild(name);assert(variant:GetChild('label').text=='药水')
    for i=1,5 do assert(variant:GetChild('slot'..i)==nil)end
end
print('MAP_UTILITY_HEADER_PASS 4 states, 8 lookups, 4 caption writes, no geometry writes, 3/5 sparse capacity and reset')
return {root=root,hit=hit,run=run,control=control}
