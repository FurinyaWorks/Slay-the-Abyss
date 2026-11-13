-- Separate future ABI; NOT included in the frozen 03/06 host slice.
local R=dofile('experiments/characters/ganyu-lua/resources.lua')
local Paid=dofile('experiments/characters/ganyu-lua/queued-card.lua')
local M={}
local function integer(n)assert(type(n)=='number'and n==n and n%1==0 and n>=0 and n<=2147483647,'invalid Ganyu draw integer');return n end
local function validate(e)
 assert(type(e)=='table'and getmetatable(e)==nil and e.op=='ganyuDraw','invalid draw namespace')
 for k in pairs(e)do assert(k=='op'or k=='kind'or k=='amount'or k=='bonus'or k=='uid','unknown draw field')end
 assert(e.kind=='chargedDraw'or e.kind=='stormDraw'or e.kind=='spendOneDraw','unsupported draw condition')
 integer(e.amount);integer(e.bonus)
end
function M.prepare(combat,state,e,uid)
 validate(e);assert(e.uid==nil,'unprepared draw supplied uid')
 Paid.prepare(combat,state,{op='ganyuCard',kind='charge',amount=0},nil,uid)
 return {op='ganyuDraw',kind=e.kind,amount=e.amount,bonus=e.bonus,uid=uid}
end
function M.dispatch(combat,state,e,queue)
 validate(e);assert(e.uid~=nil,'missing draw uid')
 -- Reuse actual paid UID and native active-source guards without changing resources.
 Paid.prepare(combat,state,{op='ganyuCard',kind='charge',amount=0},nil,e.uid)
 local after=R.plan(state.ganyuResource,{op='charge',amount=0}).after
 local active=e.kind=='stormDraw'and after.storm~=nil or e.kind=='chargedDraw'and after.charge==2 or e.kind=='spendOneDraw'and after.charge>=1
 local n=e.amount
 if active then
  assert(e.bonus<=2147483647-n,'conditional draw overflow');n=n+e.bonus
  if e.kind=='chargedDraw'then after.charge=0 elseif e.kind=='spendOneDraw'then after.charge=after.charge-1 end
 end
 queue.pushTop(state,{kind='effect',effect={op='draw',value=n}})
 state.ganyuResource=after;return true
end
return M
