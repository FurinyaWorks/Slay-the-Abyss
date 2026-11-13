-- Isolated candidate checkpoint, NOT installed in Actor.damage.
-- Caller supplies the amount remaining after ordinary Block. No HP mutation.
local M={}
local kinds={ordinary_attack=true,retaliation=true,hp_loss=true,environment=true,instant_kill=true}
local function integer(n,max)
    return type(n)=='number' and n==n and n>=0 and n<=max and n%1==0
end
function M.resolve(jade,remaining,kind,sourceSide,targetSide)
    assert(integer(jade,20),'invalid jade')
    assert(integer(remaining,2147483647),'invalid checkpoint amount')
    assert(kinds[kind] and (sourceSide=='enemy' or sourceSide=='player' or sourceSide=='environment') and (targetSide=='player' or targetSide=='enemy'),'invalid checkpoint context')
    local eligible=kind=='ordinary_attack' and sourceSide=='enemy' and targetSide=='player'
    local absorbed=eligible and math.min(jade,remaining) or 0
    return {jade=jade-absorbed,remaining=remaining-absorbed,absorbed=absorbed}
end
return M
