package.path='./?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local Data=require('abyss_data');local Q=require('abyss_action_queue')
local L=require('experiments.characters.zhongli.native.lifecycle');local A=require('experiments.characters.zhongli.native.queue_adapter')
local function fresh()return L.start(C.new(Data,{seed=42,deck={'strike'},enemies={'cultist'}}),'queue',true)end
local function handlers(log)return {effect=function(s,a,q)log[#log+1]=a.effect.op;return A.dispatch(s,a.effect,q)end}end
for _,reverse in ipairs({false,true})do for _,hp in ipairs({2,20})do
 local s=fresh();s.enemies[1].hp=hp
 local installs={{kind='effect',effect={op='zlInstall',power='pillar',value=3}},{kind='effect',effect={op='zlInstall',power='repair',value=2}}}
 if reverse then installs[1],installs[2]=installs[2],installs[1]end
 -- This is a paid-effect-stage fixture, not a production canPlay/play claim.
 s.energy=s.energy-2;Q.start(s,installs);assert(Q.run(s,handlers({})))
 assert(s.energy==1 and s.zhongliCandidate.jade==3)
 local plan=A.plan(s);local log={};Q.start(s,plan);assert(Q.run(s,handlers(log)))
 assert(table.concat(log,',')=='zlOwnerEnd,zlPillar,zlRepair')
 assert(s.zhongliCandidate.jade==(hp==2 and 3 or 5));assert(not s.zhongliCandidate.ownerEndPending)
 Q.start(s,plan);assert(not pcall(Q.run,s,handlers({})))
end end
local s=fresh();s=L.install(s,'pillar',3);s=L.install(s,'repair',2)
local log={};Q.start(s,A.plan(s));local h=handlers(log);local effect=h.effect
h.effect=function(st,a,q)if a.effect.op=='zlPillar'then effect(st,a,q);return 'pause'end;return effect(st,a,q)end
assert(Q.run(s,h)=='pause');assert(s.zhongliCandidate.jade==3 and s.zhongliCandidate.ownerEndPending.stage=='repair')
assert(not pcall(A.plan,s));assert(Q.run(s,h)=='pause');assert(Q.resume(s,h)==true)
assert(s.zhongliCandidate.jade==5 and not s.zhongliCandidate.ownerEndPending)
-- Whole-command snapshot rollback remains the host's job; injected effect failure.
local s=fresh();local before=C.copy(s);Q.start(s,{{kind='effect',effect={op='zlInstall',power='repair',value=4}}})
assert(not pcall(Q.run,s,handlers({})));s=before;assert(s.energy==3 and s.player.statuses.zl_candidate_repair==nil and s.actionQueue==nil)
print('real ActionQueue acquisition-order/terminal cleanup/pause-resume/exactly-once and host-rollback fixtures passed; payment fixture only')
local Snapshot=require('abyss_snapshot')
local s=fresh();local player=s.player;local statuses=player.statuses;local hand=s.hand;local card=hand[1];local z=s.zhongliCandidate
local restore=Snapshot.capture(s)
Q.start(s,{{kind='effect',effect={op='zlInstall',power='pillar',value=3}},{kind='effect',effect={op='zlInstall',power='repair',value=99}}})
assert(not pcall(Q.run,s,handlers({})));assert(statuses.zl_candidate_pillar==3)
restore()
assert(s.player==player and s.player.statuses==statuses and s.hand==hand and s.hand[1]==card and s.zhongliCandidate==z)
assert(statuses.zl_candidate_pillar==nil and s.actionQueue==nil and player.powerScheduleOrder==nil)
require('abyss_actor_power_rules').validateDefinitions(player.statusDefinitions)
print('actual Snapshot.capture restore after partial queue failure preserves public references and removes partial Power installation')
