package.path='./?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local M=require('experiments.characters.zhongli.native.multi_resource');local L=require('experiments.characters.zhongli.native.lifecycle');local S=require('abyss_snapshot')
local function fresh(jade,dead)
 local s=C.new(D,{seed=42,deck={'strike'},enemies={'cultist','cultist'}})
 -- Explicit isolated resource state, NOT candidate Combat/Run initialization.
 s.zhongliCandidate={jade=jade,lastOwnerEnd=0,battleId='multi-storage'};if dead then s.enemies[dead].hp=0 end;return s
end
for _,dead in ipairs({1,2})do for jade=0,20 do for _,value in ipairs({0,3,20})do for _,kind in ipairs({'gainJade','spendJade','emptyJade'})do
 local s=fresh(jade,dead);local before=C.copy(s);local ok=M.canApply(s,kind,value);assert(ok==(kind~='spendJade'or jade>=value));assert(s.zhongliCandidate.jade==jade)
 if ok then local expected=kind=='gainJade'and math.min(20,jade+value)or kind=='spendJade'and jade-value or(jade==0 and value or jade);assert(M.apply(s,kind,value)==expected)
 else assert(not pcall(M.apply,s,kind,value));assert(s.zhongliCandidate.jade==before.zhongliCandidate.jade)end
 assert(not pcall(L.validate,s),'single-enemy lifecycle gate unexpectedly relaxed')
end end end end
for _,mutate in ipairs({function(s)s.player.hp=0 end,function(s)s.enemies[2].hp=0 end,function(s)s.enemies.x={}end,function(s)s.player.statuses.zl_candidate_repair=false end})do
 local s=fresh(3,1);mutate(s);local z=s.zhongliCandidate;assert(not M.canApply(s,'gainJade',3));assert(not pcall(M.apply,s,'gainJade',3));assert(s.zhongliCandidate==z and z.jade==3)
end
local s=fresh(6,1);local z=s.zhongliCandidate;local restore=S.capture(s);M.apply(s,'spendJade',6);assert(not pcall(M.apply,s,'spendJade',1));restore();assert(s.zhongliCandidate==z and z.jade==6)
print('MULTI_STORAGE_ISOLATED_PASS 378 survivor-position/resource cases +4 rejection +Snapshot; single-enemy lifecycle gate unchanged')
