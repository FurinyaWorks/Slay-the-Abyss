-- Appended inside abyss_ui.lua: deliberately shares its local view owner.
-- Explicit reset fixtures, not natural encounter/RNG or official-client proof.
local eventFullOriginalStart=OnStart
local eventFullOriginalUpdate=OnUpdate
local eventFullBoot=0
local function eventFullStage(kind,id,act)
    if view.potionUI.visible then assert(view:closePotions())end
    if view.deckUI.visible then assert(view:closeDeck())end
    local Run,Map,Nodes=require('abyss_run'),require('abyss_map'),require('abyss_nodes')
    local source=require('abyss_combat').copy(view.data)
    source.rules.events.encounterId=id
    local run=Run.new(source,42,id=='match_game' and {experimental=true,campaign=true,character='ironclad'}or nil)
    run.act,run.gold,run.hp=act or 1,120,kind=='camp'and 20 or 41
    local map=Map.generate(run.data,42,run.act)
    local entered=false
    for attempt=1,20 do
        local choices=Map.available(map);assert(#choices>0,'fixture route exhausted')
        for _,node in ipairs(choices)do
            if node.type==kind then local ok,why=Nodes.enter(run,map,node.id);assert(ok,why);entered=true;break end
        end
        if entered then break end
        assert(Map.choose(map,choices[1].id))
    end
    assert(entered,'fixture room missing')
    view.nodeUI:setVisible(false)
    view.battleUI.feedback:cancel()
    view.run,view.map=run,map
    view.nodeUI.run,view.nodeUI.map=run,map
    view.mapUI.map,view.battleUI.run=map,run
    view.routeOpen,view.characterOpen=false,false
    view:refresh()
    assert(view.mode=='node'and view.nodeUI.visible,'full GameUI room not visible')
    print('EVENT_FULL_WEB ready '..kind..' '..tostring(id))
end
function OnStart()
    eventFullOriginalStart()
    assert(view and not view.disabled,'original GameUI startup failed')
    local cases={{'event','cleric',1},{'event','designer',2},{'event','the_library',2},
        {'shop',nil,1},{'camp',nil,1},{'treasure',nil,1},{'event','match_game',1}}
    local nav=view.root:GetChild('eventFixtureNav')
    nav:SetActive(false);nav:SetVisible(false)
    for i,entry in ipairs(cases)do
        local selected=entry
        nav:GetChild('case'..i):GetChild('hit'):AddCursorEventListener(Enum.CursorEventType.CursorClick,function()
            if eventFullBoot<5 then return false end
            eventFullStage(selected[1],selected[2],selected[3])
        end)
    end
end
function OnUpdate(dt)
    eventFullOriginalUpdate(dt)
    if not view or view.disabled or eventFullBoot>=5 then return end
    eventFullBoot=eventFullBoot+1
    if eventFullBoot==1 then view.seed=42;assert(view:start())
    elseif eventFullBoot==2 then assert(view:selectCharacter('traveler'))
    elseif eventFullBoot==3 then assert(view:selectElement('ironclad'))
    elseif eventFullBoot==4 then assert(view:confirmCharacter())
    else
        eventFullStage('event','cleric',1)
        local nav=view.root:GetChild('eventFixtureNav');nav:SetActive(true);nav:SetVisible(true)
    end
end
