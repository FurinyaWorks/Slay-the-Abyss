-- Paid storm setup ABI only. Host owns payment, Snapshot and owner-end scheduling.
local R=dofile('experiments/characters/ganyu-lua/resources.lua')
local Paid=dofile('experiments/characters/ganyu-lua/queued-card.lua')
local M={}
local function validate(e)
 assert(type(e)=='table'and getmetatable(e)==nil and e.op=='ganyuStorm','invalid storm namespace')
 for k in pairs(e)do assert(k=='op'or k=='amount'or k=='turns'or k=='uid','unknown storm field')end
 R.plan({charge=0},{op='storm',amount=e.amount,turns=e.turns})
end
function M.prepare(combat,state,e,uid)
 validate(e);assert(e.uid==nil,'unprepared storm supplied uid')
 Paid.prepare(combat,state,{op='ganyuCard',kind='charge',amount=0},nil,uid)
 return {op=e.op,amount=e.amount,turns=e.turns,uid=uid}
end
function M.dispatch(combat,state,e,queue)
 validate(e);assert(e.uid~=nil,'missing storm uid')
 Paid.prepare(combat,state,{op='ganyuCard',kind='charge',amount=0},nil,e.uid)
 local plan=R.plan(state.ganyuResource,{op='storm',amount=e.amount,turns=e.turns})
 state.ganyuResource=plan.after;return true
end
return M
