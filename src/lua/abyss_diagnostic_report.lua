-- On-demand, read-only mobile QA snapshot. Not an FPS or memory profiler.
-- No clipboard, file I/O, network, sampling loop, or mutation of Run state.
local M = {}
M.__index = M

local function value(item)
    if type(item) == 'number' then
        if item ~= item or item == math.huge or item == -math.huge then return '?' end
    elseif type(item) ~= 'string' then return '-' end
    return tostring(item):gsub('[%c]', ' ')
end

local function count(items)
    return type(items) == 'table' and tostring(#items) or '-'
end

local function screen(platform)
    if not platform or type(platform.getViewport) ~= 'function' then return '-' end
    local ok,w,h = pcall(platform.getViewport)
    if not ok or type(w) ~= 'number' or type(h) ~= 'number' then return '-' end
    return value(w) .. 'x' .. value(h)
end

local function device(platform)
    if not platform or type(platform.touchScreen) ~= 'function' then return 'unknown' end
    local ok,isMobile = pcall(platform.touchScreen)
    return ok and (isMobile and 'mobile' or 'non-mobile') or 'unknown'
end

function M.new(version)
    return setmetatable({version=value(version), recent={}, last=nil},{__index=M})
end

function M:observe(mode,run)
    local key=value(mode)..'/'..value(run and run.phase)
    if key==self.last then return false end
    self.last=key
    self.recent[#self.recent+1]=key
    if #self.recent>3 then table.remove(self.recent,1) end
    return true
end

function M:lines(ui,platform)
    local run,battle,view=ui.run,ui.run and ui.run.combat,ui.battleUI
    local map=ui.map
    local gesture=view and (view.gesture or view.carry) and 'active' or 'none'
    local recent=#self.recent>0 and table.concat(self.recent,' > ') or '-'
    local exit=ui.exitError and value(ui.exitError) or 'none observed'
    return {
        '版本: '..value(self.version),
        '设备: '..device(platform)..'  画布: '..screen(platform),
        '页面: '..value(ui.mode)..'  阶段: '..value(run and run.phase),
        '角色: '..value(run and run.character)..'  种子: '..value(ui.runSeed),
        '幕: '..value(run and run.act)..'  楼层: '..value(map and map.floor),
        '生命: '..value(run and run.hp)..'/'..value(run and run.maxHp)..'  金币: '..value(run and run.gold),
        '战斗: 回合 '..value(battle and battle.turn)..'  手牌 '..count(battle and battle.hand)..'  敌人 '..count(battle and battle.enemies),
        '输入: 选牌 '..value(view and view.selected)..'  目标 '..value(view and view.target)..'  手势 '..gesture,
        '最近页面: '..recent,
        '退出异常: '..exit,
    }
end

function M:render(panel,ui,platform)
    local lines=self:lines(ui,platform)
    for i=1,10 do
        panel:GetChild('line'..i).text=lines[i]
    end
end

return M
