-- Compact source-only room preview. Real Nodes transactions and Map snapshot;
-- route view is read-only here. Full GameUI is verified separately by SDK replay.
local run, map, rooms, route
local function refresh()
    rooms.run, rooms.map, route.map = run, map, map
    local active = run.phase == 'node'
    rooms:setVisible(active)
    if active then rooms:render() end
    route:setVisible(not active)
    route:setNavigationEnabled(false)
    if not active then route:focusCurrent() end
end
local function previewRoom(kind, id, act)
    local source = require('abyss_combat').copy(require('abyss_data'))
    source.rules.events.encounterId = id
    run = require('abyss_run').new(source, 42)
    run.act, run.gold, run.hp = act or 1, 120, 41
    map = require('abyss_map').generate(source, 42, run.act)
    local entered = false
    for _ = 1, 20 do
        local choices = require('abyss_map').available(map)
        for _, node in ipairs(choices) do
            if node.type == kind then
                assert(require('abyss_nodes').enter(run, map, node.id))
                entered = true
                break
            end
        end
        if entered then break end
        assert(require('abyss_map').choose(map, choices[1].id))
    end
    assert(entered)
    rooms:setVisible(false)
    refresh()
    print('EVENT_PREVIEW ready '..kind..' '..tostring(id))
end
function OnStart()
    local stage = require('abyss_viewport').apply(script.object, game.GetUICanvasSize())
    map = require('abyss_map').generate(require('abyss_data'), 42)
    route = require('abyss_map_ui').new(stage:GetChild('mapPanel'), map, function() return false end,
        Enum.CursorEventType.CursorClick, {embedded=true,cursor=Enum.CursorEventType,color=Color,imageSource=Enum.ImageSource.StaticReference})
    route:resize(1280,720)
    rooms = require('abyss_node_ui').new(stage:GetChild('nodePanel'), nil, nil, require('abyss_presentation'),
        Enum.CursorEventType.CursorClick, refresh,
        {enhancedRooms=true,cursorEvents=Enum.CursorEventType,color=Color,imageSource=Enum.ImageSource.StaticReference})
    local cases = {
        {'event','cleric',1}, {'event','designer',2}, {'event','the_library',2},
        {'shop',nil,1}, {'camp',nil,1}, {'treasure',nil,1}, {'event','match_game',1},
    }
    local nav = stage:GetChild('eventFixtureNav')
    for i, entry in ipairs(cases) do
        nav:GetChild('case'..i):GetChild('hit'):AddCursorEventListener(Enum.CursorEventType.CursorClick,
            function() previewRoom(entry[1],entry[2],entry[3]) end)
    end
    previewRoom('event','cleric',1)
    script:EnableUpdate(true)
end
function OnUpdate(dt)
    if rooms then rooms:update(dt);route:update(dt) end
end
