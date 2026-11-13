package.path='./?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local T=require('experiments.characters.zhongli.native.multi_target');local E=require('abyss_effects');local S=require('abyss_snapshot')
local function fresh()return C.new(D,{seed=42,deck={'strike'},enemies={'cultist','cultist','cultist'}})end
for selected=1,3 do
 local s=fresh();local binding=T.select(s,selected);local actor=s.enemies[selected];local hp=actor.hp;local prior={};for i,e in ipairs(s.enemies)do prior[i]=e.hp end
 E.apply(C,s,{{op='damage',value=6}},s.player,T.resolve(s,binding));assert(actor.hp==hp-6)
 for i,e in ipairs(s.enemies)do if i~=selected then assert(e.hp==prior[i])end end
 -- Reordering storage never redirects the selected identity to a different enemy.
 s.enemies[1],s.enemies[3]=s.enemies[3],s.enemies[1];assert(T.resolve(s,binding)==actor)
 actor.hp=0;assert(not pcall(T.resolve,s,binding));actor.hp=hp
 for i,e in ipairs(s.enemies)do if e==actor then table.remove(s.enemies,i);break end end;assert(not pcall(T.resolve,s,binding))
end
local s=fresh();s.enemies[1].hp=0;local b=T.select(s,2);assert(T.resolve(s,b)==s.enemies[2]);assert(not pcall(T.select,s,1))
for _,idx in ipairs({0,4,-1,1.5,'2',false})do assert(not pcall(T.select,s,idx))end
local duplicate=fresh();duplicate.enemies[2].id=duplicate.enemies[1].id;assert(not pcall(T.select,duplicate,3))
local invalid=fresh();invalid.enemies.extra={};assert(not pcall(T.select,invalid,1))
s=fresh();b=T.select(s,2);local e=s.enemies[2];local hp=e.hp;local restore=S.capture(s)
E.apply(C,s,{{op='damage',value=6}},s.player,T.resolve(s,b));e.hp=0;assert(not pcall(T.resolve,s,b));restore();assert(s.enemies[2]==e and e.hp==hp and T.resolve(s,b)==e)
print('MULTI_TARGET_ISOLATED_PASS three native selected attacks, reorder/death/removal, first-dead targeting, malformed identity and Snapshot; no paid card admission')
