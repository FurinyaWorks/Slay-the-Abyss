local Theme = require("abyss_theme")
local RoomMotion = require('abyss_node_ui_motion')
local RewardDetail = require('abyss_node_ui_reward_detail')
local C = Theme.color
local layout = Theme.layout.nativeNode
local M = {}

local function neowChoiceChrome(ctx, box, look, hover, pressed)
    local chrome = box:GetChild('stsNeowChrome')
    if not chrome then return end
    local flow = ctx.self.run.nodeFlow
    local active = flow and flow.event and flow.event.id == 'neow'
    chrome:SetVisible(active == true)
    for _,name in ipairs({'v25BaseMaterial','v25StateChrome','v25Corner0_0','v25Corner0_1','v25Corner1_0','v25Corner1_1'})do
        local part=box:GetChild(name);if part then part:SetVisible(not active)end
    end
    if not active then return end
    for _, name in ipairs({'border','normal','hover','pressed','disabled','selected'}) do box:GetChild(name):SetVisible(false) end
    local token = layout.event.neow.stsChoice
    local face = not look.enabled and token.disabled or pressed and token.pressed or hover and token.hover or token.face
    for _, part in ipairs(chrome:GetChild('face'):GetChildren()) do ctx.tint(part, face) end
end

local function referenceCamp(ctx, box)
    local reference, camp = layout.camp.reference, ctx.child('campView')
    if not reference or box.parent ~= camp then return end
    local rest, forge = camp:GetChild('rest'), camp:GetChild('forge')
    local focus = ctx.buttonHover == forge or ctx.buttonPress and ctx.buttonPress.box == forge
    rest:GetChild('description'):SetVisible(not focus);forge:GetChild('description'):SetVisible(focus == true)
    ctx.tint(box:GetChild('border'), box == rest and reference.restEdge or reference.forgeEdge)
    ctx.tint(box:GetChild('hover'), box == rest and reference.restHover or reference.forgeHover)
end

local function referenceShop(ctx, box, look, hover)
    if layout.shop.referenceBareGoods and box:GetChild('v25BareGoods') then
        for _, state in ipairs({'normal','hover','pressed','disabled','selected'}) do box:GetChild(state):SetVisible(false) end
        box:GetChild('v25GoodsFocus'):SetVisible(hover or look.selected == true)
    end
    if layout.shop.referenceRemovalBorder and box == ctx.child('shopView'):GetChild('removal') then
        ctx.tint(box:GetChild('border'), layout.shop.referenceRemovalBorder)
    end
end

local function referenceChrome(ctx, box, look, hover)
    local reference = layout.event.reference
    if reference and box.parent == ctx.child('eventView') then
        ctx.tint(box:GetChild('hover'), reference.hover)
        ctx.tint(box:GetChild('pressed'), reference.pressed)
        ctx.tint(box:GetChild('border'), hover and reference.hoverBorder or reference.border)
    end
    local buttons = layout.referenceButtons
    if not buttons then return end
    local label = box:GetChild('label')
    if label then
        local palette = box.parent == ctx.root and buttons.flag or buttons.choice
        ctx.tint(box:GetChild('hover'), palette.hover);ctx.tint(box:GetChild('pressed'), palette.pressed)
        ctx.ink(label, look.enabled and buttons.ink or buttons.disabledInk)
    end
    referenceCamp(ctx, box)
    referenceShop(ctx, box, look, hover)
end

-- Installs the feedback responsibility on one node UI instance.
function M.install(ctx)
    ctx.buttonLooks, ctx.buttonHover, ctx.buttonPress = {}, nil, nil

    function ctx.paintButton(box)
        local look = ctx.buttonLooks[box]
        if not look then return end -- a never-shown view can still receive a late native exit
        local enabled = look.enabled and not look.selected
        local pressed = enabled and ctx.buttonPress and ctx.buttonPress.box == box
        local hover = enabled and ctx.buttonHover == box and not pressed
        local function showButtonState()
            box:GetChild("normal"):SetVisible(look.enabled and not look.selected and not pressed and not hover)
            box:GetChild("hover"):SetVisible(hover == true)
            box:GetChild("pressed"):SetVisible(pressed == true)
            box:GetChild("disabled"):SetVisible(not look.enabled)
            box:GetChild("selected"):SetVisible(look.selected == true)
        end
        showButtonState()
        local function paintButtonFrame()
            ctx.tint(box:GetChild("hover"), look.primary and C.goldBright or C.buttonHover)
            ctx.tint(box:GetChild("pressed"), C.buttonPressedFill)
            ctx.tint(box:GetChild("border"), look.selected and C.goldBright or not look.enabled and C.line
                or (pressed or hover or look.primary) and C.goldBright or C.gold)
            local function paintButtonLabel()
                local label = box:GetChild("label")
                if label then ctx.ink(label, not look.enabled and C.textMuted or pressed and C.buttonPressedText
                        or look.selected and C.goldBright or look.primary and C.textOnLight or C.goldBright) end
                -- The official material is dark in every state. Its shared ink
                -- must survive render/hover/press instead of inheriting the old
                -- light-primary-button contract from the unskinned node page.
                if label and Theme.presentationProfile=='official-assets-first' then
                    ctx.ink(label,look.enabled and Theme.officialAssets.buttonInk or C.textMuted)
                end
            end
            paintButtonLabel()

        end
        paintButtonFrame()
        referenceChrome(ctx, box, look, hover)
        neowChoiceChrome(ctx, box, look, hover, pressed)
        local scale = pressed and layout.buttonStates.pressedScale or layout.buttonStates.normalScale
        box:SetLocalScale(scale, scale, 1)
    end

    ctx.buttonInputs, ctx.actionInputs = {}, {}

    function ctx.retireAction(entry)
        if not entry or not entry.observe then return end
        if entry.retire then entry.retire() end
        for _, input in pairs(ctx.buttonInputs) do
            for _, gesture in pairs(input.active) do if gesture.action == entry then gesture.action = nil end end
            if input.released and input.released.action == entry then input.released.action = nil end
        end
    end

    function ctx.observeAction(entry)
        if not entry.observe or entry.observe() then return true end
        ctx.retireAction(entry)
        return false
    end

    ctx.inspectCards={}


    ctx.roomMotion = RoomMotion.new(ctx.self,ctx.child,ctx.options)

    ctx.rewardDetail=RewardDetail.new(ctx.self,ctx.child('treasureView'):GetChild('details'),ctx.options)

    ctx.swipe, ctx.swallow = nil, nil

    function ctx.resetButtons()
        ctx.rewardDetail:reset()
        ctx.buttonHover, ctx.buttonPress, ctx.swipe = nil, nil, nil
        ctx.self.inspectPress=nil
        for _, input in pairs(ctx.buttonInputs) do input.active, input.released = {}, nil end
        for box in pairs(ctx.buttonLooks) do ctx.paintButton(box) end
    end

    function ctx.state(box, enabled, selected, primary)
        ctx.buttonLooks[box] = {enabled=enabled == true, selected=selected == true, primary=primary == true}
        ctx.paintButton(box)
    end
end
return M
