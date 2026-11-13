-- Native role execution only: no public energy or useCard assertion.
package.path='./?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local L=require('experiments.characters.zhongli.native.lifecycle')
local R=require('experiments.characters.zhongli.native.resource_cards');local Q=require('abyss_action_queue');local E=require('abyss_effects');local S=require('abyss_snapshot')
local function fresh(id,up)
 local s=L.start(C.new(D,{seed=42,deck={'strike'},enemies={'cultist'}}),'modifiers',false)
 s.zhongliCandidate.jade=6;s.hand[1].cardId=id;s.hand[1].upgraded=up;return s
end
local function execute(s,fail)
 local p=R.prepare(s,s.hand[1].uid,1);local actions={};for _,e in ipairs(p.effects)do actions[#actions+1]={kind='effect',effect=e}end
 if fail then actions[#actions+1]={kind='fault'}end
 Q.start(s,actions);Q.run(s,{effect=function(st,a,q)
  if a.effect.op=='zhongliCard'then return R.dispatch(C,st,a.effect,q)end
  E.apply(C,st,{a.effect},st.player,st.enemies[1]);return true
 end,fault=function()error('post modifier fault')end})
end
local n=0
for _,up in ipairs({false,true})do for _,dex in ipairs({-30,-2,0,3})do for _,frail in ipairs({0,1})do for _,blocked in ipairs({0,1})do for _,prior in ipairs({0,995,999})do
 local s=fresh('zl16',up);s.player.block=prior;s.player.statuses.dexterity=dex;s.player.statuses.frail=frail;s.player.statuses.no_block=blocked
 local amount=blocked==1 and 0 or math.max(0,math.floor(((up and 21 or 16)+dex)*(frail==1 and 0.75 or 1)))
 execute(s);assert(s.player.block==math.min(999,prior+amount));assert(s.zhongliCandidate.jade==0 and s.energy==3);n=n+1
end end end end end
local m=0
for _,up in ipairs({false,true})do for _,artifact in ipairs({0,1,2})do for _,prior in ipairs({0,2})do
 local s=fresh('zl57',up);s.enemies[1].statuses.artifact=artifact;s.enemies[1].statuses.weak=prior
 execute(s);assert(s.enemies[1].statuses.weak==prior+(artifact==0 and(up and 4 or 3)or 0));assert(s.enemies[1].statuses.artifact==math.max(0,artifact-1));assert(s.zhongliCandidate.jade==3)
 m=m+1
end end end
for _,up in ipairs({false,true})do
 local s=fresh('zl57',up);s.enemies[1].statuses.artifact=1;local a=s.enemies[1].statuses;local z=s.zhongliCandidate;local restore=S.capture(s)
 assert(not pcall(execute,s,true));restore();assert(s.enemies[1].statuses==a and a.artifact==1 and a.weak==nil and s.zhongliCandidate==z and z.jade==6 and s.actionQueue==nil)
end
assert(n==96 and m==12)
print('RESOURCE_DEFENSE_MODIFIERS_PASS 96 Block modifier/cap +12 Artifact/Weak cases +2 post-Artifact Snapshot restores; role-only')
