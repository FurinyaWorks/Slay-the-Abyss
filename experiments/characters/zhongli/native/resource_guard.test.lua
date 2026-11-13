package.path='./?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local L=require('experiments.characters.zhongli.native.lifecycle');local R=require('experiments.characters.zhongli.native.resource_cards');local Q=require('abyss_action_queue');local E=require('abyss_effects');local S=require('abyss_snapshot')
local function fresh(id,up,jade)
 local s=L.start(C.new(D,{seed=42,deck={'strike'},enemies={'cultist'}}),'guard',false)
 s.hand[1].cardId=id;s.hand[1].upgraded=up;s.zhongliCandidate.jade=jade;return s
end
local function run(s,fail)
 local p=R.prepare(s,s.hand[1].uid,1);assert(p.baseCost==2);local actions={};for _,e in ipairs(p.effects)do actions[#actions+1]={kind='effect',effect=e}end
 if fail then actions[#actions+1]={kind='fault'}end
 Q.start(s,actions);Q.run(s,{effect=function(st,a,q)
 if a.effect.op=='zhongliCard'then return R.dispatch(C,st,a.effect,q)end
 E.apply(C,st,{a.effect},st.player,st.enemies[1]);return true
 end,fault=function()error('after guard effect')end})
end
for _,id in ipairs({'zl28','zl66'})do for _,up in ipairs({false,true})do for jade=0,20 do
 local s=fresh(id,up,jade);run(s);assert(s.zhongliCandidate.jade==math.min(20,jade+(up and 7 or 5)))
 if id=='zl28'then assert(s.enemies[1].statuses.weak==(up and 3 or 2))else assert(s.player.statuses.flame_barrier==(up and 4 or 3))end
 assert(s.energy==3 and #s.hand==1)
end end end
for _,id in ipairs({'zl28','zl66'})do for _,up in ipairs({false,true})do
 local s=fresh(id,up,19);local z=s.zhongliCandidate;local ps,es=s.player.statuses,s.enemies[1].statuses;local restore=S.capture(s)
 assert(not pcall(run,s,true));restore();assert(s.zhongliCandidate==z and z.jade==19 and s.player.statuses==ps and s.enemies[1].statuses==es and ps.flame_barrier==nil and es.weak==nil and s.actionQueue==nil)
end end
for _,up in ipairs({false,true})do
 local s=fresh('zl28',up,0);s.enemies[1].statuses.artifact=1;run(s);assert(s.zhongliCandidate.jade==(up and 7 or 5)and s.enemies[1].statuses.artifact==0 and s.enemies[1].statuses.weak==nil)
 s=fresh('zl66',up,0);s.player.statuses.flame_barrier=2;run(s);assert(s.player.statuses.flame_barrier==(up and 6 or 5))
end
print('RESOURCE_GUARD_CONTRACT_PASS 84 native gain/Weak/counter effects +4 Snapshot +4 Artifact/stack cases; no payment or retaliation event proof')
