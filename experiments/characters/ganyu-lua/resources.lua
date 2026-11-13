-- Isolated resource/host-hook proposal. No shared registration or actor mutation.
local M={}
local MAX=2147483647
local function int(x,min)assert(type(x)=='number'and x==x and x%1==0 and x>=(min or 0)and x<=MAX,'invalid Ganyu integer');return x end
local function plain(x)assert(type(x)=='table'and getmetatable(x)==nil,'expected plain Ganyu record')end
local function keys(x,allowed)plain(x);for k in pairs(x)do assert(allowed[k],'unknown Ganyu field')end end
local function resource(r)
 keys(r,{charge=true,storm=true,lastOwnerEnd=true,lastBank=true});int(r.charge);assert(r.charge<=2,'charge over cap')
 if r.lastOwnerEnd~=nil then int(r.lastOwnerEnd,1)end
 if r.lastBank~=nil then int(r.lastBank,1)end
 local out={charge=r.charge,lastOwnerEnd=r.lastOwnerEnd,lastBank=r.lastBank}
 if r.storm~=nil then keys(r.storm,{amount=true,turns=true});out.storm={amount=int(r.storm.amount),turns=int(r.storm.turns,1)}end
 return out
end
function M.initial()return {charge=0}end
function M.plan(r,e)
 local after=resource(r);plain(e);local effects={}
 if e.op=='charge'then
  keys(e,{op=true,amount=true});after.charge=after.charge+math.min(2-after.charge,int(e.amount))
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
-- Separate host commit boundaries: never consume a storm tick before discard.
function M.bankBeforeDiscard(r,turn,energy,equipped)
 local after=resource(r);int(turn,1);int(energy);assert(type(equipped)=='boolean','invalid relic flag')
 assert(not after.lastBank or after.lastBank==after.lastOwnerEnd,'unfinished bank stage')
 assert(not after.lastBank or turn>after.lastBank,'duplicate or stale bank')
 assert(not after.lastOwnerEnd or turn>after.lastOwnerEnd,'stale owner end')
 if equipped then after.charge=after.charge+math.min(2-after.charge,energy)end
 after.lastBank=turn
 return {after=after,energyAfter=0}
end
function M.stormAfterDiscard(r,turn)
 local after=resource(r);int(turn,1)
 assert(after.lastBank==turn,'bank stage not committed')
 assert(not after.lastOwnerEnd or turn>after.lastOwnerEnd,'duplicate or stale storm')
 after.lastOwnerEnd=turn
 local effects={}
 if after.storm then
  effects[1]={op='damageAll',value=after.storm.amount};after.storm.turns=after.storm.turns-1
  if after.storm.turns==0 then after.storm=nil end
 end
 return {after=after,afterDiscard=effects}
end
-- Convenience only for isolated fixtures; production host must call both stages separately.
function M.ownerEnd(r,turn,energy,equipped)
 local bank=M.bankBeforeDiscard(r,turn,energy,equipped)
 local tick=M.stormAfterDiscard(bank.after,turn);tick.energyAfter=bank.energyAfter;return tick
end
return M
