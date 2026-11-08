-- V25 presentation adapter. Reads the existing Run and never submits commands.
local Theme=require('abyss_theme')
local number=require('abyss_numbers').integer
local M={}
local pointers=setmetatable({},{__mode='k'})
local states={'normal','hover','pressed','disabled'}
local function enabled()return Theme.presentationProfile=='v25-reference'end
local function frame(control,box)
    control:SetAnchoredPosition(box[1],box[2])
    control:SetSizeDelta(box[3],box[4])
end
function M.button(box,available)
    if not enabled()then return end
    local pointer=pointers[box] or {}
    pointers[box]=pointer
    if not available then pointer.hover,pointer.down=false,false end
    local state=not available and 'disabled' or pointer.down and 'pressed' or pointer.hover and 'hover' or 'normal'
    if pointer.painted==state then return end
    for _,name in ipairs({'v25Face','v25MenuFace'})do
        local group=box:GetChild(name)
        if group then for _,key in ipairs(states)do group:GetChild(key):SetVisible(key==state)end end
    end
    pointer.painted=state
end
function M.pointer(box,event,available)
    if not enabled()then return end
    local pointer=pointers[box] or {};pointers[box]=pointer
    if event=='enter'then pointer.hover=true
    elseif event=='down'then pointer.hover,pointer.down=true,true
    elseif event=='up'then pointer.down=false
    else pointer.hover,pointer.down=false,false end
    M.button(box,available)
end
local function hideLegacy(button)
    for _,name in ipairs({'plate','border','normal','disabled','selected'})do
        local control=button:GetChild(name);if control then control:SetVisible(false)end
    end
end
local function outcome(ctx)return ctx.owner.mode=='victory' or ctx.owner.mode=='defeat'end
function M.settlementFrame(ctx,fallback)
    return enabled() and outcome(ctx) and Theme.layout.v25Result.settle or fallback
end
local function resultValues(ctx)
    local run=ctx.owner.run
    local hp=run.phase=='defeat' and 0 or run.hp
    local result,layout=ctx.result,Theme.layout.v25Result
    result:GetChild('stat_relics'):GetChild('value').text=number(#run.relics)
    result:GetChild('stat_health'):GetChild('value').text=number(hp)..' / '..number(run.maxHp)
    local hud=result:GetChild('v25ResultChrome'):GetChild('hud')
    local info=ctx.owner.characterSelection.info
    hud:GetChild('name').text=info and info.name or ''
    hud:GetChild('hp').text='♥ '..number(hp)..' / '..number(run.maxHp)
    hud:GetChild('gold').text='● '..number(run.gold)
    hud:GetChild('floor').text=number(ctx.owner.map.floor)
    hud:GetChild('deck').text=number(#run.deck)
    frame(result:GetChild('subtitle'),layout.subtitle)
    frame(result:GetChild('detail'),layout.detail);frame(result:GetChild('status'),layout.status)
end
local function presentStart(ctx,layout,isOutcome)
    local start=ctx.start
    local box=isOutcome and layout.resultRestart or layout.start
    frame(start,box);frame(start:GetChild('hit'),{0,0,box[3],box[4]})
    local label=start:GetChild('label')
    label.adaptiveFontSize=false
    label.fontSize=isOutcome and 21 or 25
    label:SetAnchoredPosition(isOutcome and 28 or 22,0)
    label:SetSizeDelta(isOutcome and 140 or 218,52)
    label.text=isOutcome and '重新启程' or '开始游戏'
end
function M.present(ctx,isOutcome)
    if not enabled()then return end
    local menu,start=ctx.menu,ctx.start
    local layout=isOutcome and Theme.layout.v25Result or Theme.layout.v25Menu
    frame(menu:GetChild('title'),layout.title)
    menu:GetChild('title').fontSize=isOutcome and 36 or 64
    presentStart(ctx,layout,isOutcome)
    start:GetChild('v25MenuFace'):SetVisible(not isOutcome)
    start:GetChild('v25Face'):SetVisible(isOutcome)
    menu:GetChild('v25MainMenu'):SetVisible(not isOutcome)
    local quit=menu:GetChild('titleQuit');quit:SetVisible(not isOutcome)
    menu:GetChild('tagline'):SetVisible(false)
    hideLegacy(start);hideLegacy(ctx.settlement)
    local self=ctx.owner
    local available=not self.disabled and not self.exitOpen and not self.characterOpen
        and not self.settlementRequested and not self.settlementBusy and not self.motion.deathReveal
    M.button(start,available);M.button(quit,available)
    M.button(ctx.settlement,available and type(ctx.platform.settle)=='function')
    if isOutcome then resultValues(ctx)end
    if ctx.platform.portraits and ctx.platform.portraits.syncResult then
        ctx.platform.portraits:syncResult(self.mode,self.disabled or self.settlementRequested or self.settlementBusy)
    end
end
function M.entrance(ctx)
    if not enabled()then return false end
    if ctx.owner.motion.entranceDone then return true end
    local layout=Theme.layout.v25Result
    if outcome(ctx)then
        local progress=math.min(1,ctx.owner.motion.t/Theme.motion.slow)
        for i,key in ipairs({'floor','victories','time','deck','relics','health'})do
            local row=ctx.result:GetChild('stat_'..key);local at=layout.positions[i]
            row:SetLocalScale(1,1,1);row:SetAnchoredPosition(at[1],at[2]-20*(1-progress)^3)
        end
        ctx.owner.motion.entranceDone=progress>=1
    end
    return true
end
return M
