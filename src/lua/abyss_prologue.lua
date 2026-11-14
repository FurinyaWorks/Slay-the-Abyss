-- Short Liyue interstitial. Reuses the opening panel and host OnUpdate/covering gates.
-- Sentence helpers remain shared by the merchant; no narrative or rule data changes.
local Theme = require('abyss_theme')
local M = {}
local P = Theme.layout.prologue

-- Splits approved copy after each 。 or …… without changing, adding or dropping a character.
function M.beats(text)
    local beats, start, i = {}, 1, 1
    while i <= #text do
        local stop
        if text:sub(i, i + 2) == "。" then stop = i + 2
        elseif text:sub(i, i + 5) == "……" then stop = i + 5 end
        if stop then
            beats[#beats + 1] = text:sub(start, stop)
            start, i = stop + 1, stop + 1
        else i = i + 1 end
    end
    if start <= #text then beats[#beats + 1] = text:sub(start) end
    return beats
end
function M.chars(text)
    local list = {}
    for ch in text:gmatch("[%z\1-\127\194-\244][\128-\191]*") do list[#list + 1] = ch end
    return list
end

local function clamp(p) return math.max(0, math.min(1, p)) end
local function smooth(p) p=clamp(p);return p*p*(3-2*p) end

function M.new(panel, options)
    local state = {playing=false}
    local fade, seal = panel:GetChild('fade'), panel:GetChild('seal')
    local function tint(control,c,alpha)
        control.imageColor=options.color(c.r,c.g,c.b,math.floor(255*clamp(alpha)+0.5))
    end
    local function changed() if options.onPhase then options.onPhase() end end
    function state:covering() return self.playing end
    function state:opaque() return self.playing and self.phase=='hold' end
    function state.resize(_,width,height)
        local scale=math.min(width/Theme.canvas.base[1],height/Theme.canvas.base[2])
        fade:SetSizeDelta(width/scale,height/scale)
        panel:GetChild('blocker'):SetSizeDelta(width/scale,height/scale)
    end
    function state:pose()
        local t=self.t
        local alpha=self.phase=='cover' and smooth(t/P.fadeIn)
            or self.phase=='reveal' and 1-smooth((t-P.fadeIn-P.hold)/P.reveal) or 1
        tint(fade,P.shade,alpha)
        local mark=math.min(smooth((t-P.fadeIn)/P.markIn),smooth((P.fadeIn+P.hold-t)/P.markOut))
        for _,name in ipairs({'icon','ruleLeft','ruleRight'}) do tint(seal:GetChild(name),P.ink,mark) end
        local scale=P.scaleFrom+(1-P.scaleFrom)*smooth((t-P.fadeIn)/P.hold)
        seal:SetLocalScale(scale,scale,1)
    end
    function state:play(commit)
        if self.playing then return false end
        self.playing,self.phase,self.t,self.commit=true,'cover',0,commit
        self:pose();panel:SetVisible(true)
        return true
    end
    function state:cancel()
        if not self.playing then return false end
        self.playing,self.phase,self.commit=false,nil,nil
        panel:SetVisible(false)
        if options.onCancel then options.onCancel() end
        return true
    end
    function state:update(dt)
        if not self.playing then return end
        self.t=self.t+dt
        if self.phase=='cover' and self.t>=P.fadeIn then
            self.phase='hold'
            self:pose()
            local commit=self.commit;self.commit=nil
            local ok,accepted=pcall(commit)
            if not ok or accepted==false then
                self:cancel();changed()
                if not ok then error(accepted) end
                return
            end
        end
        if self.t>=P.fadeIn+P.hold+P.reveal then self:cancel();changed();return end
        if self.phase=='hold' and self.t>=P.fadeIn+P.hold then self.phase='reveal';changed() end
        self:pose()
    end
    -- The shield stays raycastable even when its picture is fully transparent.
    panel:GetChild('blocker'):AddCursorEventListener(options.clickEvent,function()return true end)
    panel:SetVisible(false)
    return state
end
return M
