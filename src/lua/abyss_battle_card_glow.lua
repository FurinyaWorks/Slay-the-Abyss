-- Four preallocated CardGlowBorder silhouettes: 1.2s lifetime / 0.3s emission.
-- The state cannot retain its weak card key via native handle wrappers.
local Theme=require('abyss_theme')
local M={}
local states=setmetatable({},{__mode='k'})
local parts={'vertical','horizontal','corner-1_-1','corner-1_1','corner1_-1','corner1_1'}
local LAYERS=4
local function layerName(index)return index==1 and 'pulseEdge' or 'pulseEdge'..index end
local function layer(box,state,index)
    local key=(index-1)*7+1
    local pulse=state.refs[key]
    if not pulse then
        pulse=assert(box:GetChild('nativePlayableRim'):GetChild(layerName(index)),'official glow pulse required')
        state.refs[key]=pulse
    end
    return pulse,key
end
function M.clear(box)
    local state=states[box]
    if not state then return end
    states[box]=nil
    if box.alive==false then return end
    for index=1,LAYERS do
        local pulse=layer(box,state,index)
        if pulse.alive~=false then pulse:SetVisible(false)end
    end
end
function M.bind(box,rim,enabled,color)
    if not enabled or not color then M.clear(box);return end
    if states[box]then return end
    local state={elapsed=0,refs=setmetatable({},{__mode='v'}),color=color}
    for index=1,LAYERS do
        local pulse=assert(rim:GetChild(layerName(index)),'official glow pulse required')
        local key=(index-1)*7+1
        state.refs[key]=pulse
        for part,name in ipairs(parts)do state.refs[key+part]=pulse:GetChild(name)end
        pulse:SetVisible(false)
    end
    states[box]=state
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
    local alpha=math.floor(style.alpha*remaining/style.duration*255+.5)
    for part,name in ipairs(parts)do
        local control=state.refs[key+part] or pulse:GetChild(name)
        if control.alive==false then return false end
        state.refs[key+part]=control
        control.imageColor=state.color(c.r,c.g,c.b,alpha)
    end
    return true
end
function M.tick(box,dt)
    local state=states[box]
    if not state then return end
    if box.alive==false then states[box]=nil;return end
    local style=Theme.officialAssets.battleCardChrome.glow
    state.elapsed=state.elapsed+math.max(0,dt)
    local interval=style.duration/LAYERS
    for index=1,LAYERS do
        local age=state.elapsed-(index-1)*interval
        local remaining=age>=-1e-9 and style.duration-math.max(0,age)%style.duration or nil
        if not paintWave(box,state,index,remaining,style)then states[box]=nil;return end
    end
end
return M
