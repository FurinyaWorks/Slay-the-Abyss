local Run=require('abyss_run')
local U=require('abyss_uncommon_relics')
local P=require('abyss_potion_health')
local n=0
local function check(name,fn)fn();n=n+1;print('ok '..n..' '..name)end
local function actor(hp,max,phase,relics)return {hp=hp or 20,maxHp=max or 80,phase=phase or 'reward',relics=relics or {'meat_on_the_bone'}}end
check('ordinary healing clamp returns actual gained amount',function()local r=actor(77);assert(Run.heal(r,12)==3 and r.hp==80);assert(Run.heal(r,0)==0)end)
check('Mark blocks and Flower applies only in combat',function()
 local r=actor(20,80,'combat',{'magic_flower'});assert(Run.heal(r,3)==5 and r.hp==25)
 r.phase='reward';assert(Run.heal(r,3)==3 and r.hp==28);r.relics={'mark_of_bloom'};assert(Run.heal(r,99)==0 and r.hp==28)
end)
check('integer bounds and invalid values fail before modifier',function()
 local old=P.modifyHealing;local called=0;P.modifyHealing=function(...)called=called+1;return old(...)end
 for _,v in ipairs({-1,1.5,math.huge,-math.huge,0/0,2147483648,'1',false,{}})do local r=actor();assert(not pcall(Run.heal,r,v));assert(r.hp==20)end
 assert(not pcall(Run.heal,actor(),nil));assert(called==0);P.modifyHealing=old
 local r=actor();assert(Run.heal(r,2147483647)==60)
end)
check('direct healing dead owner is retained',function()local r=actor(0);assert(Run.heal(r,12)==12 and r.hp==12)end)
check('dynamic modifier runs before HP read and preserves its effects',function()
 local old=P.modifyHealing;local r=actor();P.modifyHealing=function(v,relics,combat)assert(v==12 and relics==r.relics and not combat);r.hp=30;return 7 end
 assert(Run.heal(r,12)==7 and r.hp==37);P.modifyHealing=old
end)
check('modifier failure happens before healing write',function()
 local old=P.modifyHealing;local r=actor();P.modifyHealing=function()r.marker=true;error('modifier rejected')end
 local ok,e=pcall(Run.heal,r,12);P.modifyHealing=old;assert(not ok and tostring(e):find('modifier rejected',1,true));assert(r.hp==20 and r.marker)
end)
check('Meat predicate boundaries retain no-op and half-health inclusive',function()
 for _,hp in ipairs({0,41,80})do local r=actor(hp);U.battleEnd(r);assert(r.hp==hp)end
 local r=actor(40);U.battleEnd(r);assert(r.hp==52);r=actor(20,80,nil,{});U.battleEnd(r);assert(r.hp==20)
end)
check('public heal replacement is observed by Meat including return discard',function()
 local old=Run.heal;local r=actor();local calls=0;Run.heal=function(x,v)assert(x==r and v==12);calls=calls+1;x.hp=23;return 'custom' end
 assert(U.battleEnd(r)==nil and r.hp==23 and calls==1);Run.heal=old
end)
check('public heal error and mutation remain observable',function()
 local old=Run.heal;local r=actor();Run.heal=function(x)x.hp=25;error('public heal failed')end
 local ok,e=pcall(U.battleEnd,r);Run.heal=old;assert(not ok and tostring(e):find('public heal failed',1,true) and r.hp==25)
end)
check('public nil method fails only on eligible Meat path',function()
 local old=Run.heal;Run.heal=nil;local no=actor(41);assert(pcall(U.battleEnd,no));assert(not pcall(U.battleEnd,actor()));Run.heal=old
end)
check('Run surface remains plain raw iterable shared table',function()
 assert(getmetatable(Run)==nil and rawget(Run,'heal')==Run.heal);local found=false;for k,v in pairs(Run)do if k=='heal'then found=v==Run.heal end end;assert(found)
end)
check('maxHP increase dispatches dynamic heal after maxHP write',function()
 local old=Run.heal;local r=actor();Run.heal=function(x,v)assert(x==r and x.maxHp==85 and v==5);error('heal late')end
 local ok=pcall(Run.increaseMaxHp,r,5);Run.heal=old;assert(not ok and r.maxHp==85 and r.hp==20)
end)
print('RUN_HEAL_CONTRACT '..n)
