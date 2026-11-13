package.path='./?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local Data=require('abyss_data');local Copy=require('abyss_copy').copy
local L=require('experiments.characters.zhongli.native.lifecycle');local E=require('experiments.characters.zhongli.native.card_effects');local Q=require('abyss_action_queue');local Snapshot=require('abyss_snapshot')
local definitions=require('experiments.characters.zhongli.native.power_candidates')
assert(#definitions==6)
for _,def in ipairs(definitions)do
 assert(def.experimental and def.type=='power')
 assert(not require('abyss_effects').supported(def.effects),'unintegrated op unexpectedly admitted')
 for _,up in ipairs({false,true})do
  local s=L.start(C.new(Data,{seed=42,deck={'strike'},enemies={'cultist'}}),'dispatch',true)
  local actions={};for _,e in ipairs(up and def.upgrade.effects or def.effects)do if e.op=='zhongliCard'then actions[#actions+1]={kind='effect',effect=e}end end
  Q.start(s,actions);assert(Q.run(s,{effect=function(st,a,q)return E.dispatch(C,st,a.effect,q)end}))
  local expectedP={zl21=up and 4 or 3,zl48=up and 4 or 3,zl55=up and 2 or 1,zl67=up and 4 or 3}
  local expectedR={zl31=up and 3 or 2,zl51=up and 3 or 2,zl55=up and 2 or 1}
  assert(s.player.statuses.zl_candidate_pillar==expectedP[def.id]);assert(s.player.statuses.zl_candidate_repair==expectedR[def.id]);assert(s.energy==3 and #s.hand==1)
 end
end
local bads={{op='zhongliCard',kind='unknown',value=3},{op='zhongliCard',kind='installRepair',value=4},{op='zhongliCard',kind='installPillar',value=3,condition='jade'},{op='zhongliCard',kind='installPillar',value=-1}}
for _,bad in ipairs(bads)do
 local s=L.start(C.new(Data,{seed=42,deck={'strike'},enemies={'cultist'}}),'failure',true);local status=s.player.statuses;local hand=s.hand
 local restore=Snapshot.capture(s);Q.start(s,{{kind='effect',effect={op='zhongliCard',kind='installPillar',value=3}},{kind='effect',effect=bad}})
 assert(not pcall(Q.run,s,{effect=function(st,a,q)return E.dispatch(C,st,a.effect,q)end}));restore()
 assert(s.player.statuses==status and s.hand==hand and status.zl_candidate_pillar==nil and s.actionQueue==nil)
end
print('six experimental Power proposal base/upgraded install endpoints: real Queue + Snapshot; shared Effects explicitly still rejects unregistered opcode')

local s=L.start(C.new(Data,{seed=42,deck={'strike'},enemies={'cultist'}}),'preflight',true)
s.hand[1].cardId='zl21';s.hand[1].upgraded=true;local uid=s.hand[1].uid
local ok,reason=E.canUse(s,uid);assert(ok and reason==nil);local rejected,why=E.canUse(s,'absent');assert(not rejected and type(why)=='string');local p=E.prepare(s,uid);assert(p.uid==uid and p.upgraded and p.effects[1].value==4)
p.effects[1].value=99;assert(E.prepare(s,uid).effects[1].value==4)
assert(not E.canUse(s,'absent'));s.pendingChoice={};assert(not E.canUse(s,uid));s.pendingChoice=nil
s.player.hp=0;assert(not E.canUse(s,uid))
print('role-only prepare binds live UID/upgrade and rejects pending/terminal; host payment and target checks remain required')
