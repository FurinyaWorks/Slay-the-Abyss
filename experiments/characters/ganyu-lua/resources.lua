-- Isolated resource/host-hook proposal. No shared registration or actor mutation.
local M={}
local MAX=2147483647
local function int(x,min)assert(type(x)=='number'and x==x and x%1==0 and x>=(min or 0)and x<=MAX,'invalid Ganyu integer');return x end
local function plain(x)assert(type(x)=='table'and getmetatable(x)==nil,'expected plain Ganyu record')end
local function keys(x,allowed)plain(x);for k in pairs(x)do assert(allowed[k],'unknown Ganyu field')end end
local function resource(r)
 keys(r,{charge=true,storm=true,lastOwnerEnd=true});int(r.charge);assert(r.charge<=2,'charge over cap')
 if r.lastOwnerEnd~=nil then int(r.lastOwnerEnd,1)end
 local out={charge=r.charge,lastOwnerEnd=r.lastOwnerEnd}
 if r.storm then keys(r.storm,{amount=true,turns=true});out.storm={amount=int(r.storm.amount),turns=int(r.storm.turns,1)}end
 return out
end
function M.initial()return {charge=0}end
function M.plan(r,e)
 local after=resource(r);plain(e);local effects={}
 if e.op=='charge'then
  keys(e,{op=true,amount=true});after.charge=math.min(2,after.charge+int(e.amount))
 elseif e.op=='storm'then
  keys(e,{op=true,amount=true,turns=true});local amount,turns=int(e.amount),int(e.turns,1)
  after.storm={amount=math.max(after.storm and after.storm.amount or 0,amount),turns=math.max(after.storm and after.storm.turns or 0,turns)}
 elseif e.op=='charged_shot'then
  keys(e,{op=true,direct=true,bloom=true});int(e.direct);int(e.bloom)
  effects[1]={op='damage',value=e.direct}
  if after.charge==2 then after.charge=0;effects[2]={op='damageAll',value=e.bloom}end
 else error('unsupported Ganyu resource effect')end
 return {after=after,effects=effects}
end
-- Caller must commit this plan only once under the real endTurn transaction.
-- Bank is before discard; tick effects are scheduled AFTER discard and BEFORE enemy attacks.
function M.ownerEnd(r,turn,energy,equipped)
 local after=resource(r);int(turn,1);int(energy);assert(type(equipped)=='boolean','invalid relic flag')
 assert(not after.lastOwnerEnd or turn>after.lastOwnerEnd,'duplicate or stale owner end')
 if equipped then after.charge=math.min(2,after.charge+energy)end
 after.lastOwnerEnd=turn
 local effects={}
 if after.storm then
  effects[1]={op='damageAll',value=after.storm.amount};after.storm.turns=after.storm.turns-1
  if after.storm.turns==0 then after.storm=nil end
 end
 return {after=after,energyAfter=0,afterDiscard=effects}
end
return M
