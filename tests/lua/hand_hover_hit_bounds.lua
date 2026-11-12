local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local Theme=H.F.Theme
local function bounds(card)
    local hit=card:GetChild('hit')
    local a=card.localRotationZ*math.pi/180
    local z=a+hit.localRotationZ*math.pi/180
    local s=card.localScaleX
    local dx,dy=hit.x*s,hit.y*s
    local x,y=card.x+math.cos(a)*dx-math.sin(a)*dy,card.y+math.sin(a)*dx+math.cos(a)*dy
    local w,h=hit.sizeDeltaX*s/2,hit.sizeDeltaY*s/2
    local rx,ry=math.abs(math.cos(z))*w+math.abs(math.sin(z))*h,math.abs(math.sin(z))*w+math.abs(math.cos(z))*h
    return {x-rx,x+rx,y-ry,y+ry}
end
for _,count in ipairs(ABYSS_HAND_HIT_COUNTS or {1,5,10})do
    local deck={};for i=1,count do deck[i]='defend'end
    local host,ui,panel,event=H.setup(deck)
    H.F.Combat.draw(host.run.combat,count);host:refresh();host:update(10)
    -- Native raycasts can choose only among receivers whose transformed world
    -- rectangles contain the pointer. Card centres must have exactly one owner,
    -- regardless of native sibling order or which neighbour was raised last.
    local function ownerAt(x,y)
        local result
        for i=1,count do
            local b=bounds(panel:GetChild('card'..i))
            if x>b[1] and x<b[2] and y>b[3] and y<b[4] then
                assert(not result,'overlapping hand receivers at card centre: '..tostring(result)..'/'..i)
                result=i
            end
        end
        return assert(result,'hand centre has no receiver')
    end
    for slot=1,count do
        local card=panel:GetChild('card'..slot)
        local rest=bounds(card)
        local function fixed()
            local actual=bounds(card)
            for edge=1,4 do assert(math.abs(actual[edge]-rest[edge])<1e-6,'animated hover changed world hit bounds')end
        end
        assert(ownerAt(card.x,card.y)==slot,'initial pointer resolved the wrong slot')
        event('card'..slot,'enter',slot,card.x,card.y);fixed()
        assert(ui.hover==slot,'initial Enter hovered the wrong slot')
        for _=1,4 do host:update(1/60);fixed()end
        host:update(10);fixed()
        if count>1 then
            local nextSlot=slot%count+1
            local neighbour=panel:GetChild('card'..nextSlot)
            assert(ownerAt(neighbour.x,neighbour.y)==nextSlot,'raised card stole its neighbour centre')
            event('card'..slot,'exit',slot,neighbour.x,neighbour.y)
            event('card'..nextSlot,'enter',slot,neighbour.x,neighbour.y)
            assert(ui.hover==nextSlot,'hover could not move to the adjacent centre')
            event('card'..nextSlot,'exit',slot,neighbour.x,neighbour.y)
        end
        assert(card.y-Theme.layout.card.size[2]*card.localScaleY/2>=-Theme.canvas.base[2]/2+Theme.canvas.safe.y-1e-6,'settled hover left safe canvas')
        event('card'..slot,'exit',slot,card.x,card.y)
        ui:setHover(nil);fixed()
        for _=1,4 do host:update(1/60);fixed()end
        host:update(10);fixed()
    end
    local battle=host.run.combat
    for slot=1,count do
        local card=panel:GetChild('card'..slot)
        local x,y=card.x,card.y
        local actual=ownerAt(x,y)
        local uid=battle.hand[slot].uid
        event('card'..actual,'down',100+slot,x,y)
        assert(ui.gesture and ui.gesture.slot==slot and ui.gesture.uid==uid,'initial Down captured a neighbour UID')
        event('card'..actual,'drag',100+slot,x,y+9)
        assert(ui.gesture and ui.gesture.moving and ui.selected==uid,'lift changed the owned drag UID')
        host:update(.5) -- PC releases below the 0.4s carry window can keep aiming.
        event('dragLayer','drag',100+slot,0,Theme.canvas.base[2]/2)
        event('dragLayer','up',100+slot,0,Theme.canvas.base[2]/2)
        assert(not ui.gesture and not ui.selected and #battle.hand==count and battle.energy==3,
            'off-canvas cancellation played a card or retained ownership')
        host:update(10)
    end
end
print('LUA_HAND_HOVER_HIT_BOUNDS_PASS')
