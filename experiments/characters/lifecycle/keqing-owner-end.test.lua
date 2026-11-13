package.path='src/lua/?.lua;build/lua/?.lua;experiments/characters/lifecycle/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data')
local Q=require('abyss_action_queue');local S=require('abyss_snapshot');local P=require('abyss_end_turn_powers')
local L=dofile('experiments/characters/lifecycle/fixtures/keqing-resource.lua')
local E=require('keqing-owner-end').new(L)
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
local function fresh(resource)
 local s=C.new(D,{deck={'strike','defend'},enemies={'jaw_worm'},seed=31})
 s.player.hp=100;s.player.maxHp=100;s.enemies[1].hp=100;s.enemies[1].maxHp=100
 if resource then
  s.catalog.statuses.keqing_owner_end_probe={id='keqing_owner_end_probe',priority=5}
  s.player.statuses.keqing_owner_end_probe=1;s.player.powerOrder={'keqing_owner_end_probe'}
  s.keqingResource=L.new(false,{bonusPerHit=2,relicBlock=4})
  s.keqingResource.infusion=2;s.keqingResource.wedgeUntil=s.turn
 end
 return s
end
local h={}
h.allow=function(s)return s.player.hp>0 and not C.outcome(s)end
h.effect=function(s,a,q)
 local e=a.effect
 if e.op=='testPause'then s.pendingHandChoice={token='proof'};return 'pause'end
 if e.op=='testFail'then s.energy=99;error('injected failure')end
 if e.op=='keqingOwnerEndProbe'then return E.apply(s,e)end
 return P.apply(C,s,e,q)
end
local function actions(s)return P.prepare(s,C,E)end
-- Planning is non-consuming; the scheduled action commits exactly once.
do
 local s=fresh(true);local old=s.keqingResource;local list=actions(s)
 eq(#list,1);eq(old.infusion,2);Q.start(s,list);eq(Q.run(s,h),true)
 eq(s.keqingResource.infusion,0);eq(s.keqingResource.wedgeUntil,nil);eq(s.keqingOwnerEndTurn,s.turn);eq(old.infusion,2)
 local restore=S.capture(s);Q.start(s,list);eq(pcall(Q.run,s,h),false);restore();eq(s.actionQueue,nil)
end
-- Pause/repeat/abort leave resources alone. Resume clears exactly once.
do
 local s=fresh(true);local list=actions(s);table.insert(list,1,{kind='effect',effect={op='testPause'}})
 local original=s.keqingResource;local restore=S.capture(s)
 Q.start(s,list);eq(Q.run(s,h),'pause');eq(s.keqingResource,original);eq(original.infusion,2)
 eq(Q.run(s,h),'pause');eq(s.keqingOwnerEndTurn,nil)
 restore();eq(s.keqingResource,original);eq(s.actionQueue,nil);eq(s.pendingHandChoice,nil)
 Q.start(s,list);eq(Q.run(s,h),'pause');s.pendingHandChoice=nil
 eq(Q.resume(s,h),true);eq(s.keqingResource.infusion,0);eq(s.actionQueue,nil);eq(pcall(Q.resume,s,h),false)
end
-- Downstream failure restores aliases, exactly-once marker, unrelated fields.
do
 local s=fresh(true);local original=s.keqingResource;local energy=s.energy
 local list=actions(s);list[#list+1]={kind='effect',effect={op='testFail'}}
 local restore=S.capture(s);Q.start(s,list);eq(pcall(Q.run,s,h),false)
 eq(s.keqingResource.infusion,0);restore()
 eq(s.keqingResource,original);eq(original.infusion,2);eq(s.energy,energy)
 eq(s.keqingOwnerEndTurn,nil);eq(s.actionQueue,nil)
 Q.start(s,actions(s));eq(Q.run(s,h),true);eq(s.keqingResource.infusion,0)
end
for _,terminal in ipairs({'death','victory'})do
 local s=fresh(true);local list=actions(s)
 if terminal=='death'then s.player.hp=0 else s.enemies[1].hp=0 end
 Q.start(s,list);eq(Q.run(s,h),true);eq(s.keqingResource.infusion,2);eq(s.keqingOwnerEndTurn,nil)
end
-- Preserve existing scheduled power position.
do
 local s=fresh(true);s.player.statuses.ritual=2;s.player.powerOrder={'ritual','keqing_owner_end_probe'}
 local list=actions(s);eq(list[1].effect.op,'gainStatus');eq(list[2].effect.op,'keqingOwnerEndProbe')
end
-- No marker invokes no candidate plan. Full legacy endTurn still runs unchanged.
do
 local a=fresh(false);local b=C.copy(a)
 eq(#P.prepare(a,C,E),#P.prepare(b,C,require('abyss_act3_powers')))
 assert(C.endTurn(a));assert(C.endTurn(b))
 eq(a.turn,b.turn);eq(a.player.hp,b.player.hp);eq(a.energy,b.energy);eq(#a.events,#b.events)
 eq(a.keqingResource,nil);eq(a.keqingOwnerEndTurn,nil)
end
-- The Act3 extension is composed, never replaced by candidate membership.
do
 local s=fresh(false);local source=s.enemies[1]
 source.ai={kind='act3',policy='spire_growth'};s.constrictedSource=source
 s.player.statuses.constricted=7;s.player.powerOrder={'constricted'}
 local expected=P.prepare(s,C,require('abyss_act3_powers'));local actual=actions(s)
 eq(#actual,#expected);eq(actual[1].effect.op,'ownerEndThorns')
 eq(actual[1].effect.source,source);eq(actual[1].effect.value,7)
 Q.start(s,actual);eq(Q.run(s,h),true);eq(s.player.hp,93)
end
-- A stale saved action cannot clear resources from a later turn.
do
 local s=fresh(true);local list=actions(s);s.turn=s.turn+1
 Q.start(s,list);eq(pcall(Q.run,s,h),false);eq(s.keqingResource.infusion,2)
end
print('KEQING_OWNER_END_SEAM_PASS')
