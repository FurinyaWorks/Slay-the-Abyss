-- Acceptance contract for the NEXT shared lifecycle slice; not passed by d55b0c32.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh(relic)
 local s=C.new(D,{deck={'defend','defend','defend','defend','defend','defend','defend','defend','defend','defend'},enemies={'jaw_worm'},seed=42,candidateLifecycle={kind='ganyu',relicEnabled=relic}})
 assert(s.ganyuResource,'missing public Ganyu lifecycle')
 s.ganyuResource.charge=0;s.ganyuResource.storm={amount=4,turns=2};s.energy=2
 s.player.hp=100;s.player.maxHp=100;s.enemies[1].hp=100;s.enemies[1].maxHp=100;s.enemies[1].block=0
 return s
end
-- Banking must precede actual ethereal exhaust and its Dark Embrace draw.
do
 local s=fresh(true);local turn=s.turn
 s.catalog.cards.dazed={id='dazed',type='status',cost=-2,ethereal=true,effects={}}
 s.hand[1].cardId='dazed';local etherealUid=s.hand[1].uid;s.player.statuses.dark_embrace=1;s.exhaustPowerOrder={'dark_embrace'};s.player.powerOrder={'dark_embrace'}
 local draw=C.draw;local observed=false
 C.draw=function(state,n,...)
  if state==s and not observed then
   observed=true;eq(n,1);eq(state.turn,turn)
   local exhausted=false;for _,c in ipairs(state.exhaust)do if c.uid==etherealUid then exhausted=true end end;assert(exhausted,'draw must follow actual ethereal UID exhaust')
   eq(state.ganyuResource.charge,2);eq(state.energy,0);eq(state.ganyuResource.storm.turns,2)
  end
  return draw(state,n,...)
 end
 local called,ok=pcall(C.endTurn,s);C.draw=draw;assert(called,ok);assert(ok);assert(observed,'no actual exhaust draw')
 eq(s.ganyuResource.charge,2);eq(s.ganyuResource.storm.turns,1);eq(s.ganyuResource.lastBank,turn);eq(s.ganyuResource.lastOwnerEnd,turn)
end
-- Rain kills before the enemy can kill the player; bank survives terminal completion.
do
 local s=fresh(true);s.player.hp=1;s.enemies[1].hp=4;s.ganyuResource.storm.turns=1
 assert(C.endTurn(s));eq(C.outcome(s),'victory');eq(s.player.hp,1);eq(s.ganyuResource.charge,2);eq(s.ganyuResource.storm,nil)
 local before=C.copy(s);eq(C.endTurn(s),false);same(s,before)
end
-- No starter relic means no banking, not absence of a manually seeded field tick.
do
 local s=fresh(false);s.ganyuResource.charge=1;s.energy=2147483647
 assert(C.endTurn(s));eq(s.ganyuResource.charge,1);eq(s.ganyuResource.storm.turns,1)
end
local function faultAfterStorm(s,fn)
 local damage=C.damage;local hit=false
 C.damage=function(state,source,target,value,...)
  local result=damage(state,source,target,value,...)
  if state==s and source==s.player and value==4 then hit=true;error('after actual storm damage')end
  return result
 end
 local called,ok=pcall(fn);C.damage=damage;assert(hit,'fault did not reach native storm damage');assert(not called or ok==false)
end
-- Whole initial command rollback includes resource markers, card piles, RNG and aliases.
do
 local s=fresh(true);local before=C.copy(s);local resource=s.ganyuResource;local hand=s.hand
 faultAfterStorm(s,function()return C.endTurn(s)end)
 same(s,before);eq(s.ganyuResource,resource);eq(s.hand,hand)
 assert(C.endTurn(s));eq(s.ganyuResource.charge,2);eq(s.ganyuResource.storm.turns,1)
end
-- A genuine Codex pause retains one offer; bad selection and failed resume do not re-bank/re-roll.
do
 local s=fresh(true);s.relics={'nilrys_codex'};assert(C.endTurn(s))
 local pending=assert(s.pendingChoice,'expected actual Codex pause');eq(pending.op,'codex');eq(s.ganyuResource.storm.turns,2)
 local before=C.copy(s);local queue=s.actionQueue;local resource=s.ganyuResource
 eq(C.chooseCard(s,pending.token,999),false);same(s,before)
 faultAfterStorm(s,function()return C.chooseCard(s,pending.token,0)end)
 same(s,before);eq(s.pendingChoice,pending);eq(s.actionQueue,queue);eq(s.ganyuResource,resource)
 assert(C.chooseCard(s,pending.token,0));eq(s.ganyuResource.charge,2);eq(s.ganyuResource.storm.turns,1)
 local finished=C.copy(s);eq(C.chooseCard(s,pending.token,0),false);same(s,finished)
end
-- Real native Ice Cream must retain energy unless the candidate banking relic consumes it.
for _,equipped in ipairs({false,true})do
 local s=fresh(equipped);s.relics={'ice_cream'};s.ganyuResource.charge=2;s.energy=2
 assert(C.endTurn(s));eq(s.energy,equipped and 3 or 5);eq(s.ganyuResource.charge,2)
 eq(s.ganyuResource.storm.turns,1)
end
print('PASS7 real owner-end contracts including native Ice Cream with/without banking relic')
