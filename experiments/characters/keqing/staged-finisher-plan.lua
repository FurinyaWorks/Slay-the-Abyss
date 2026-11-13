-- KQ004 pure plan. Presence is tested at the last stage, not at admission.
local Starter=require('staged-starter-plan');local M={}
local function exact(t,keys)
 if type(t)~='table'or getmetatable(t)then return false end
 for k in pairs(t)do if not keys[k]then return false end end
 for k in pairs(keys)do if rawget(t,k)==nil then return false end end;return true
end
local function n(v)return type(v)=='number'and v%1==0 and v>=0 and v<=999 end
function M.plan(input,contract)
 assert(exact(contract,{base=true,upgraded=true,bonusPerHit=true,finisher=true}),'invalid finisher contract')
 -- Reuse the reviewed paid binding/input domain, not its setup/recast actions.
 local source=Starter.plan(input,{base=contract.base,upgraded=contract.upgraded,bonusPerHit=contract.bonusPerHit})
 assert(exact(contract.finisher,{base=true,upgraded=true}),'invalid finisher faces')
 for _,key in ipairs({'base','upgraded'})do local f=contract.finisher[key];assert(exact(f,{hit=true,burst=true})and n(f.hit)and n(f.burst),'invalid finisher face')end
 local f=contract.finisher[input.upgraded and'upgraded'or'base'];local actions={}
 for i=1,3 do actions[i]={op=i<3 and'rawTargetHit'or'currentWedgeBurstGate',value=i<3 and f.hit or f.burst,turn=input.turn,uid=input.uid,playId=input.playId,step=i}end
 return {binding=source.binding,context=source.context,actions=actions}
end
function M.gate(action,binding,currentWedgeUntil)
 assert(exact(action,{op=true,value=true,turn=true,uid=true,playId=true,step=true})and action.op=='currentWedgeBurstGate'and action.step==3 and n(action.value),'invalid gate')
 -- Starter validator checks binding and identifier domains using a valid dummy
 -- descriptor; equality with the immutable saved gate is still caller-owned.
 Starter.validateAction({op='rawDamage',value=0,turn=action.turn,uid=action.uid,playId=action.playId,step=1},binding,1)
 assert(currentWedgeUntil==nil or type(currentWedgeUntil)=='number'and currentWedgeUntil%1==0 and currentWedgeUntil>=binding.turn and currentWedgeUntil<=binding.turn+1,'invalid current wedge')
 if currentWedgeUntil==nil then return {}end
 return {{op='consumeCurrentWedge',value=1},{op='rawLivingEnemiesBurst',value=action.value}}
end
return M
