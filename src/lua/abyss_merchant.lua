-- Shop merchant figure and head-relative speech bubble. Presentation only: every line is the
-- approved Lore v2 merchant copy, said in reaction to a transaction the node UI has
-- already completed or refused. It never blocks, delays or replaces shop input.
local Theme = require("abyss_theme")
local Narrative = require("abyss_narrative")
local Prologue = require("abyss_prologue")
local M = {}
local L, C = Theme.layout.merchant, Theme.color
local copy = Narrative.merchant
-- Narration is the scene-setting paragraph; everything else is the merchant speaking.
local lines = { encounter = copy.encounter, greet = copy.greet, buy = copy.purchaseSuccess,
    poor = copy.insufficientGold, leave = copy.leave, idle = copy.originHint }
local cues = { buy = "merchant_buy", poor = "merchant_deny" }

local function clamp(value) return math.max(0, math.min(1, value)) end
local function pageEnd(current)return math.min(#current.chars,(current.page or 1)*L.pageCharacters)end

-- options.color, options.sound. box is the merchant container from merchantControl().
function M.new(box, options)
    options = options or {}
    local merchant = { visible = false, queue = {}, met = setmetatable({}, { __mode = "k" }) }
    local portrait, line = box:GetChild("portrait"), box:GetChild("line")
    local bubble = L.bubble and box:GetChild("bubble")
    local function colour(c, alpha)
        return options.color(c.r, c.g, c.b, math.floor((c.a or 255) * clamp(alpha or 1) + 0.5))
    end
    local function tint(control, c, alpha) if options.color then control.imageColor = colour(c, alpha) end end
    local function ink(control, c, alpha) if options.color then control.fontColor = colour(c, alpha) end end

    local function begin(kind)
        local narration = kind == "encounter"
        local text = narration and lines[kind] or "「" .. lines[kind] .. "」"
        merchant.current = { kind = kind, narration = narration, chars = Prologue.chars(text), shown = 0, hold = 0, page=1 }
        merchant.idle = 0
        merchant.nod, merchant.shake = nil, nil
        if cues[kind] and options.sound then pcall(options.sound, cues[kind]) end
        if kind == "buy" then merchant.nod = 0 elseif kind == "poor" then merchant.shake = 0 end
    end
    -- First visit in a run opens with the scene narration; later shops start at the greeting.
    function merchant:enter(run)
        local first = not self.met[run]
        self.met[run], self.idleUsed = true, false
        self.queue = first and { "greet" } or {}
        begin(first and "encounter" or "greet")
        self:pose()
    end
    -- A reaction interrupts whatever is being said so repeated buying always gets instant feedback.
    function merchant:react(kind)
        if not lines[kind] then return false end
        self.queue = {}
        begin(kind)
        self:pose()
        return true
    end
    function merchant:tap()
        local current = self.current
        if not self.visible or not current then return false end
        if current.dismissed then current.page, current.shown, current.hold, current.dismissed = 1, 0, 0, false
        elseif current.shown < pageEnd(current) then current.shown = pageEnd(current)
        elseif pageEnd(current)<#current.chars then current.page=current.page+1;current.hold=0
        elseif #self.queue > 0 then begin(table.remove(self.queue, 1))
        elseif bubble then current.dismissed = true
        else return false end
        self:pose()
        return true
    end
    function merchant:setVisible(value)
        self.visible = value == true
        box:SetVisible(self.visible)
        if self.visible then self:pose() end
    end

    local function paintSpeech(current)
        local count = math.min(pageEnd(current), math.floor(current.shown))
        line.text = table.concat(current.chars, "", (current.page-1)*L.pageCharacters+1, count)
        local speaking = not current.dismissed
        if bubble then bubble:SetVisible(speaking); line:SetVisible(speaking) end
        ink(line, bubble and L.bubble.ink or (current.narration and C.textDim or C.text))
        box:GetChild("name"):SetVisible(not bubble and not current.narration)
        box:GetChild("namePlate"):SetVisible(not bubble and not current.narration)
        local more = speaking and count >= pageEnd(current) and (pageEnd(current)<#current.chars or #merchant.queue > 0)
        local marker = box:GetChild("next")
        marker:SetVisible(more)
        return marker,more
    end
    function merchant:pose()
        local current = self.current
        if not self.visible or not current then return end
        local marker,more=paintSpeech(current)
        -- Nod on a sale, a short head shake when the purse is short; both settle back to rest.
        -- Theme frames are node-panel units; the portrait moves inside the merchant frame.
        local x, y = L.portrait[1] - L.frame[1], L.portrait[2] - L.frame[2]
        if self.nod then y = y - L.nodLift * math.sin(math.pi * clamp(self.nod / L.nod)) end
        if self.shake then
            local p = clamp(self.shake / L.shake)
            x = x + L.shakeAmplitude * math.sin(p * math.pi * 4) * (1 - p)
        end
        portrait:SetAnchoredPosition(x, y)
        local dx, dy = x - (L.portrait[1] - L.frame[1]), y - (L.portrait[2] - L.frame[2])
        if bubble then
            bubble:SetAnchoredPosition(L.box[1] - L.frame[1] + dx, L.box[2] - L.frame[2] + dy)
            line:SetAnchoredPosition(L.line[1] - L.frame[1] + dx, L.line[2] - L.frame[2] + dy)
        end
        if more then
            marker:SetAnchoredPosition(L.next[1] - L.frame[1] + dx, L.next[2] - L.frame[2] + dy + 3 * math.sin((self.clock or 0) * 6))
        end
        local flicker = 0.4 + 0.08 * math.sin((self.clock or 0) * 7) + 0.05 * math.sin((self.clock or 0) * 13)
        tint(portrait:GetChild("lanternGlow"), C.merchant.lantern, flicker)
    end

    local function advanceSpeech(current,dt)
        if not current.dismissed then
            if current.shown < pageEnd(current) then
                current.shown = math.min(pageEnd(current), current.shown + dt * L.typeRate)
            else
                current.hold = current.hold + dt
                if current.hold>=L.hold and pageEnd(current)<#current.chars then current.page=current.page+1;current.hold=0
                elseif #merchant.queue > 0 and current.hold >= L.hold then begin(table.remove(merchant.queue, 1))
                elseif bubble and current.hold >= L.hold then current.dismissed = true end
            end
        end
    end
    function merchant:update(dt)
        if not self.visible or not self.current then return end
        self.clock = (self.clock or 0) + dt
        local current = self.current
        advanceSpeech(current,dt)
        -- One unprompted remark if the player lingers; never repeated, never a new button.
        self.idle = (self.idle or 0) + dt
        if not self.idleUsed and #self.queue == 0 and self.idle >= L.idle and current.kind ~= "leave"
            and (not bubble or current.dismissed) then
            self.idleUsed = true
            begin("idle")
        end
        if self.nod then self.nod = self.nod + dt; if self.nod >= L.nod then self.nod = nil end end
        if self.shake then self.shake = self.shake + dt; if self.shake >= L.shake then self.shake = nil end end
        self:pose()
    end
    box:SetVisible(false)
    return merchant
end
return M
