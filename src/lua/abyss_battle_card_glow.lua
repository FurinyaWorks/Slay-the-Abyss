-- Four preallocated CardGlowBorder silhouettes: 1.2s lifetime / 0.3s emission.
-- The state cannot retain its weak card key via native handle wrappers.
local Theme=require('abyss_theme')
local M={}
local states=setmetatable({},{__mode='k'})
local parts={'vertical','horizontal','vertical2','horizontal2','corner-1_-1','corner-1_1','corner1_-1','corner1_1'}
local LAYERS=4
local STRIDE=#parts+1
local function layerName(index)return index==1 and 'pulseEdge' or 'pulseEdge'..index end
local function layer(box,state,index)
    local key=(index-1)*STRIDE+1
    local pulse=state.refs[key]
    if not pulse then
        pulse=assert(box:GetChild('nativePlayableRim'):GetChild(layerName(index)),'official glow pulse required')
        state.refs[key]=pulse
    end
    return pulse,key
end
local function killNative(state)
    state.closed=true
    for _,sequence in ipairs(state.sequences or {})do sequence:Kill(false)end
    for _,tween in ipairs(state.tweens or {})do tween:Kill(false)end
    state.sequences,state.tweens={},{}
end
function M.clear(box)
    local state=states[box]
    if not state then return end
    states[box]=nil
    -- Tween handles outlive their target's alive flag. Always retire them first.
    killNative(state)
    if box.alive==false then return end
    local rim=box:GetChild('nativePlayableRim')
    if not rim or rim.alive==false then return end
    local soft=rim:GetChild('softEdge')
    if soft and soft.alive~=false then soft:SetVisible(false)end
    for index=1,LAYERS do
        local pulse=state.refs[(index-1)*STRIDE+1]or rim:GetChild(layerName(index))
        if pulse and pulse.alive~=false then pulse:SetVisible(false)end
    end
end
local function shapeOutline(group,blur)
    local k=blur/48
    for index,name in ipairs(parts)do
        local control=group:GetChild(name)
        if index<=4 then
            local vertical=index%2==1
            control:SetSizeDelta(vertical and 96 or 1024,vertical and 768 or 96)
            control:SetLocalScale(vertical and k or (132+2*blur)/1024,vertical and (192+2*blur)/768 or k,1)
        else
            local diameter=2*(9+blur)
            control:SetSizeDelta(diameter,diameter)
        end
    end
end
local function paintStatic(group,colour,color)
    for _,name in ipairs(parts)do group:GetChild(name).imageColor=color(colour.r,colour.g,colour.b,colour.a)end
end
local function applyStaticFocus(box,state,rim,focused)
    local style=Theme.officialAssets.battleCardChrome.glow.staticFocus[focused and 'selected' or 'normal']
    local soft=rim:GetChild('softEdge')
    local outer=layer(box,state,1)
    shapeOutline(soft,style.coreSoftness);shapeOutline(outer,style.pulseSoftness)
    soft:SetLocalScale(1,1,1);outer:SetLocalScale(1,1,1)
    paintStatic(soft,style.colours[1],state.color);paintStatic(outer,style.colours[2],state.color)
    soft:SetVisible(true);outer:SetVisible(true)
    state.focused=focused
end
local function applyFocus(box,state,rim,focused)
    focused=focused==true
    if state.focused==focused then return end
    if state.motion=='static' then applyStaticFocus(box,state,rim,focused);return end
    local style=Theme.officialAssets.battleGlowFocus[focused and 'selected' or 'normal']
    local soft=rim:GetChild('softEdge')
    soft:SetVisible(true)
    soft:SetLocalScale(1.04,1.03,1)
    shapeOutline(soft,style.coreSoftness)
    for index=1,LAYERS do
        local pulse=layer(box,state,index)
        shapeOutline(pulse,style.pulseSoftness)
    end
    state.focused=focused
    state.opacity=style.opacity
end
local function nativePorts(platform)
    return Theme.presentationProfile=='official-assets-first' and type(platform)=='table'
        and type(platform.tween)=='function' and type(platform.tweenSequence)=='function'
        and platform.easeTypes and platform.easeTypes.OutQuad and platform.easeTypes.Linear
end
local function startNative(state,platform)
    local style=Theme.officialAssets.battleCardChrome.glow
    local c=style.colour
    local start=style.expansion[1]+(style.expansion[2]-style.expansion[1])*(1-style.duration^2)
    local alpha=math.floor(style.alpha*state.opacity*255+.5)
    local first,last=state.color(c.r,c.g,c.b,alpha),state.color(c.r,c.g,c.b,0)
    state.tweens,state.sequences={},{}
    for index=1,LAYERS do
        local key=(index-1)*STRIDE+1
        local pulse=state.refs[key]
        pulse:SetLocalScale(start,start,1)
        local wave={}
        local function tween(target,data,ease)
            local result=platform.tween(target,data,style.duration):SetEase(ease):SetLoops(-1)
            state.tweens[#state.tweens+1]=result;wave[#wave+1]=result
        end
        tween(pulse,{localScaleX=style.expansion[2],localScaleY=style.expansion[2]},platform.easeTypes.OutQuad)
        for part=1,#parts do
            local image=state.refs[key+part];image.imageColor=first
            tween(image,{imageColor=last},platform.easeTypes.Linear)
        end
        local function play()
            if state.closed then return end
            local owner,p=state.refs[-1],state.refs[key]
            if owner and owner.alive~=false and not p then
                local rim=state.refs[0]or owner:GetChild('nativePlayableRim')
                if rim and rim.alive~=false then p=rim:GetChild(layerName(index));state.refs[key]=p end
            end
            if not owner or owner.alive==false or owner.visible==false or owner.activeInHierarchy==false
                or not p or p.alive==false then killNative(state);return end
            p:SetVisible(true)
            for _,handle in ipairs(wave)do handle:Play()end
        end
        if index==1 then play()
        else
            -- This delay runs once; it is never repeated inside the 1.2s loop.
            local sequence=platform.tweenSequence():AppendInterval((index-1)*style.duration/LAYERS):AppendCallback(play)
            state.sequences[#state.sequences+1]=sequence;sequence:Play()
        end
    end
end
local function reusableState(box,rim,identity)
    local state=states[box]
    if not state then return end
    if state.closed or state.motion~=(Theme.officialAssets.battleCardChrome.glow.motion or 'raw-source-wave')
        or identity~=nil and state.identity~=identity
        or state.refs[0] and state.refs[0]~=rim then M.clear(box);return end
    return state
end
local function createState(box,rim,platform,color,identity)
    local motion=Theme.officialAssets.battleCardChrome.glow.motion or 'raw-source-wave'
    local state={elapsed=0,refs=setmetatable({},{__mode='v'}),color=color,identity=identity,motion=motion,
        native=motion~='static' and nativePorts(platform)and true or false}
    state.refs[-1],state.refs[0]=box,rim
    for index=1,LAYERS do
        local pulse=assert(rim:GetChild(layerName(index)),'official glow pulse required')
        local key=(index-1)*STRIDE+1
        state.refs[key]=pulse
        for part,name in ipairs(parts)do state.refs[key+part]=pulse:GetChild(name)end
        pulse:SetVisible(false)
    end
    return state
end
function M.bind(box,rim,enabled,platform,focused,identity)
    local color=type(platform)=='table' and platform.color or platform
    if not enabled or not color or box.alive==false or rim.alive==false then M.clear(box);return end
    local existing=reusableState(box,rim,identity)
    if existing then
        applyFocus(box,existing,rim,focused)
        return
    end
    local state=createState(box,rim,platform,color,identity)
    states[box]=state
    applyFocus(box,state,rim,focused)
    if state.native then
        local ok,reason=pcall(startNative,state,platform)
        if not ok then M.clear(box);error(reason,0)end
    end
end
local function paintWave(box,state,index,remaining,style)
    local pulse,key=layer(box,state,index)
    if pulse.alive==false then return false end
    local visible=remaining~=nil
    if pulse.visible~=visible then pulse:SetVisible(visible)end
    if not remaining then return true end
    -- CardGlowBorder.pow2Out(1-duration), including the initial undershoot.
    local scale=style.expansion[1]+(style.expansion[2]-style.expansion[1])*(1-remaining*remaining)
    pulse:SetLocalScale(scale,scale,1)
    local c=style.colour
    local alpha=math.floor(style.alpha*remaining/style.duration*state.opacity*255+.5)
    local colour=state.color(c.r,c.g,c.b,alpha)
    for part,name in ipairs(parts)do
        local control=state.refs[key+part] or pulse:GetChild(name)
        if control.alive==false then return false end
        state.refs[key+part]=control
        control.imageColor=colour
    end
    return true
end
function M.tick(box,dt)
    local state=states[box]
    if not state then return end
    if state.closed or box.alive==false or box.visible==false or box.activeInHierarchy==false then M.clear(box);return end
    -- Native owns the fixed Tweens after bind: no per-frame allocations or
    -- colour writes. SDK loop-end/8-bit colour quantization differs from Lua.
    if state.native or state.motion=='static' then return end
    local style=Theme.officialAssets.battleCardChrome.glow
    state.elapsed=state.elapsed+math.max(0,dt)
    local interval=style.duration/LAYERS
    for index=1,LAYERS do
        local age=state.elapsed-(index-1)*interval
        local remaining=age>=-1e-9 and style.duration-math.max(0,age)%style.duration or nil
        if not paintWave(box,state,index,remaining,style)then M.clear(box);return end
    end
end
return M
