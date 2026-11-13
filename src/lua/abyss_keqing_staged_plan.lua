-- Pure KQ003 plan only: no resource writes, queue imports or payment claims.
local M={}
local function integer(n,lo,hi)return type(n)=='number'and n%1==0 and n>=lo and n<=hi end
local function uid(v)return integer(v,1,2147483647)or type(v)=='string'and #v>0 and #v<=128 end
local function exact(t,required,optional)
 if type(t)~='table'or getmetatable(t)then return false end
 for k in pairs(t)do if not required[k]and not(optional and optional[k])then return false end end
 for k in pairs(required)do if rawget(t,k)==nil then return false end end
 return true
end
local ops={consumeWedge=true,rawDamage=true,setWedgeUntil=true,deferInfusion=true}
function M.validateAction(a,binding,step)
 assert(exact(binding,{turn=true,uid=true,playId=true})and integer(binding.turn,1,999999)and uid(binding.uid)and uid(binding.playId),'invalid binding')
 assert(integer(step,1,3)and exact(a,{op=true,turn=true,uid=true,step=true,value=true,playId=true}),'invalid action schema')
 assert(ops[a.op]and a.turn==binding.turn and a.uid==binding.uid and a.playId==binding.playId and a.step==step,'stale or reordered action')
 assert(integer(a.value,0,1000000),'invalid action value')
 if a.op=='consumeWedge'then assert(a.value==1 and step==1,'invalid consume action')
 elseif a.op=='setWedgeUntil'then assert(a.value==binding.turn+1 and step==2,'invalid setup action')
 elseif a.op=='deferInfusion'then assert(a.value==2 and step==3,'invalid deferred infusion')
 else assert(a.value<=999 and(step==1 or step==2),'invalid raw damage')end
 return true
end
function M.plan(input,contract)
 assert(exact(input,{turn=true,uid=true,upgraded=true,infusion=true,playId=true},{wedgeUntil=true}),'invalid plan input')
 assert(integer(input.turn,1,999999)and uid(input.uid)and uid(input.playId)and type(input.upgraded)=='boolean'and integer(input.infusion,0,2),'invalid plan values')
 assert(input.wedgeUntil==nil or integer(input.wedgeUntil,input.turn,input.turn+1),'invalid plan wedge')
 assert(exact(contract,{base=true,upgraded=true,bonusPerHit=true}),'invalid plan contract')
 assert(contract.bonusPerHit==2,'unsupported infusion bonus')
 for _,key in ipairs({'base','upgraded'})do
  local f=contract[key];assert(exact(f,{setup=true,release=true,attacks=true})and integer(f.setup,0,999)and integer(f.release,0,999)and f.attacks==2,'invalid plan face')
 end
 local face=contract[input.upgraded and'upgraded'or'base'];local binding={turn=input.turn,uid=input.uid,playId=input.playId};local actions={}
 local function add(op,value)local a={op=op,value=value,step=#actions+1,turn=input.turn,uid=input.uid,playId=input.playId};M.validateAction(a,binding,a.step);actions[#actions+1]=a end
 if input.wedgeUntil then add('consumeWedge',1);add('rawDamage',face.release);add('deferInfusion',face.attacks)
 else add('rawDamage',face.setup);add('setWedgeUntil',input.turn+1)end
 return {binding=binding,context={turn=input.turn,uid=input.uid,playId=input.playId,oldInfusion=input.infusion,bonusPerHit=input.infusion>0 and contract.bonusPerHit or 0},actions=actions}
end
return M
