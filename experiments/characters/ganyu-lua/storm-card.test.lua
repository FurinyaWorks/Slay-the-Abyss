package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local Q=require('abyss_action_queue');local S=require('abyss_snapshot');local E=require('abyss_effects')
local M=dofile('experiments/characters/ganyu-lua/storm-card.lua');local R=dofile('experiments/characters/ganyu-lua/resources.lua')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh()
 local s=C.new(D,{deck={'strike','strike','strike'},enemies={'jaw_worm'},seed=42})
 s.cardInUse=table.remove(s.hand,1);s.pendingPlay={uid=s.cardInUse.uid,cardType='skill'};s.ganyuResource={charge=1};s.enemies[1].hp=100;s.enemies[1].block=0;return s
end
local function run(s,e,fault)
 Q.start(s,{{kind='effect',effect=e}})
 return Q.run(s,{effect=function(st,a,q)local ok=M.dispatch(C,st,a.effect,q);if fault then error('post storm failure')end;return ok end})
end
for _,amount in ipairs({4,6})do for _,old in ipairs({false,{amount=2,turns=4},{amount=9,turns=1}})do
 local s=fresh();s.ganyuResource.storm=old or nil
 local e=M.prepare(C,s,{op='ganyuStorm',amount=amount,turns=2},s.cardInUse.uid)
 assert(run(s,e));eq(s.enemies[1].hp,100);eq(s.ganyuResource.charge,1)
 local damage=math.max(amount,old and old.amount or 0);local turns=math.max(2,old and old.turns or 0)
 eq(s.ganyuResource.storm.amount,damage);eq(s.ganyuResource.storm.turns,turns)
 -- Isolated real native damage execution, NOT public endTurn integration.
 local bank=R.bankBeforeDiscard(s.ganyuResource,s.turn,0,false);local tick=R.stormAfterDiscard(bank.after,s.turn)
 s.ganyuResource=tick.after;E.apply(C,s,tick.afterDiscard,s.player,nil)
 eq(s.enemies[1].hp,100-damage);eq(s.ganyuResource.storm.turns,turns-1)
end end
for _,amount in ipairs({4,6})do
 local s=fresh();local before=C.copy(s);local r=s.ganyuResource;local card=s.cardInUse
 local e=M.prepare(C,s,{op='ganyuStorm',amount=amount,turns=2},card.uid);local restore=S.capture(s)
 s.energy=s.energy-2;assert(not pcall(run,s,e,true));restore();same(s,before);eq(s.ganyuResource,r);eq(s.cardInUse,card)
 assert(run(s,e));eq(s.ganyuResource.storm.amount,amount)
end
for _,mutate in ipairs({function(e)e.uid=nil end,function(e)e.uid='wrong'end,function(e)e.amount=1.5 end,function(e)e.turns=0 end,function(e)e.extra=true end})do
 local s=fresh();local e=M.prepare(C,s,{op='ganyuStorm',amount=4,turns=2},s.cardInUse.uid);mutate(e);Q.start(s,{})
 local before=C.copy(s);assert(not pcall(M.dispatch,C,s,e,Q));same(s,before)
end
print('PASS storm setup 6 refresh/native-tick combinations, 2 rollback/retry and 5 rejection cases; isolated ABI only')
