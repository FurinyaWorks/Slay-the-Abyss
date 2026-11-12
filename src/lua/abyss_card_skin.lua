-- Shared read-only native card decoration. All colours and dimensions come from Theme.
local Theme=require('abyss_theme')
local M={}
local surface,surfaceEnabled=nil,false
local surfaceVisibility=setmetatable({},{__mode='k'})
local surfaceHasCost=setmetatable({},{__mode='k'})
local surfaceDecorations
local function restoreSurfaceDecorations()
    for box in pairs(surfaceVisibility)do
        if box.alive~=false then
            surfaceDecorations(box,false)
            for _,name in ipairs({'costCore','costDisc'})do box:GetChild(name):SetVisible(surfaceHasCost[box]==true)end
        end
    end
    surfaceVisibility=setmetatable({},{__mode='k'})
    surfaceHasCost=setmetatable({},{__mode='k'})
end
function M.configureSurface(value,api)
    surfaceEnabled=false
    local released=not surface or surface:onDestroy()
    restoreSurfaceDecorations()
    if not released then return false end
    surface=require('abyss_v25_card_surface').new(value,api)
    surfaceEnabled=type(value)=='table' and value.enabled==true
    return true
end
function M.beginFrame()
    if surface and not surfaceEnabled then surface:clear()end
    if surface then return surface:beginFrame()end
end
function M.endFrame(token,scopes)
    if not surface then return end
    surface:endFrame(token,scopes)
    for box,ready in pairs(surfaceVisibility)do
        if ready and box.alive~=false and not surface:isReady(box)then
            surfaceDecorations(box,false)
            for _,name in ipairs({'costCore','costDisc'})do box:GetChild(name):SetVisible(surfaceHasCost[box]==true)end
        end
    end
end
function M.clearSurface()
    local released=not surface or surface:clear()
    restoreSurfaceDecorations()
    return released
end
function M.destroySurface()
    surfaceEnabled=false
    local released=not surface or surface:onDestroy()
    restoreSurfaceDecorations()
    if released then surface=nil end
    return released
end
local config=Theme.cardSkin
local roundNames={'vertical','horizontal','corner-1_-1','corner-1_1','corner1_-1','corner1_1'}
local windowNames={skill=roundNames,power={'arch','base'},attack={'upper','point'}}
local emblemNames={HT={'petal0','petal1','petal2','petal3','petal4'},AR={'moon'},FR={'water','tip'},RD={'bolt','tail'},curse={'slash','backslash'}}
local phases=setmetatable({},{__mode='k'})
local activeHalos=setmetatable({},{__mode='k'})
local decorations=setmetatable({},{__mode='k'})
local pillWidths=setmetatable({},{__mode='k'})
local bodyMaterialKinds=setmetatable({},{__mode='k'})
local ribbonColours=setmetatable({},{__mode='k'})
function M.paintBanner(box,definition,tint)
    local official=Theme.presentationProfile=='official-assets-first'
    local tones=official and Theme.officialAssets.battleBannerByRarity or Theme.color.rarityBand
    local tone=tones[definition.rarity]or tones.basic
    tint(box:GetChild('nameBand'),tone)
    if not official then return end
    tint(assert(box:GetChild('nativeBannerRight'),'official card banner is required'),tone)
    local ribbon=assert(box:GetChild('nativeRibbon'),'official card ribbon is required')
    if ribbonColours[box]==tone then return end
    for _,part in ipairs(ribbon:GetChildren())do
        if part.name:match('^face')then tint(part,tone)end
    end
    ribbonColours[box]=tone
end
-- Store only a boolean; a cached child handle could retain its weak-key parent.
local flatGroups=setmetatable({},{__mode='k'})
-- Native entry selects approved gold UI independently of illustration flags; nil keeps the legacy palette for isolated previews.
local premium=nil
function M.configure(value)premium=value=='premium' and config.premium or nil end
function M.premium()return premium~=nil end
function M.tick(box,dt)
    if not activeHalos[box] then return end
    local phase=(phases[box] or 0)+math.max(0,dt);phases[box]=phase
    local scale=.985+.065*math.sin(phase*math.pi*2/1.8)
    box:GetChild('costHalo'):SetLocalScale(scale,scale,1)
end
local function mix(a,b,k)
    local function channel(x,y)return math.floor(x+(y-x)*k+.5)end
    return {r=channel(a.r,b.r),g=channel(a.g,b.g),b=channel(a.b,b.b),a=255}
end
local function painter(platform)
    -- NodeUI permits hosts without Color; keep generated colours and update visibility/text.
    return function(control,c)if platform.color then control.imageColor=platform.color(c.r,c.g,c.b,c.a or 255)end end
end
local function flatPart(group)
    local flat=flatGroups[group]
    if flat==nil then
        flat=false
        if group.GetChildren then
            for _,child in ipairs(group:GetChildren())do if child.name=='flat' then flat=true;break end end
        end
        flatGroups[group]=flat
    end
    if flat then return group:GetChild('flat')end
end
local function paint(group,names,c,tint)
    local flat=flatPart(group)
    if flat then tint(flat,c);return end
    for _,name in ipairs(names)do tint(group:GetChild(name),c)end
end
local function identity(definition)
    if definition.originalV4 then return definition.originalV4.role end
    if definition.type=='curse' then return 'curse' end
    if definition.color=='colorless' then return 'colorless' end
    return 'traveler'
end
-- Premium chrome must not replace the grey/blue/gold rarity language.
local function frame(box,definition,look,tint)
    local rarities=config.rarities
    local rarity=rarities[definition.rarity] or rarities.basic
    local edge=rarity[1]
    if look.selected then edge=premium and premium.selected or Theme.color.goldBright end
    tint(box:GetChild('border'),edge);paint(box:GetChild('roundFrame'),roundNames,edge,tint)
    tint(box:GetChild('nameRule'),rarity[4])
    local skin=box:GetChild('skin');tint(skin:GetChild('gloss'),rarity[4])
    for i=1,config.bandSteps do tint(skin:GetChild('band'..i),mix(rarity[2],rarity[3],(i-1)/(config.bandSteps-1)))end
end
local function neutralBattleMaterial(definition)
    if Theme.presentationProfile~='official-assets-first' then return end
    if definition.type~='status' and definition.type~='curse' then return end
    return Theme.officialAssets.battleCardBodyMaterials[definition.type]
end
local function window(box,definition,accent,tint)
    local shape=definition.type
    local neutral=neutralBattleMaterial(definition)
    if neutral then shape='skill' end
    local rarity=config.rarities[definition.rarity] or config.rarities.basic
    local edge=config.rarityWindow and rarity[4] or accent
    if not windowNames[shape] then shape='attack' end
    box:GetChild('artPlate'):SetVisible(false);box:GetChild('artWell'):SetVisible(false)
    for kind,names in pairs(windowNames)do
        local group=box:GetChild('skin'):GetChild(kind);group:SetVisible(kind==shape)
        if kind==shape then
            paint(group:GetChild('edge'),names,edge,tint)
            local wells=config.artWells
            local well=neutral and neutral.artWell or wells and wells[shape] or mix(Theme.color.cardWell,accent,.05)
            paint(group:GetChild('well'),names,well,tint)
        end
    end
    paint(box:GetChild('tagEdge'),roundNames,edge,tint)
    if config.typePlate then paint(box:GetChild('tagBody'),roundNames,config.typePlate,tint)end
    tint(box:GetChild('typeEdge'),edge)
end
local function battleBody(box,definition,tint)
    if Theme.presentationProfile~='official-assets-first' then return end
    local kind=(definition.type=='status' or definition.type=='curse') and definition.type or 'red'
    if bodyMaterialKinds[box]==kind then return end
    local prior=bodyMaterialKinds[box]
    if not prior and kind=='red' then bodyMaterialKinds[box]=kind;return end -- generated chrome already has this material
    local material=Theme.officialAssets.battleCardBodyMaterials[kind]
    local body=box:GetChild('nativeCardBody')
    for _,name in ipairs({'outerBevel','paperBevel','recessShadow','innerWell'})do
        paint(body:GetChild(name),roundNames,material[name],tint)
    end
    local opacities=Theme.officialAssets.battleCardBodyLayerOpacity
    for _,name in ipairs({'topCatchlight','leftCatchlight','bottomShade'})do
        local c=material[name]
        tint(body:GetChild(name),{r=c.r,g=c.g,b=c.b,a=math.floor(opacities[name]*255+.5)})
    end
    bodyMaterialKinds[box]=kind
end
local function emblem(box,role,accent,tint)
    for key in pairs(config.roles)do
        local symbol=box:GetChild('roleMark'):GetChild(key);symbol:SetVisible(key==role)
        if key=='RD' then
            for i=1,4 do tint(symbol:GetChild('triangle'..i):GetChild('fill'),accent)end
        else paint(symbol,emblemNames[key] or {'symbol'},accent,tint)end
    end
end
local function costTone(current,base,energyBlocked,accent)
    if energyBlocked then return config.costTone.up end
    if current<base then return config.costTone.down end
    if current>base then return config.costTone.up end
    return accent
end
local function costState(look)
    local current,base=look.cost,look.baseCost
    if type(current)~='number' or type(base)~='number' then return false,0,0 end
    return current>=0 and base>=0 and current~=base,current,base
end
local function costVisibility(box,hasCost,nativeSurface)
    if Theme.presentationProfile=='official-assets-first' then
        local orb=assert(box:GetChild('nativeCostOrb'),'official battle cost orb is required')
        orb:SetVisible(hasCost and not nativeSurface)
    end
    for _,name in ipairs({'costCore','costDisc','cost'})do
        box:GetChild(name):SetVisible(hasCost and (name=='cost' or not nativeSurface))
    end
end
local function costNumberTone(tone,changed,look)
    if changed or (look.dim==true and look.blockReason=='insufficient_energy')then return tone end
    return config.costText or tone
end
local function costRingTone(tone)
    if Theme.presentationProfile~='official-assets-first' or not config.battleCostRingOpacity then return tone end
    return {r=tone.r,g=tone.g,b=tone.b,a=math.floor((tone.a or 255)*config.battleCostRingOpacity+.5)}
end
local function costs(box,definition,look,accent,platform,tint,nativeSurface)
    local changed,current,base=costState(look)
    local tone=accent
    if changed or look.dim then tone=costTone(current,base,look.dim==true and look.blockReason=='insufficient_energy',accent)end
    tint(box:GetChild('costDisc'),costRingTone(tone));tint(box:GetChild('costHalo'),tone)
    local numberTone=costNumberTone(tone,changed,look)
    if platform.color then box:GetChild('cost').fontColor=platform.color(numberTone.r,numberTone.g,numberTone.b,255)end
    local hasCost=definition.cost~=-2
    costVisibility(box,hasCost,nativeSurface)
    activeHalos[box]=changed and hasCost
    box:GetChild('costHalo'):SetVisible(changed and hasCost)
    local direction=box:GetChild('costDirection');direction:SetVisible(changed and hasCost)
    direction.text=changed and (current<base and '↓' or '↑') or ''
    if platform.color then direction.fontColor=platform.color(tone.r,tone.g,tone.b,255)end
end
local blockedCopy={insufficient_energy='能量不足',invalid_target='请选择目标',
    not_player_turn='本回合不能打出',unplayable_card='本回合不能打出',normality_limit='本回合不能打出',entangled='本回合不能打出',
    requires_only_attacks='条件未满足',requires_empty_draw_pile='条件未满足'}
local function sizeRounded(group,w,h,r)
    local flat=flatPart(group)
    if flat then flat:SetSizeDelta(w,h);return end
    group:GetChild('vertical'):SetSizeDelta(w-r*2,h)
    group:GetChild('horizontal'):SetSizeDelta(w,h-r*2)
    for _,x in ipairs({-1,1})do for _,y in ipairs({-1,1})do
        group:GetChild('corner'..x..'_'..y):SetAnchoredPosition(x*(w/2-r),y*(h/2-r))
    end end
end
local function blockedState(box,look)
    local shown=look.dim==true and not look.overlayCovered
    local original=Theme.presentationProfile=='official-assets-first' and look.surfaceScope=='battle'
    box:GetChild('blockedVeil'):SetVisible(shown)
    for _,name in ipairs({'blockedPill','blockedLock','blockedReason'})do box:GetChild(name):SetVisible(shown and not original)end
    if original then return end
    local reason=box:GetChild('blockedReason')
    reason.text=look.reason or blockedCopy[look.blockReason] or '当前不可打出'
    if not shown then return end
    local style=config.blocked
    -- 原生 CJK 字形含字距/内边距，按字号直接相乘会截成「能量不」；用 glyphScale 留足宽度。
    local _,count=reason.text:gsub('[%z\1-\127\194-\244][\128-\191]*','')
    local width=math.min(style.pill[1],math.ceil(count*Theme.font.minimum*(style.glyphScale or 1))+style.padding*2+style.lock[1]+style.gap)
    if pillWidths[box]==width then return end
    local pill=box:GetChild('blockedPill');pill:SetSizeDelta(width,style.pill[2])
    sizeRounded(pill:GetChild('edge'),width,style.pill[2],style.pillRadius)
    sizeRounded(pill:GetChild('body'),width-style.stroke*2,style.pill[2]-style.stroke*2,style.pillRadius-style.stroke)
    box:GetChild('blockedLock'):SetAnchoredPosition(-width/2+style.padding+style.lock[1]/2,style.pillY)
    reason:SetSizeDelta(width-style.padding*2-style.lock[1]-style.gap,Theme.layout.nativeText.lineHeight)
    pillWidths[box]=width
end
surfaceDecorations=function(box,ready)
    if surfaceVisibility[box]==ready then return end
    for _,name in ipairs({'roundShadow','roundFrame','roundBody','nameBand','nameRule','roleRing','roleMark','tagEdge','tagBody'})do
        box:GetChild(name):SetVisible(not ready)
    end
    local skin=box:GetChild('skin')
    skin:GetChild('gloss'):SetVisible(not ready)
    for i=1,config.bandSteps do skin:GetChild('band'..i):SetVisible(not ready)end
    for kind in pairs(windowNames)do skin:GetChild(kind):GetChild('edge'):SetVisible(not ready)end
    surfaceVisibility[box]=ready
end
function M.apply(box,definition,platform,look)
    look=look or {}
    local role=identity(definition)
    local accent=(config.roles[role] or config.roles.traveler).accent
    local tint=painter(platform)
    if Theme.presentationProfile=='official-assets-first' then
        M.paintBanner(box,definition,tint)
        if platform.color then
            local ink=Theme.officialAssets.battleCardTitleInk
            box:GetChild('name').fontColor=platform.color(ink.r,ink.g,ink.b,255)
        end
    end
    local key=table.concat({role,definition.rarity or 'basic',definition.type or 'status',tostring(look.dim),tostring(look.selected),tostring(premium~=nil),tostring(look.surfaceScope)},':')
    if decorations[box]~=key then
        frame(box,definition,look,tint);window(box,definition,accent,tint)
        battleBody(box,definition,tint)
        emblem(box,role,accent,tint);decorations[box]=key
    end
    local rarities=config.rarities
    tint(box:GetChild('nameRule'),(rarities[definition.rarity] or rarities.basic)[4])
    local nativeSurface=surfaceEnabled and surface:apply(box,definition,look.surfaceScope)
    if surfaceEnabled then surfaceHasCost[box]=definition.cost~=-2 end
    if surfaceEnabled then surfaceDecorations(box,nativeSurface)end
    costs(box,definition,look,accent,platform,tint,nativeSurface)
    local typeInk=config.typeInk or accent
    if platform.color then box:GetChild('type').fontColor=platform.color(typeInk.r,typeInk.g,typeInk.b,255)end
    blockedState(box,look)
end
return M
