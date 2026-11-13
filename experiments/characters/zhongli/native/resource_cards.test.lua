package.path='./?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local L=require('experiments.characters.zhongli.native.lifecycle')
local R=require('experiments.characters.zhongli.native.resource_cards');local Q=require('abyss_action_queue');local Snapshot=require('abyss_snapshot')
for _,id in ipairs({'zl03','zl04'})do for _,up in ipairs({false,true})do for jade=0,20 do
 local s=L.start(C.new(D,{seed=42,deck={'strike'},enemies={'cultist'}}),'resource',false)
 s.zhongliCandidate.jade=jade;s.hand[1].cardId=id;s.hand[1].upgraded=up;local uid=s.hand[1].uid
 local ok,why=R.canUse(s,uid,1);assert(ok==(id=='zl03'or jade>=6));assert(s.zhongliCandidate.jade==jade and s.energy==3)
 if ok then
  assert(why==nil);local p=R.prepare(s,uid,1);assert(p.effects[1].value==(id=='zl03'and(up and 16 or 12)or 6))
  if id=='zl04'then assert(p.effects[2].value==(up and 18 or 14));assert(not R.canUse(s,uid,99))end
  local action={kind='effect',effect=p.effects[1]};Q.start(s,{action});assert(Q.run(s,{effect=function(st,a,q)return R.dispatch(C,st,a.effect,q)end}))
  assert(s.zhongliCandidate.jade==(id=='zl03'and math.min(20,jade+(up and 16 or 12))or jade-6))
  assert(s.energy==3 and #s.hand==1) -- This endpoint is not fake payment or disposition.
 end
end end end
local s=L.start(C.new(D,{seed=42,deck={'strike'},enemies={'cultist'}}),'rollback',false)
s.zhongliCandidate.jade=6;s.hand[1].cardId='zl04';local p=R.prepare(s,s.hand[1].uid,1);local z=s.zhongliCandidate;local restore=Snapshot.capture(s)
Q.start(s,{{kind='effect',effect=p.effects[1]},{kind='effect',effect={op='zhongliCard',kind='spendJade',value=1}}})
assert(not pcall(Q.run,s,{effect=function(st,a,q)return R.dispatch(C,st,a.effect,q)end}));restore();assert(s.zhongliCandidate==z and z.jade==6 and s.actionQueue==nil)
for _,field in ipairs({'condition','fixed','times'})do local e={op='zhongliCard',kind='gainJade',value=12};e[field]=true;assert(not pcall(R.dispatch,C,s,e,Q)and z.jade==6)end
print('RESOURCE_CARD_CONTRACT_PASS 84 UID/version/reserve preflights, role-only Queue/Snapshot; public payment not yet connected')

for _,id in ipairs({'zl20','zl62'})do for _,up in ipairs({false,true})do for jade=0,20 do
 local s=L.start(C.new(D,{seed=42,deck={'strike'},enemies={'cultist'}}),'rebuild',false)
 s.zhongliCandidate.jade=jade;s.hand[1].cardId=id;s.hand[1].upgraded=up;local uid=s.hand[1].uid
 local ok,reason=R.canUse(s,uid);assert(ok and reason==nil)
 local p=R.prepare(s,uid);assert(p.baseCost==1 and p.target=='SELF')
 local amount=id=='zl20'and(up and 12 or 9)or(up and 8 or 6)
 assert(p.effects[1].kind=='emptyJade'and p.effects[1].value==amount)
 if id=='zl62'then assert(p.effects[2].op=='draw'and p.effects[2].value==(up and 2 or 1)and p.definition.exhaust)end
 Q.start(s,{{kind='effect',effect=p.effects[1]}});assert(Q.run(s,{effect=function(st,a,q)return R.dispatch(C,st,a.effect,q)end}))
 assert(s.zhongliCandidate.jade==(jade==0 and amount or jade)and s.energy==3 and #s.hand==1)
end end end
print('REBUILD_CARD_CONTRACT_PASS 84 UID/version/reserve cases; 62 draw/exhaust only declared, not publicly exercised')
