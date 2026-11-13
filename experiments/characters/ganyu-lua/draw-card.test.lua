package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local E=require('abyss_effects');local Q=require('abyss_action_queue');local S=require('abyss_snapshot');local D=require('abyss_data')
local M=dofile('experiments/characters/ganyu-lua/draw-card.lua')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh(charge,storm,large)
 local deck={'strike','strike','strike','strike','strike','defend','defend','defend','defend','defend'}
 if large then for i=1,5 do deck[#deck+1]='strike'end end
 local s=C.new(D,{deck=deck,enemies={'jaw_worm'},seed=42})
 s.cardInUse=table.remove(s.hand,1);s.pendingPlay={uid=s.cardInUse.uid,cardType='skill'}
 s.ganyuResource={charge=charge,storm=storm and {amount=0,turns=2}or nil};return s
end
local function run(s,e,fault)
 Q.start(s,{{kind='effect',effect=e}})
 return Q.run(s,{effect=function(state,a,queue)
  if a.effect.op=='ganyuDraw'then return M.dispatch(C,state,a.effect,queue)end
  E.apply(C,state,{a.effect},state.player,nil)
  if fault then error('post draw failure')end
  return true
 end})
end
local n=0
for _,case in ipairs({{'chargedDraw',1,2,3},{'stormDraw',1,1,2},{'spendOneDraw',0,2,3}})do
 for _,up in ipairs({false,true})do for charge=0,2 do for _,storm in ipairs({false,true})do
  local s=fresh(charge,storm);local before=#s.hand
  local e=M.prepare(C,s,{op='ganyuDraw',kind=case[1],amount=case[2],bonus=up and case[4]or case[3]},s.cardInUse.uid)
  local active=case[1]=='chargedDraw'and charge==2 or case[1]=='stormDraw'and storm or case[1]=='spendOneDraw'and charge>=1
  local count=case[2]+(active and(up and case[4]or case[3])or 0)
  assert(run(s,e));eq(#s.hand,before+count)
  local after=charge;if active and case[1]=='chargedDraw'then after=0 elseif active and case[1]=='spendOneDraw'then after=charge-1 end
  eq(s.ganyuResource.charge,after);if storm then eq(s.ganyuResource.storm.turns,2)end
  eq(#s.hand+#s.draw+#s.discard+#s.exhaust+1,10);n=n+1
 end end end
end
-- Full hand still pays the conditional resource, empty piles do not refund.
for _,full in ipairs({false,true})do
 local s=fresh(2,false,full)
 if full then while #s.hand<10 do s.hand[#s.hand+1]=table.remove(s.draw)end
  eq(#s.draw,4)
 else s.exhaust=s.draw;s.draw={}end
 local before=#s.hand;local e=M.prepare(C,s,{op='ganyuDraw',kind='chargedDraw',amount=1,bonus=3},s.cardInUse.uid)
 assert(run(s,e));eq(#s.hand,before);eq(s.ganyuResource.charge,0)
end
-- Force real reshuffle then throw: Snapshot must restore RNG and every pile alias.
do
 local s=fresh(2,false);s.discard=s.draw;s.draw={};local disc=s.discard;local hand=s.hand;local resource=s.ganyuResource
 local e=M.prepare(C,s,{op='ganyuDraw',kind='chargedDraw',amount=1,bonus=2},s.cardInUse.uid)
 local before=C.copy(s);local restore=S.capture(s)
 assert(not pcall(run,s,e,true));restore();same(s,before);eq(s.discard,disc);eq(s.hand,hand);eq(s.ganyuResource,resource)
 assert(run(s,e));eq(#s.hand,7)
end
print('PASS '..n..' conditional native queued draws, conservation, empty supply and real reshuffle rollback')
for _,kind in ipairs({'chargedDraw','stormDraw','spendOneDraw'})do
 local s=fresh(2,true);local e=M.prepare(C,s,{op='ganyuDraw',kind=kind,amount=2147483647,bonus=1},s.cardInUse.uid);Q.start(s,{})
 assert(not pcall(M.dispatch,C,s,e,Q));eq(s.ganyuResource.charge,2);eq(s.ganyuResource.storm.turns,2);eq(#s.actionQueue.actions,0)
 e.amount=1;e.uid=nil;assert(not pcall(M.dispatch,C,s,e,Q));eq(#s.actionQueue.actions,0)
 for _,bad in ipairs({-1,false,0/0,2147483648})do
  assert(not pcall(M.prepare,C,s,{op='ganyuDraw',kind=kind,amount=1,bonus=bad},s.cardInUse.uid))
 end
end
print('PASS conditional draw overflow, malformed input and missing UID refusal')
