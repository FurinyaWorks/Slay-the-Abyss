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
    local fade, scene = panel:GetChild('fade'), panel:GetChild('scene')
    local function tint(control,c,alpha)
        control.imageColor=options.color(c.r,c.g,c.b,math.floor(255*clamp(alpha)+0.5))
    end
    local function changed() if options.onPhase then options.onPhase() end end
    function state:covering() return self.playing end
    function state:opaque() return self.playing and (self.phase=='hold' or self.phase=='close') end
    function state.resize(_,width,height)
        local scale=math.min(width/Theme.canvas.base[1],height/Theme.canvas.base[2])
        fade:SetSizeDelta(width/scale,height/scale)
        scene:GetChild('shade'):SetSizeDelta(width/scale,height/scale)
        panel:GetChild('blocker'):SetSizeDelta(width/scale,height/scale)
    end
    function state:pose()
        local alpha=self.phase=='cover' and smooth(self.t/P.fadeIn)
            or self.phase=='hold' and 1-smooth(self.t/P.markIn)
            or self.phase=='close' and smooth(self.t/P.markOut)
            or 1-smooth(self.t/P.reveal)
        tint(fade,P.shade,alpha)
        local visible=self.phase=='hold' or self.phase=='close'
        if visible~=self.sceneVisible then scene:SetVisible(visible);self.sceneVisible=visible end
        local lit=math.floor(self.displayed+0.000001)
        if lit~=self.lit then
            for i=1,7 do tint(scene:GetChild('element'..i),i<=lit and P.ink or P.dim,1) end
            self.lit=lit
        end
    end
    function state:play(commit)
        if self.playing then return false end
        self.playing,self.phase,self.t,self.elapsed,self.commit=true,'cover',0,0,commit
        self.displayed,self.target,self.lit=0,0,nil
        self:pose();panel:SetVisible(true)
        print('ABYSS_TRANSITION begin')
        return true
    end
    function state:cancel()
        if not self.playing then return false end
        self.playing,self.phase,self.commit=false,nil,nil
        panel:SetVisible(false)
        if options.onCancel then options.onCancel() end
        return true
    end
    function state:prepare()
        self.phase,self.t='hold',0
        self:pose()
        local commit=self.commit;self.commit=nil
        local ok,accepted=pcall(commit)
        if not ok or accepted==false then
            self:cancel();changed()
            if not ok then error(accepted) end
        end
        -- Readiness is checked on a subsequent Host update, after destination refresh.
    end
    function state:wait(dt)
        local target=7
        if options.progress then target=options.progress() end
        assert(type(target)=='number' and target>=0 and target<=7,'invalid opening preparation stage')
        if target==7 and self.target<7 then print('ABYSS_TRANSITION ready elapsed='..self.elapsed) end
        self.target=math.max(self.target,target)
        -- Smooth completed work only. An unfinished stage never lights ahead of actual work.
        self.displayed=math.min(self.target,self.displayed+dt/P.elementStep)
        if target==7 and self.displayed>=7 and self.t>=P.markIn then
            self.phase,self.t='close',0
            print('ABYSS_TRANSITION complete elapsed='..self.elapsed)
        end
    end
    function state:update(dt)
        if not self.playing then return end
        self.t,self.elapsed=self.t+dt,self.elapsed+dt
        if self.phase=='cover' then
            if self.t>=P.fadeIn then self:prepare() end
        elseif self.phase=='hold' then self:wait(dt)
        elseif self.phase=='close' then
            if self.t>=P.markOut then self.phase,self.t='reveal',0;changed() end
        elseif self.t>=P.reveal then
            print('ABYSS_TRANSITION end elapsed='..self.elapsed)
            self:cancel();changed()
        end
        if self.playing then self:pose() end
    end
    panel:GetChild('blocker'):AddCursorEventListener(options.clickEvent,function()return true end)
    panel:SetVisible(false)
    return state
end
return M
