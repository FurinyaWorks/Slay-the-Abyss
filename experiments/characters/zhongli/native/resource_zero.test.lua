package.path='./?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local L=require('experiments.characters.zhongli.native.lifecycle');local R=require('experiments.characters.zhongli.native.resource_cards');local Q=require('abyss_action_queue');local E=require('abyss_effects');local S=require('abyss_snapshot')
local function fresh(id,up,jade)
 local s=L.start(C.new(D,{seed=42,deck={'strike'},enemies={'cultist'}}),'zero',false)
 s.hand[1].cardId=id;s.hand[1].upgraded=up;s.energy=0;s.zhongliCandidate.jade=jade;return s
end
local function execute(s,fail)
 local p=R.prepare(s,s.hand[1].uid,1);assert(p.baseCost==0 and p.definition.exhaust)
 local actions={};for _,e in ipairs(p.effects)do actions[#actions+1]={kind='effect',effect=e}end
 if fail then actions[#actions+1]={kind='fault'}end
 Q.start(s,actions);Q.run(s,{effect=function(st,a,q)
 if a.effect.op=='zhongliCard'then return R.dispatch(C,st,a.effect,q)end
 E.apply(C,st,{a.effect},st.player,st.enemies[1]);return true
 end,fault=function()error('after zero card tail')end})
end
for _,id in ipairs({'zl39','zl73'})do for _,up in ipairs({false,true})do for jade=0,20 do
 local s=fresh(id,up,jade);local hp=s.enemies[1].hp
 assert(R.canUse(s,s.hand[1].uid,1)==(jade>=3));assert(not R.canUse(s,s.hand[1].uid,99));assert(s.zhongliCandidate.jade==jade)
 if jade>=3 then execute(s);assert(s.zhongliCandidate.jade==jade-3 and s.energy==0 and #s.hand==1)
 if id=='zl39'then assert(s.enemies[1].hp==hp-(up and 8 or 6))else assert(s.enemies[1].statuses.weak==(up and 2 or 1))end end
end end end
for _,id in ipairs({'zl39','zl73'})do for _,up in ipairs({false,true})do
 local s=fresh(id,up,3);local hp=s.enemies[1].hp;local z,enemy=s.zhongliCandidate,s.enemies[1];local restore=S.capture(s)
 assert(not pcall(execute,s,true));restore();assert(s.zhongliCandidate==z and z.jade==3 and s.enemies[1]==enemy and enemy.hp==hp and enemy.statuses.weak==nil and s.actionQueue==nil)
end end
-- Independent ordinary attack modifier expectation; resource is not refunded by armor.
for _,up in ipairs({false,true})do
 local s=fresh('zl39',up,3);s.player.statuses.strength=2;s.player.statuses.weak=1;s.enemies[1].statuses.vulnerable=1;s.enemies[1].block=5
 local hp=s.enemies[1].hp;execute(s);assert(s.enemies[1].hp==hp-(math.floor(((up and 8 or 6)+2)*0.75*1.5)-5)and s.zhongliCandidate.jade==0)
end
print('RESOURCE_ZERO_CONTRACT_PASS 84 zero-energy reserve/base-up cases +4 native-tail Snapshot +2 ordinary modifier cases; public exhaust not yet tested')
