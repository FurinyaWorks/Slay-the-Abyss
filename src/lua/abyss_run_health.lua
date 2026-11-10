-- Permanent healing owns its modifier, validation and actual-HP write order.
-- Run augments this public table, preserving dynamic Run.heal replacements.
local M={}
local function amount(n)return type(n)=='number' and n==n and n%1==0 and n>=0 and n<=2147483647 end
function M.heal(run,value)
    assert(amount(value),'invalid heal')
    value=require('abyss_potion_health').modifyHealing(value,run.relics,run.phase=='combat')
    local before=run.hp;run.hp=math.min(run.maxHp,run.hp+0.0+value);return run.hp-before
end
return M
