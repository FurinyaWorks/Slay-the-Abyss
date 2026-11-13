package.path='./?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local Data=require('abyss_data');local C=require('abyss_combat');local Schedule=require('abyss_power_schedule')
local L=require('experiments.characters.zhongli.native.lifecycle')
local function fresh()return C.new(Data,{seed=42,deck={'strike','defend'},enemies={'cultist'}})end
local function same(a,b)assert(type(a)==type(b));if type(a)~='table'then assert(a==b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local raw=fresh();local before=C.copy(raw);local s=L.start(raw,'battle1',true);same(raw,before);assert(s.zhongliCandidate.jade==3)
assert(not pcall(L.start,s,'battle1',true))
assert(L.start(fresh(),'battle2',false).zhongliCandidate.jade==0)
local count=0
for _,p in ipairs({3,4})do for _,r in ipairs({2,3})do for _,hp in ipairs({1,3,10})do for _,block in ipairs({0,2,8})do
 local a=L.start(fresh(),'matrix',true);a.enemies[1].hp=hp;a.enemies[1].block=block;a.enemies[1].statuses.vulnerable=9
 a=L.install(a,'repair',r);a=L.install(a,'pillar',p)
 local before=C.copy(a);local b=L.ownerEnd(a,1);same(a,before)
 local loss=math.min(hp,math.max(0,p-block));assert(b.enemies[1].hp==hp-loss)
 assert(b.enemies[1].block==math.max(0,block-p))
 assert(b.zhongliCandidate.jade==(hp-loss>0 and 3+r or 3))
 assert(not pcall(L.ownerEnd,b,1));assert(not pcall(L.ownerEnd,a,2));count=count+1
end end end end
s=L.install(s,'pillar',4);local entries=#Schedule.list(s.player);s=L.install(s,'pillar',3)
assert(s.player.statuses.zl_candidate_pillar==4 and #Schedule.list(s.player)==entries)
s=L.install(s,'repair',3);s.zhongliCandidate.jade=19;s=L.ownerEnd(s,1);assert(s.zhongliCandidate.jade==20)
local removed=L.removePillar(s);assert(removed.player.statuses.zl_candidate_pillar==nil)
assert(not pcall(L.removePillar,removed));assert(#Schedule.list(removed.player)==1)
local hp=removed.enemies[1].hp;removed=L.ownerEnd(removed,2);assert(removed.enemies[1].hp==hp)
local restarted=L.start(fresh(),'battle2',true);assert(restarted.zhongliCandidate.jade==3 and not restarted.player.statuses.zl_candidate_pillar and not restarted.player.statuses.zl_candidate_repair)
for _,args in ipairs({{'unknown',1},{'pillar',0},{'pillar',7},{'repair',4},{'pillar',0/0}})do local b=C.copy(s);assert(not pcall(L.install,s,args[1],args[2]));same(s,b)end
local dead=C.copy(s);dead.player.hp=0;assert(not pcall(L.ownerEnd,dead,2));assert(not pcall(L.install,dead,'pillar',3))
local multi=fresh();multi.enemies[2]=C.copy(multi.enemies[1]);assert(not pcall(L.start,multi,'multi',true))
-- Native Intangible is deliberately not bypassed by the candidate fixed pulse.
local a=L.install(L.start(fresh(),'intangible',false),'pillar',4);a.enemies[1].statuses.intangible=1
local hp=a.enemies[1].hp;local b=L.ownerEnd(a,1);assert(hp-b.enemies[1].hp==1)
print('isolated native lifecycle '..count..' owner-end matrix cases; relic once/fresh reset, real Schedule max/removal, fixed Actor damage and Intangible, rejection unchanged passed')

for value=4,6 do
 local bad=L.install(L.start(fresh(),'invalidrepair',true),'pillar',3)
 bad.player.statuses.zl_candidate_repair=value
 local before=C.copy(bad)
 for _,fn in ipairs({function()L.ownerEnd(bad,1)end,function()L.install(bad,'pillar',4)end,function()L.removePillar(bad)end})do
  assert(not pcall(fn));same(bad,before)
 end
end
print('repair4..6 invalid-state rejection through every existing-state entry passed')
