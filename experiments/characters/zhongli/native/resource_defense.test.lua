package.path='./?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local L=require('experiments.characters.zhongli.native.lifecycle')
local R=require('experiments.characters.zhongli.native.resource_cards');local Q=require('abyss_action_queue');local S=require('abyss_snapshot');local E=require('abyss_effects')
local function state(id,up,jade)
 local s=L.start(C.new(D,{seed=42,deck={'strike'},enemies={'cultist'}}),'defense',false)
 s.zhongliCandidate.jade=jade;s.hand[1].cardId=id;s.hand[1].upgraded=up;return s
end
local function run(s,p,fail)
 local actions={};for _,e in ipairs(p.effects)do actions[#actions+1]={kind='effect',effect=e}end
 if fail then actions[#actions+1]={kind='effect',effect={op='fault'}}end
 Q.start(s,actions);return Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='zhongliCard'then return R.dispatch(C,st,a.effect,q)end
  assert(a.effect.op~='fault','injected after native effect')
  E.apply(C,st,{a.effect},st.player,st.enemies[1]);return true
 end})
end
for _,id in ipairs({'zl16','zl57'})do for _,up in ipairs({false,true})do for jade=0,20 do
 local s=state(id,up,jade);local need=id=='zl16'and 6 or 3;local uid=s.hand[1].uid
 assert(R.canUse(s,uid,1)==(jade>=need));assert(s.zhongliCandidate.jade==jade and s.energy==3)
 if jade>=need then
  local p=R.prepare(s,uid,1);assert(p.baseCost==1 and not p.definition.exhaust)
  assert(run(s,p));assert(s.zhongliCandidate.jade==jade-need)
  if id=='zl16'then assert(s.player.block==(up and 21 or 16))else assert(s.enemies[1].statuses.weak==(up and 4 or 3))end
  assert(s.energy==3 and s.hand[1].uid==uid) -- role execution, NOT public payment
 end
end end end
for _,id in ipairs({'zl16','zl57'})do for _,up in ipairs({false,true})do
 local s=state(id,up,6);local p=R.prepare(s,s.hand[1].uid,1);local z=s.zhongliCandidate;local statuses=s.enemies[1].statuses;local hand=s.hand;local restore=S.capture(s)
 assert(not pcall(run,s,p,true));restore();assert(s.zhongliCandidate==z and z.jade==6 and s.enemies[1].statuses==statuses and statuses.weak==nil and s.player.block==0 and s.hand==hand and s.actionQueue==nil)
end end
print('RESOURCE_DEFENSE_CONTRACT_PASS 84 reserve/version cases, native block/Weak Queue and four post-effect Snapshot restorations; no public payment')
