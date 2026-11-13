package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local E=require('abyss_effects');local Q=require('abyss_action_queue');local S=require('abyss_snapshot');local D=require('abyss_data')
local M=dofile('experiments/characters/ganyu-lua/queued-card.lua')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function fresh(charge)
 local s=C.new(D,{deck={'strike','strike','strike'},enemies={'jaw_worm','jaw_worm'},seed=42})
 s.enemies[1].hp=100;s.enemies[1].block=2;s.enemies[2].hp=100;s.enemies[2].block=1
 s.ganyuResource={charge=charge};s.cardInUse=s.hand[1];s.pendingPlay={uid=s.cardInUse.uid,targetId=s.enemies[1].id};return s
end
local function run(s,e,fault)
 Q.start(s,{{kind='effect',effect=e}})
 return Q.run(s,{effect=function(state,a,queue)
  if a.effect.op=='ganyuCard'then return M.dispatch(C,state,a.effect,queue)end
  local target;for _,enemy in ipairs(state.enemies)do if enemy.id==a.effect.targetId then target=enemy end end
  E.apply(C,state,{a.effect},state.player,target)
  if fault then error('native effect fault')end
  return true
 end})
end
for charge=0,2 do for _,up in ipairs({false,true})do
 local s=fresh(charge);local uid=s.cardInUse.uid
 local e=M.prepare(C,s,{op='ganyuCard',kind='chargedShot',direct=up and 9 or 7,bloom=up and 8 or 6},s.enemies[1],uid)
 -- Captured strength must not be recalculated after a later status mutation.
 s.player.statuses.strength=50
 assert(run(s,e));eq(s.ganyuResource.charge,charge==2 and 0 or charge)
 local bloom=charge==2 and(up and 8 or 6)or 0
 eq(s.enemies[1].hp,102-(up and 9 or 7)-bloom);eq(s.enemies[2].hp,100-math.max(0,bloom-1));eq(s.actionQueue,nil)
end end
for charge=0,2 do
 local s=fresh(charge);local e=M.prepare(C,s,{op='ganyuCard',kind='charge',amount=2},nil,s.cardInUse.uid)
 assert(run(s,e));eq(s.ganyuResource.charge,2)
end
-- Host snapshot wraps payment + native queue. This harness is NOT C.play integration.
do
 local s=fresh(2);local resource=s.ganyuResource;local card=s.cardInUse;local hp=s.enemies[1].hp;local energy=s.energy
 local e=M.prepare(C,s,{op='ganyuCard',kind='chargedShot',direct=7,bloom=6},s.enemies[1],card.uid)
 local restore=S.capture(s);s.energy=s.energy-1
 assert(not pcall(run,s,e,true));restore()
 eq(s.energy,energy);eq(s.ganyuResource,resource);eq(resource.charge,2);eq(s.enemies[1].hp,hp);eq(s.cardInUse,card);eq(s.actionQueue,nil)
 assert(run(s,e));eq(s.ganyuResource.charge,0)
end
-- A bad identity cannot enqueue or mutate resources, even in an active queue.
for _,field in ipairs({'uid','targetId','normalAmount'})do
 local s=fresh(2);local e=M.prepare(C,s,{op='ganyuCard',kind='chargedShot',direct=7,bloom=6},s.enemies[1],s.cardInUse.uid)
 e[field]=field=='normalAmount'and -1 or 'wrong';Q.start(s,{})
 assert(not pcall(M.dispatch,C,s,e,Q));eq(s.ganyuResource.charge,2);eq(#s.actionQueue.actions,0)
end
print('PASS isolated real ActionQueue/Actor captures, Snapshot payment rollback and context rejection')

-- Prepare must capture only the actual paid context and active state-owned Actor.
local raw={op='ganyuCard',kind='chargedShot',direct=7,bloom=6}
do
 local s=fresh(2);local uid=s.cardInUse.uid;local target=s.enemies[1]
 assert(not pcall(M.prepare,C,s,raw,C.copy(target),uid))
 assert(not pcall(M.prepare,C,s,raw,s.enemies[2],uid))
 assert(not pcall(M.prepare,C,s,raw,target,'fake-uid'))
 local pending=s.pendingPlay;s.pendingPlay=nil;assert(not pcall(M.prepare,C,s,raw,target,uid));s.pendingPlay=pending
 for _,flag in ipairs({'escaped','halfDead','isDying'})do
  target[flag]=true;assert(not pcall(M.prepare,C,s,raw,target,uid));target[flag]=nil
 end
 target.hp=0;assert(not pcall(M.prepare,C,s,raw,target,uid));target.hp=100
 eq(s.ganyuResource.charge,2);eq(s.actionQueue,nil)
 for _,flag in ipairs({'escaped','halfDead','isDying'})do
  local e=M.prepare(C,s,raw,target,uid);s.player[flag]=true
  assert(not pcall(M.prepare,C,s,raw,target,uid));Q.start(s,{})
  assert(not pcall(M.dispatch,C,s,e,Q));eq(#s.actionQueue.actions,0);eq(s.ganyuResource.charge,2)
  s.actionQueue=nil;s.player[flag]=nil
 end
end
print('PASS state-owned ActorPresence and actual paid UID guards')

-- nil==nil is not proof of a paid card identity.
for _,missing in ipairs({'all','effect','pending','card'})do
 local s=fresh(0);local e=M.prepare(C,s,{op='ganyuCard',kind='charge',amount=2},nil,s.cardInUse.uid)
 if missing=='all'or missing=='effect'then e.uid=nil end
 if missing=='all'or missing=='pending'then s.pendingPlay.uid=nil end
 if missing=='all'or missing=='card'then s.cardInUse.uid=nil end
 Q.start(s,{})
 assert(not pcall(M.dispatch,C,s,e,Q));eq(s.ganyuResource.charge,0);eq(#s.actionQueue.actions,0)
end
print('PASS absent paid UID cannot match through nil equality')

-- Fail before enqueue/resource commit, not after native Actor rejects damage.
for _,mutate in ipairs({
 function(e,s)e.normalAmount=1.5 end,
 function(e,s)e.normalAmounts[s.enemies[1].id]=1.5 end,
 function(e,s)e.normalAmounts[s.enemies[2].id]=nil end,
 function(e,s)e.normalAmounts.ghost=7 end,
 function(e,s)setmetatable(e.normalAmounts,{__index=function()return 7 end})end,
 function(e,s)e.normalAmount=nil end,
})do
 local s=fresh(2);local e=M.prepare(C,s,raw,s.enemies[1],s.cardInUse.uid)
 mutate(e,s);Q.start(s,{});local resource=s.ganyuResource
 assert(not pcall(M.dispatch,C,s,e,Q));eq(s.ganyuResource,resource);eq(resource.charge,2)
 eq(#s.actionQueue.actions,0);eq(s.enemies[1].hp,100);eq(s.enemies[2].hp,100)
end
-- Catch malformed host attack snapshots at preparation as well.
do
 local s=fresh(2);local fake={attackAmount=function()return 1.5 end}
 assert(not pcall(M.prepare,fake,s,raw,s.enemies[1],s.cardInUse.uid));eq(s.ganyuResource.charge,2);eq(s.actionQueue,nil)
end
print('PASS integral complete native captures reject before resource/queue commit')
