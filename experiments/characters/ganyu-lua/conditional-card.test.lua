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
local cases={{'chargedDirect',8,14,11,17},{'chargedBlock',5,8,7,10},{'chargedAoe',2,5,3,7},{'stormBlock',3,6,4,8}}
local count=0
for _,v in ipairs(cases)do for _,up in ipairs({false,true})do for charge=0,2 do for _,storm in ipairs({false,true})do
 local s=fresh(charge,storm);local a,b=up and v[4]or v[2],up and v[5]or v[3]
 local e=M.prepare(C,s,{op='ganyuConditional',kind=v[1],amount=a,bonus=b},s.enemies[1],s.cardInUse.uid)
 s.player.statuses.strength=90;s.player.statuses.dexterity=90
 local active=v[1]=='stormBlock'and storm or v[1]~='stormBlock'and charge==2;local amount=a+(active and b or 0)
 assert(run(s,e));eq(s.ganyuResource.charge,active and v[1]~='stormBlock'and 0 or charge)
 local block=v[1]=='chargedBlock'or v[1]=='stormBlock'
 eq(s.player.block,block and amount+2 or 0);eq(s.enemies[1].hp,block and 100 or 99-amount)
 eq(s.enemies[2].hp,v[1]=='chargedAoe'and 99-amount or 100);count=count+1
end end end end
for _,v in ipairs(cases)do
 local s=fresh(2,true);local old=s.ganyuResource;local hp=s.enemies[1].hp
 local e=M.prepare(C,s,{op='ganyuConditional',kind=v[1],amount=v[2],bonus=v[3]},s.enemies[1],s.cardInUse.uid)
 local restore=S.capture(s);assert(not pcall(run,s,e,true));restore();eq(s.ganyuResource,old);eq(old.charge,2);eq(s.enemies[1].hp,hp);eq(s.player.block,0);eq(s.actionQueue,nil)
end
print('PASS '..count..' native conditional queue captures plus4 resource/effect rollback cases')
-- Conditions are execution-time; both amount branches retain preparation-time modifiers.
for _,v in ipairs(cases)do
 local s=fresh(0,false);local e=M.prepare(C,s,{op='ganyuConditional',kind=v[1],amount=v[2],bonus=v[3]},s.enemies[1],s.cardInUse.uid)
 s.ganyuResource.charge=2;s.ganyuResource.storm={amount=0,turns=1};s.player.statuses.strength=90;s.player.statuses.dexterity=90
 assert(run(s,e));local amount=v[2]+v[3]
 eq(s.player.block,(v[1]=='chargedBlock'or v[1]=='stormBlock')and amount+2 or 0)
 eq(s.ganyuResource.charge,v[1]=='stormBlock'and 2 or 0)
end
print('PASS4 execution-time resource branches with use-time modifier snapshots')
local corruptions={
 {'chargedDirect',function(e,s)e.captures['22'].targetId=s.enemies[2].id end},
 {'chargedDirect',function(e)e.captures['22'].normalAmount=nil end},
 {'chargedDirect',function(e)e.captures['22'].value=23 end},
 {'chargedAoe',function(e)e.captures['7'].normalAmounts={}end},
 {'chargedAoe',function(e)e.captures['7'].normalAmounts.extra=1 end},
 {'chargedBlock',function(e)e.captures['13'].fixed=nil end},
 {'chargedBlock',function(e)e.captures['13'].blockCallbackAmount=0/0 end},
}
for _,row in ipairs(corruptions)do
 local s=fresh(2,true);local v
 for _,case in ipairs(cases)do if case[1]==row[1]then v=case end end
 local e=M.prepare(C,s,{op='ganyuConditional',kind=v[1],amount=v[2],bonus=v[3]},s.enemies[1],s.cardInUse.uid)
 row[2](e,s);Q.start(s,{});assert(not pcall(M.dispatch,C,s,e,Q));eq(s.ganyuResource.charge,2);eq(#s.actionQueue.actions,0);eq(s.enemies[1].hp,100);eq(s.enemies[2].hp,100)
end
print('PASS7 malformed native captures reject before queue/resource commit')
