package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua')
local C=H.C;local eq,same=H.eq,H.same
local Resource=require('abyss_keqing_resources')
local function candidate(relics)
 local _,s=H.battle(relics or {},{'defend','defend','defend','defend','defend','defend'})
 s.experimentalMechanics=true;s.characterOwnerEnd='keqing'
 s.catalog.statuses.keqing_owner_end_probe={id='keqing_owner_end_probe',priority=5,decay='none'}
 s.player.statuses.keqing_owner_end_probe=1
 s.player.powerOrder=s.player.powerOrder or {};s.player.powerOrder[#s.player.powerOrder+1]='keqing_owner_end_probe'
 s.keqingResource=Resource.new(false,{bonusPerHit=2,relicBlock=4})
 s.keqingResource.infusion=2;s.keqingResource.wedgeUntil=s.turn
 return s
end
-- Public endTurn owns the real stage, not a test queue.
do
 local s=candidate();assert(C.endTurn(s));eq(s.turn,2);eq(s.keqingOwnerEndTurn,1)
 eq(s.keqingResource.infusion,0);eq(s.keqingResource.wedgeUntil,nil)
 s.keqingResource.infusion=2;assert(C.endTurn(s));eq(s.turn,3);eq(s.keqingOwnerEndTurn,2)
end
-- Real Codex pause, refusal, failed resume rollback, then successful continuation.
do
 local s=candidate({"Nilry's Codex"});local resource=s.keqingResource
 assert(C.endTurn(s));eq(s.turn,1);eq(s.keqingResource,resource);eq(resource.infusion,2)
 local pending=s.pendingChoice;local queue=s.actionQueue;local actions=queue.actions;local current=queue.current
 local token=pending.token;local before=C.copy(s)
 local ok,reason=C.endTurn(s);eq(ok,false);eq(reason,'card_choice_pending');same(s,before)
 eq(s.pendingChoice,pending);eq(s.actionQueue,queue)
 ok=C.chooseCard(s,token+1,0);eq(ok,false);same(s,before)
 resource.infusion=3;before=C.copy(s)
 eq(pcall(C.chooseCard,s,token,0),false);same(s,before)
 eq(s.keqingResource,resource);eq(s.pendingChoice,pending);eq(s.actionQueue,queue)
 eq(queue.actions,actions);eq(queue.current,current);eq(queue.paused,true)
 resource.infusion=2;assert(C.chooseCard(s,token,0))
 eq(s.turn,2);eq(s.keqingOwnerEndTurn,1);eq(s.keqingResource.infusion,0);eq(s.pendingChoice,nil)
 before=C.copy(s);ok=C.chooseCard(s,token,0);eq(ok,false);same(s,before)
end
-- A later owner-end failure restores even already-executed pre-card relics.
do
 local s=candidate({'Orichalcum',"Nilry's Codex"})
 s.codexEndTurnResolved=s.turn -- controlled skip of the offer, not the relic stage
 s.keqingResource.infusion=3;s.hand[1].costForTurn=0
 local before=C.copy(s);local resource=s.keqingResource;local hand=s.hand;local card=hand[1];local events=s.events
 eq(pcall(C.endTurn,s),false);same(s,before)
 eq(s.keqingResource,resource);eq(s.hand,hand);eq(s.hand[1],card);eq(s.events,events)
 eq(s.relicEndTurnResolved,nil);eq(s.player.block,0);eq(card.costForTurn,0)
 s.keqingResource.infusion=2;assert(C.endTurn(s));eq(s.keqingOwnerEndTurn,1)
end
-- Failure after resource commit/host enemy stage restores the pre-command graph.
do
 local s=candidate();local before=C.copy(s);local resource=s.keqingResource;local enemy=s.enemies[1]
 local start=C.startPlayerTurn
 C.startPlayerTurn=function()error('injected next-turn failure')end
 local ok=pcall(C.endTurn,s);C.startPlayerTurn=start
 eq(ok,false);same(s,before);eq(s.keqingResource,resource);eq(s.enemies[1],enemy)
 assert(C.endTurn(s));eq(s.keqingOwnerEndTurn,1)
end
-- Prior owner-end Constricted kills the player, so candidate cleanup never executes.
do
 local s=candidate();local enemy=s.enemies[1]
 enemy.ai={kind='act3',policy='spire_growth'};s.constrictedSource=enemy
 s.catalog.statuses.keqing_owner_end_probe.priority=106
 s.player.statuses.constricted=99;s.player.powerOrder={'constricted','keqing_owner_end_probe'}
 s.player.hp=1;local r=s.keqingResource
 assert(C.endTurn(s));eq(s.player.hp,0);eq(s.keqingResource,r);eq(r.infusion,2);eq(s.keqingOwnerEndTurn,nil)
end
-- Earlier Omega victory prevents owner-end resource cleanup and enemy actions.
do
 local s=candidate();s.player.statuses.omega=999
 s.player.powerOrder={'omega','keqing_owner_end_probe'}
 local r=s.keqingResource;assert(C.endTurn(s));eq(C.outcome(s),'victory')
 eq(s.keqingResource,r);eq(r.infusion,2);eq(s.keqingOwnerEndTurn,nil)
 for _,e in ipairs(s.events)do assert(e.kind~='enemy_turn','victory started enemy turn')end
end
-- The candidate contract is opt-in and fails closed, never selecting a formal class.
do
 local s=candidate();s.experimentalMechanics=false
 local before=C.copy(s);eq(pcall(C.endTurn,s),false);same(s,before)
end
print('KEQING_PUBLIC_END_TURN_PASS')
