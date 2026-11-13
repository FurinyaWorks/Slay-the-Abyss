-- Future opt-in adapter; not included in public 03/06 slice.
local R=require('abyss_ganyu_resources')
local Paid=require('abyss_ganyu_queued_card')
local Actor=require('abyss_actor');local copy=require('abyss_copy').copy
local M={}
local kinds={chargedDirect='charged_direct',chargedBlock='charged_block',chargedAoe='charged_aoe',stormBlock='storm_block',spendOneDamage='spend_one_damage',spendOneBlock='spend_one_block',fullChargeDamage='full_charge_damage'}
local function targeted(kind)return kind=='chargedDirect'or kind=='spendOneDamage'or kind=='fullChargeDamage'end
local function check(e,prepared)
 assert(type(e)=='table'and getmetatable(e)==nil and e.op=='ganyuConditional'and kinds[e.kind],'invalid conditional effect')
 for k in pairs(e)do assert(k=='op'or k=='kind'or k=='amount'or k=='bonus'or prepared and(k=='uid'or k=='targetId'or k=='captures'),'unknown conditional field')end
end
local function raw(e)return e.kind=='chargedDirect'and{op=kinds[e.kind],direct=e.amount,bonus=e.bonus}or{op=kinds[e.kind],amount=e.amount,bonus=e.bonus}end
function M.prepare(combat,state,e,target,uid)
 check(e,false)
 -- Uses the same state-owned target/paid identity guard as the reviewed base adapter.
 Paid.prepare(combat,state,targeted(e.kind)and{op='ganyuCard',kind='chargedShot',direct=e.amount,bloom=0}or{op='ganyuCard',kind='charge',amount=0},target,uid)
 local out={op=e.op,kind=e.kind,amount=e.amount,bonus=e.bonus,uid=uid,targetId=targeted(e.kind)and target.id or nil,captures={}}
 for _,r in ipairs({{charge=0},{charge=2,storm={amount=0,turns=1}}})do
  local plan=R.plan(r,raw(e));local native=copy(plan.effects[1]);local key=tostring(native.value)
  if native.op=='damage'then native.targetId=target.id;native.normalAmount=combat.attackAmount(state,state.player,target,native.value)
  elseif native.op=='damageAll'then native.normalAmounts={};for _,enemy in ipairs(state.enemies)do native.normalAmounts[enemy.id]=combat.attackAmount(state,state.player,enemy,native.value)end
  else native.blockCallbackAmount=Actor.blockFloat(state,state.player,native.value);native.value=combat.blockAmount(state,state.player,native.value);native.fixed=true end
  out.captures[key]=native
 end
 return out
end
local function finite(n)
 assert(type(n)=='number'and n==n and n>=0 and n<=2147483647,'invalid conditional capture number')
end
local function integer(n)finite(n);assert(n%1==0,'invalid integral capture')end
local function validateNative(state,e,native,expected)
 assert(type(native)=='table'and getmetatable(native)==nil and native.op==expected.op,'mismatched conditional capture')
 local allowed=expected.op=='damage'and {op=true,value=true,targetId=true,normalAmount=true}
  or expected.op=='damageAll'and {op=true,value=true,normalAmounts=true}
  or {op=true,value=true,fixed=true,blockCallbackAmount=true}
 for k in pairs(native)do assert(allowed[k],'unknown native capture field')end
 integer(native.value)
 if expected.op=='damage'then
  assert(native.value==expected.value and native.targetId==e.targetId,'conditional captured target/value mismatch');integer(native.normalAmount)
 elseif expected.op=='damageAll'then
  assert(native.value==expected.value and type(native.normalAmounts)=='table'and getmetatable(native.normalAmounts)==nil,'invalid conditional area capture')
  local ids={};for _,enemy in ipairs(state.enemies)do ids[enemy.id]=true;integer(native.normalAmounts[enemy.id])end
  for id in pairs(native.normalAmounts)do assert(ids[id],'unknown captured enemy')end
 else
  assert(native.fixed==true,'missing fixed block capture');finite(native.blockCallbackAmount)
 end
end
function M.dispatch(combat,state,e,queue)
 check(e,true);assert(e.uid~=nil,'missing conditional uid')
 Paid.prepare(combat,state,{op='ganyuCard',kind='charge',amount=0},nil,e.uid)
 if targeted(e.kind)then assert(e.targetId~=nil and e.targetId==state.pendingPlay.targetId,'conditional target mismatch')end
 local plan=R.plan(state.ganyuResource,raw(e));local native=assert(e.captures and e.captures[tostring(plan.effects[1].value)],'missing conditional capture')
 validateNative(state,e,native,plan.effects[1])
 queue.pushTop(state,{kind='effect',effect=copy(native)});state.ganyuResource=plan.after;return true
end
return M
