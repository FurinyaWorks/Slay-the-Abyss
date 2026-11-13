package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local E=require('abyss_effects');local Q=require('abyss_action_queue');local S=require('abyss_snapshot');local D=require('abyss_data')
local M=dofile('experiments/characters/ganyu-lua/conditional-card.lua')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function fresh(charge,storm)
 local s=C.new(D,{deck={'strike','strike','strike'},enemies={'jaw_worm','jaw_worm'},seed=42})
 s.cardInUse=table.remove(s.hand);s.pendingPlay={uid=s.cardInUse.uid,targetId=s.enemies[1].id};s.ganyuResource={charge=charge,storm=storm and{amount=0,turns=2}or nil}
 s.player.statuses.strength=2;s.player.statuses.dexterity=2
 for _,e in ipairs(s.enemies)do e.hp=100;e.block=1 end
 return s
end
local function run(s,e,fault)
 Q.start(s,{{kind='effect',effect=e}})
 return Q.run(s,{effect=function(state,a,queue)
  if a.effect.op=='ganyuConditional'then return M.dispatch(C,state,a.effect,queue)end
  local target;for _,enemy in ipairs(state.enemies)do if enemy.id==a.effect.targetId then target=enemy end end
  E.apply(C,state,{a.effect},state.player,target);if fault then error('after native conditional')end;return true
 end})
end
local cases={{'spendOneDamage',3,5,4,7},{'spendOneBlock',3,6,4,8},{'fullChargeDamage',4,4,6,5}}
local count=0
for _,v in ipairs(cases)do for _,up in ipairs({false,true})do for charge=0,2 do
 local s=fresh(charge,false);local a,b=up and v[4]or v[2],up and v[5]or v[3]
 local e=M.prepare(C,s,{op='ganyuConditional',kind=v[1],amount=a,bonus=b},s.enemies[1],s.cardInUse.uid)
 s.player.statuses.strength=90;s.player.statuses.dexterity=90
 local active=v[1]=='fullChargeDamage'and charge==2 or v[1]~='fullChargeDamage'and charge>=1
 local value=a+(active and b or 0);assert(run(s,e))
 eq(s.ganyuResource.charge,v[1]=='fullChargeDamage'and charge or math.max(0,charge-1))
 eq(s.player.block,v[1]=='spendOneBlock'and value+2 or 0)
 eq(s.enemies[1].hp,v[1]=='spendOneBlock'and 100 or 99-value);eq(s.enemies[2].hp,100);count=count+1
end end end
for _,v in ipairs(cases)do
 local s=fresh(2,false);local old=s.ganyuResource;local card=s.cardInUse
 local e=M.prepare(C,s,{op='ganyuConditional',kind=v[1],amount=v[2],bonus=v[3]},s.enemies[1],card.uid)
 local before=C.copy(s);local restore=S.capture(s);s.energy=s.energy-1
 assert(not pcall(run,s,e,true));restore();eq(s.ganyuResource,old);eq(s.cardInUse,card);eq(s.energy,before.energy);eq(old.charge,2);eq(s.player.block,0);eq(s.enemies[1].hp,100);eq(s.actionQueue,nil)
 assert(run(s,e))
end
for _,kind in ipairs({'spendOneDamage','fullChargeDamage'})do
 local s=fresh(2,false);local raw={op='ganyuConditional',kind=kind,amount=3,bonus=5}
 assert(not pcall(M.prepare,C,s,raw,s.enemies[2],s.cardInUse.uid));eq(s.ganyuResource.charge,2)
 local e=M.prepare(C,s,raw,s.enemies[1],s.cardInUse.uid);e.targetId=s.enemies[2].id;Q.start(s,{})
 assert(not pcall(M.dispatch,C,s,e,Q));eq(#s.actionQueue.actions,0);eq(s.ganyuResource.charge,2)
end
print('PASS '..count..' real single/full charge native combinations,3 rollback/retry and2 wrong-target cases; isolated ABI')
for _,v in ipairs(cases)do
 local s=fresh(0,false);local e=M.prepare(C,s,{op='ganyuConditional',kind=v[1],amount=v[2],bonus=v[3]},s.enemies[1],s.cardInUse.uid)
 s.ganyuResource.charge=2;s.player.statuses.strength=90;s.player.statuses.dexterity=90
 assert(run(s,e));eq(s.ganyuResource.charge,v[1]=='fullChargeDamage'and 2 or 1)
 eq(s.player.block,v[1]=='spendOneBlock'and v[2]+v[3]+2 or 0)
 eq(s.enemies[1].hp,v[1]=='spendOneBlock'and 100 or 99-v[2]-v[3])
end
print('PASS3 tier conditions read execution-time resources but retain use-time native captures')
