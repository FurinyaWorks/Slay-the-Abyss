-- V25 presentation adapter. Reads the existing Run and never submits commands.
local Theme=require('abyss_theme')
local number=require('abyss_numbers').integer
local M={}
local pointers=setmetatable({},{__mode='k'})
local states={'normal','hover','pressed','disabled'}
local function enabled()return Theme.presentationProfile=='v25-reference' or Theme.presentationProfile=='official-assets-first'end
local function frame(control,box)
    control:SetAnchoredPosition(box[1],box[2])
    control:SetSizeDelta(box[3],box[4])
end
local function menuTarget(box,pointer,available,state)
    if not Theme.menuPresentation or not box:GetChild('menuAccent') then return end
    local target=available and (pointer.hover or pointer.down) and 1 or 0
    if not available then
        pointer.value,pointer.target,pointer.transition=0,0,nil
    elseif pointer.target~=target then
        local seconds=target==1 and Theme.menuPresentation.hoverSeconds or Theme.menuPresentation.leaveSeconds
        pointer.transition={from=pointer.value or 0,to=target,t=0,seconds=seconds}
        pointer.target=target
    end
    pointer.needsPaint=true
    pointer.available=available
    pointer.state=state
end
function M.button(box,available)
    if not enabled()then return end
    local pointer=pointers[box] or {}
    pointers[box]=pointer
    if not available then pointer.hover,pointer.down=false,false end
    local state=not available and 'disabled' or pointer.down and 'pressed' or pointer.hover and 'hover' or 'normal'
    if pointer.painted==state then return end
    menuTarget(box,pointer,available,state)
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
    return Theme.presentationProfile=='v25-reference' and outcome(ctx) and Theme.layout.v25Result.settle or fallback
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
    label.fontSize=isOutcome and 21 or Theme.menuPresentation.fontSize
    label:SetAnchoredPosition(isOutcome and 28 or Theme.menuPresentation.labelX,0)
    label:SetSizeDelta(isOutcome and 140 or 218,52)
    label.text=isOutcome and '重新启程' or '开始游戏'
end
local function officialResult(ctx,isOutcome)
    local menu,start=ctx.menu,ctx.start
    local resultLabel=start:GetChild('officialResultLabel')
    if resultLabel then
        resultLabel:SetVisible(isOutcome)
        if isOutcome then resultLabel.text=start:GetChild('label').text end
    end
    start:GetChild('label'):SetVisible(not isOutcome)
    for _,name in ipairs({'emblem','lowpolyVeil','titleBand','taglineRuleL','taglineRuleR'})do
        local part=menu:GetChild(name);if part then part:SetVisible(isOutcome)end
    end
    if not isOutcome then return false end
    menu:GetChild('title'):SetVisible(true)
    local accent=start:GetChild('menuAccent');if accent then accent:SetVisible(false)end
    -- These were already hidden by the official profile before this menu
    -- slice; a result restores that profile, not the legacy title landscape.
    for _,name in ipairs({'vista','heroArt'})do
        local part=menu:GetChild(name);if part then part:SetVisible(false)end
    end
    menu:GetChild('v25MainMenu'):SetVisible(false)
    menu:GetChild('titleQuit'):SetVisible(false)
    start:GetChild('v25MenuFace'):SetVisible(false)
    local layout=Theme.layout.nativeMenu
    frame(menu:GetChild('title'),layout.title)
    menu:GetChild('title').fontSize=Theme.font.display
    frame(start,layout.resultRestart)
    frame(start:GetChild('hit'),{0,0,layout.resultRestart[3],layout.resultRestart[4]})
    for _,name in ipairs({'plate','border'})do
        local part=start:GetChild(name)
        if part then
            local extra=name=='border' and Theme.space.border*2 or 0
            part:SetSizeDelta(layout.resultRestart[3]+extra,layout.resultRestart[4]+extra)
            part:SetVisible(true)
        end
    end
    return true
end
local function menuAvailable(self)
    return not self.disabled and not self.exitOpen and not self.characterOpen
        and not self.settlementRequested and not self.settlementBusy and not self.motion.deathReveal
end
local function presentScenery(ctx,isOutcome)
    local ruins=ctx.menu:GetChild('menuRuinsScene')
    if ruins then ruins:SetVisible(not isOutcome)end
end
function M.present(ctx,isOutcome)
    if not enabled()then return end
    presentScenery(ctx,isOutcome)
    if Theme.presentationProfile=='official-assets-first' and officialResult(ctx,isOutcome)then return end
    local menu,start=ctx.menu,ctx.start
    menu:GetChild('title'):SetVisible(isOutcome)
    local accent=start:GetChild('menuAccent');if accent then accent:SetVisible(not isOutcome)end
    local layout=isOutcome and Theme.layout.v25Result or Theme.layout.v25Menu
    frame(menu:GetChild('title'),layout.title)
    menu:GetChild('title').fontSize=isOutcome and 36 or 64
    presentStart(ctx,layout,isOutcome)
    start:GetChild('v25MenuFace'):SetVisible(not isOutcome)
    local resultFace=start:GetChild('v25Face')
    if resultFace then resultFace:SetVisible(isOutcome)end
    menu:GetChild('v25MainMenu'):SetVisible(not isOutcome)
    local quit=menu:GetChild('titleQuit');quit:SetVisible(not isOutcome)
    menu:GetChild('tagline'):SetVisible(false)
    hideLegacy(start)
    if Theme.presentationProfile~='official-assets-first'then hideLegacy(ctx.settlement)end
    local self=ctx.owner
    local available=menuAvailable(self)
    M.button(start,available);M.button(quit,available)
    M.button(ctx.settlement,available and type(ctx.platform.settle)=='function')
    if isOutcome then resultValues(ctx)end
    if ctx.platform.portraits and ctx.platform.portraits.syncResult then
        ctx.platform.portraits:syncResult(self.mode,self.disabled or self.settlementRequested or self.settlementBusy)
    end
end
local function paintMenuButton(box,pointer,color)
    local tokens=Theme.menuPresentation
    local line=box:GetChild('menuAccent'):GetChild('line')
    local value=pointer.value or 0
    local ink=pointer.available and tokens.ink or tokens.muted
    line.imageColor=color(tokens.accent.r,tokens.accent.g,tokens.accent.b,
        math.floor(tokens.lineRestAlpha+(255-tokens.lineRestAlpha)*value))
    box:GetChild('label').fontColor=color(ink.r,ink.g,ink.b,255)
    box:GetChild('label'):SetAnchoredPosition(tokens.labelX,pointer.down and -tokens.pressOffset or 0)
    pointer.needsPaint=false
end
local function advanceMenuButton(box,dt,color,available)
    if not box or not box:GetChild('menuAccent') then return end
    local pointer=pointers[box]
    if not pointer then return end
    if not available and (pointer.hover or pointer.down or pointer.transition) then
        pointer.hover,pointer.down=false,false
        menuTarget(box,pointer,false,'disabled')
    end
    local transition=pointer.transition
    if transition then
        transition.t=math.min(transition.seconds,transition.t+math.max(0,dt))
        local progress=transition.t/transition.seconds
        pointer.value=transition.from+(transition.to-transition.from)*(1-(1-progress)^3)
        pointer.needsPaint=true
        if progress>=1 then pointer.transition=nil end
    end
    if pointer.needsPaint then paintMenuButton(box,pointer,color)end
end
function M.animateMenu(ctx,dt)
    if not enabled() or not Theme.menuPresentation then return end
    if ctx.owner.mode~='menu' then
        for _,box in ipairs({ctx.start,ctx.menu:GetChild('titleQuit'),ctx.menu:GetChild('continueRun')})do
            local pointer=pointers[box]
            if pointer then
                pointer.hover,pointer.down=false,false
                pointer.value,pointer.target,pointer.transition=0,0,nil
                pointer.painted,pointer.needsPaint=nil,true
            end
        end
        return
    end
    local available=ctx.owner.mode=='menu' and menuAvailable(ctx.owner)
    advanceMenuButton(ctx.start,dt,ctx.platform.color,available)
    advanceMenuButton(ctx.menu:GetChild('titleQuit'),dt,ctx.platform.color,available)
    advanceMenuButton(ctx.menu:GetChild('continueRun'),dt,ctx.platform.color,available and ctx.owner.sessionPaused==true)
end
function M.entrance(ctx)
    if not enabled()then return false end
    if outcome(ctx) and Theme.presentationProfile=='official-assets-first'then return false end
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
