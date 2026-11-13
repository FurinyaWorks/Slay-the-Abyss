-- Public acceptance for the explicit Ganyu bank/discard/storm lifecycle.
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
 s.hand[1].cardId='dazed';local dazed=s.hand[1];s.player.statuses.dark_embrace=1;s.exhaustPowerOrder={'dark_embrace'};s.player.powerOrder={'dark_embrace'}
 local draw=C.draw;local observed=false
 C.draw=function(state,n,...)
  if state==s and not observed then
   observed=true;eq(n,1);eq(state.turn,turn)
   local exhausted=false;for _,card in ipairs(state.exhaust)do if card==dazed then exhausted=true end end;assert(exhausted,'original dazed not exhausted before draw')
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
print('PASS5 real public owner-end banking/discard/storm/terminal/Codex transaction contracts')
-- Failure after the bank but inside real ethereal-exhaust draw restores the
-- pre-command graph, not a partial after-bank checkpoint.
do
 local s=fresh(true);s.catalog.cards.dazed={id='dazed',type='status',cost=-2,ethereal=true,effects={}}
 s.hand[1].cardId='dazed';s.player.statuses.dark_embrace=1;s.exhaustPowerOrder={'dark_embrace'};s.player.powerOrder={'dark_embrace'}
 local before=C.copy(s);local resource=s.ganyuResource;local hand=s.hand;local draw=C.draw;local reached=false
 C.draw=function(state,...)
  if state==s then reached=true;eq(state.ganyuResource.charge,2);eq(state.energy,0);error('after bank during actual exhaust draw')end
  return draw(state,...)
 end
 eq(pcall(C.endTurn,s),false);C.draw=draw;assert(reached)
 same(s,before);eq(s.ganyuResource,resource);eq(s.hand,hand)
 assert(C.endTurn(s));eq(s.ganyuResource.storm.turns,1)
end
-- Full command extends past the storm and enemy actions into next-turn start.
do
 local s=fresh(true);local before=C.copy(s);local resource=s.ganyuResource;local start=C.startPlayerTurn;local reached=false
 C.startPlayerTurn=function(state,...)
  if state==s then reached=true;eq(state.ganyuResource.lastOwnerEnd,state.turn);error('after storm at next-turn start')end
  return start(state,...)
 end
 eq(pcall(C.endTurn,s),false);C.startPlayerTurn=start;assert(reached)
 same(s,before);eq(s.ganyuResource,resource)
end
-- Source death before banking preserves resources; discard-trigger victory
-- after banking retains bank but skips the storm, not inventing a late tick.
do
 local s=fresh(true);s.player.hp=1;s.hand[1].cardId='regret';local resource=s.ganyuResource
 assert(C.endTurn(s));eq(s.player.hp,0);eq(s.ganyuResource,resource);eq(s.ganyuResource.charge,0);eq(s.ganyuResource.lastBank,nil)
 local n=fresh(true);n.enemies[1].hp=3;n.relics={'charons_ashes'}
 n.catalog.cards.dazed={id='dazed',type='status',cost=-2,ethereal=true,effects={}};n.hand[1].cardId='dazed'
 assert(C.endTurn(n));eq(C.outcome(n),'victory');eq(n.ganyuResource.charge,2);eq(n.ganyuResource.lastBank,n.turn)
 eq(n.ganyuResource.lastOwnerEnd,nil);eq(n.ganyuResource.storm.turns,2)
end
-- A genuine storm reaction death retains its executed tick but cannot start enemies.
do
 local s=fresh(true);s.player.hp=1;s.enemies[1].statuses.thorns=3;s.enemies[1].powerOrder={'thorns'}
 assert(C.endTurn(s));eq(s.player.hp,0);eq(s.ganyuResource.charge,2);eq(s.ganyuResource.storm.turns,1)
 for _,event in ipairs(s.events)do assert(event.kind~='enemy_turn','enemy turn after storm death')end
end
-- A caller-owned wider preimage is consumed once and restores its outer aliases.
do
 local Snapshot=require('abyss_snapshot');local s=fresh(true);local resource=s.ganyuResource;local before=C.copy(s)
 local parent={combat=s,marker='before'};local _,owner=Snapshot.capture(parent,s)
 parent.marker='changed';s.ganyuResource.storm.turns=0
 eq(pcall(C.endTurn,s,owner),false);same(s,before);eq(parent.marker,'before');eq(parent.combat,s);eq(s.ganyuResource,resource)
 eq(Snapshot.ownedRestore(owner,s),nil)
 assert(C.endTurn(s));eq(s.ganyuResource.storm.turns,1)
end
print('GANYU_PUBLIC_END_TURN_TRANSACTION_PASS')

-- Actual Ice Cream retention remains native when the candidate starter relic is disabled.
for _,enabled in ipairs({false,true})do
 local s=fresh(enabled);s.relics={'ice_cream'};s.ganyuResource.storm=nil;s.ganyuResource.charge=2
 assert(C.endTurn(s));eq(s.energy,enabled and 3 or 5);eq(s.ganyuResource.charge,2)
end
do
 local s=fresh(false);s.relics={'ice_cream'};s.ganyuResource.storm=nil
 s.characterCandidate=nil
 assert(C.endTurn(s));eq(s.energy,5)
end
print('GANYU_ICE_CREAM_COMPATIBILITY_PASS')
