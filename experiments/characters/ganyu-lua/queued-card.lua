-- Dedicated candidate ABI. Host owns payment, Snapshot and queue lifetime.
local R=dofile('experiments/characters/ganyu-lua/resources.lua')
local copy=require('abyss_copy').copy
local M={}
local function number(n)assert(type(n)=='number'and n==n and n>=0 and n<=2147483647,'invalid captured Ganyu amount');return n end
local function keys(t,allowed)assert(type(t)=='table'and getmetatable(t)==nil,'invalid Ganyu effect');for k in pairs(t)do assert(allowed[k],'unknown Ganyu effect field')end end
function M.prepare(combat,state,e,target,uid)
 keys(e,{op=true,kind=true,amount=true,direct=true,bloom=true})
 assert(e.op=='ganyuCard','invalid Ganyu namespace');assert(uid~=nil,'missing card uid')
 local out={op=e.op,kind=e.kind,uid=uid}
 if e.kind=='charge'then
  keys(e,{op=true,kind=true,amount=true});R.plan({charge=0},{op='charge',amount=e.amount});out.amount=e.amount
 elseif e.kind=='chargedShot'then
  keys(e,{op=true,kind=true,direct=true,bloom=true})
  R.plan({charge=0},{op='charged_shot',direct=e.direct,bloom=e.bloom})
  assert(target and target.hp>0,'missing living Ganyu target')
  out.direct=e.direct;out.bloom=e.bloom;out.targetId=target.id
  out.normalAmount=number(combat.attackAmount(state,state.player,target,e.direct));out.normalAmounts={}
  for _,enemy in ipairs(state.enemies)do out.normalAmounts[enemy.id]=number(combat.attackAmount(state,state.player,enemy,e.bloom))end
 else error('unsupported Ganyu queued kind')end
 return out
end
function M.dispatch(combat,state,e,queue)
 assert(state.pendingPlay and state.cardInUse and state.pendingPlay.uid==e.uid and state.cardInUse.uid==e.uid,'Ganyu card context mismatch')
 assert(state.player.hp>0,'dead Ganyu source')
 local plan
 if e.kind=='charge'then
  keys(e,{op=true,kind=true,amount=true,uid=true});assert(e.op=='ganyuCard','invalid namespace')
  plan=R.plan(state.ganyuResource,{op='charge',amount=e.amount})
 elseif e.kind=='chargedShot'then
  keys(e,{op=true,kind=true,direct=true,bloom=true,uid=true,targetId=true,normalAmount=true,normalAmounts=true});assert(e.op=='ganyuCard','invalid namespace')
  assert(state.pendingPlay.targetId==e.targetId,'Ganyu target context mismatch')
  local found=false;for _,enemy in ipairs(state.enemies)do if enemy.id==e.targetId then found=true end end;assert(found,'Ganyu target absent')
  number(e.normalAmount);assert(type(e.normalAmounts)=='table','missing Ganyu area capture')
  for _,enemy in ipairs(state.enemies)do number(e.normalAmounts[enemy.id])end
  plan=R.plan(state.ganyuResource,{op='charged_shot',direct=e.direct,bloom=e.bloom})
  plan.effects[1].targetId=e.targetId;plan.effects[1].normalAmount=e.normalAmount
  if plan.effects[2]then plan.effects[2].normalAmounts=copy(e.normalAmounts)end
 else error('unsupported Ganyu queued kind')end
 -- Native actions execute under host terminal policy, not synchronous post-play damage.
 for i=#plan.effects,1,-1 do queue.pushTop(state,{kind='effect',effect=plan.effects[i]})end
 state.ganyuResource=plan.after
 return true
end
return M
