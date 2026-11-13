-- Future opt-in adapter; not included in public 03/06 slice.
local R=dofile('experiments/characters/ganyu-lua/resources.lua')
local Paid=dofile('experiments/characters/ganyu-lua/queued-card.lua')
local Actor=require('abyss_actor');local copy=require('abyss_copy').copy
local M={}
local kinds={chargedDirect='charged_direct',chargedBlock='charged_block',chargedAoe='charged_aoe',stormBlock='storm_block'}
local function check(e,prepared)
 assert(type(e)=='table'and getmetatable(e)==nil and e.op=='ganyuConditional'and kinds[e.kind],'invalid conditional effect')
 for k in pairs(e)do assert(k=='op'or k=='kind'or k=='amount'or k=='bonus'or prepared and(k=='uid'or k=='targetId'or k=='captures'),'unknown conditional field')end
end
local function raw(e)return e.kind=='chargedDirect'and{op=kinds[e.kind],direct=e.amount,bonus=e.bonus}or{op=kinds[e.kind],amount=e.amount,bonus=e.bonus}end
function M.prepare(combat,state,e,target,uid)
 check(e,false)
 -- Uses the same state-owned target/paid identity guard as the reviewed base adapter.
 Paid.prepare(combat,state,e.kind=='chargedDirect'and{op='ganyuCard',kind='chargedShot',direct=e.amount,bloom=0}or{op='ganyuCard',kind='charge',amount=0},target,uid)
 local out={op=e.op,kind=e.kind,amount=e.amount,bonus=e.bonus,uid=uid,targetId=e.kind=='chargedDirect'and target.id or nil,captures={}}
 for _,r in ipairs({{charge=0},{charge=2,storm={amount=0,turns=1}}})do
  local plan=R.plan(r,raw(e));local native=copy(plan.effects[1]);local key=tostring(native.value)
  if native.op=='damage'then native.targetId=target.id;native.normalAmount=combat.attackAmount(state,state.player,target,native.value)
  elseif native.op=='damageAll'then native.normalAmounts={};for _,enemy in ipairs(state.enemies)do native.normalAmounts[enemy.id]=combat.attackAmount(state,state.player,enemy,native.value)end
  else native.blockCallbackAmount=Actor.blockFloat(state,state.player,native.value);native.value=combat.blockAmount(state,state.player,native.value);native.fixed=true end
  out.captures[key]=native
 end
 return out
end
function M.dispatch(combat,state,e,queue)
 check(e,true);assert(e.uid~=nil,'missing conditional uid')
 Paid.prepare(combat,state,{op='ganyuCard',kind='charge',amount=0},nil,e.uid)
 if e.kind=='chargedDirect'then assert(e.targetId~=nil and e.targetId==state.pendingPlay.targetId,'conditional target mismatch')end
 local plan=R.plan(state.ganyuResource,raw(e));local native=assert(e.captures and e.captures[tostring(plan.effects[1].value)],'missing conditional capture')
 assert(native.op==plan.effects[1].op,'mismatched conditional capture')
 queue.pushTop(state,{kind='effect',effect=copy(native)});state.ganyuResource=plan.after;return true
end
return M
