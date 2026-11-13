package.path='./?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local R=require('experiments.characters.zhongli.native.multi_resource');local T=require('experiments.characters.zhongli.native.multi_target');local Q=require('abyss_action_queue');local E=require('abyss_effects');local S=require('abyss_snapshot')
local function fresh()
 local s=C.new(D,{seed=42,deck={'strike'},enemies={'cultist','cultist','cultist'}})
 s.zhongliCandidate={jade=6,lastOwnerEnd=0,battleId='multi-queue'};return s
end
local function run(s,id,up,index,fail)
 local binding=T.select(s,index);local cost=id=='zl04'and 6 or 3;assert(R.canApply(s,'spendJade',cost))
 local tail=id=='zl04'and{op='damage',value=up and 18 or 14}or{op='applyStatus',status='weak',value=up and 4 or 3}
 Q.start(s,{{kind='effect',effect={op='resource'}},{kind='effect',effect=tail}})
 Q.run(s,{effect=function(st,a)
 if a.effect.op=='resource'then T.resolve(st,binding);R.apply(st,'spendJade',cost);return true end
 E.apply(C,st,{a.effect},st.player,T.resolve(st,binding));if fail then error('after actual selected tail')end;return true end})
end
local count=0
for _,id in ipairs({'zl04','zl57'})do for _,up in ipairs({false,true})do for index=1,3 do
 local s=fresh();local hp={};for i,e in ipairs(s.enemies)do hp[i]=e.hp end
 run(s,id,up,index);assert(s.zhongliCandidate.jade==(id=='zl04'and 0 or 3))
 for i,e in ipairs(s.enemies)do
 assert(e.hp==hp[i]-(i==index and id=='zl04'and(up and 18 or 14)or 0));assert((e.statuses.weak or 0)==(i==index and id=='zl57'and(up and 4 or 3)or 0))
 end;assert(s.energy==3 and #s.hand==1);count=count+1
end end end
for _,id in ipairs({'zl04','zl57'})do for _,up in ipairs({false,true})do
 local s=fresh();s.enemies[1].hp=0;local e=s.enemies[2];local hp=e.hp;local z=s.zhongliCandidate;local restore=S.capture(s)
 assert(not pcall(run,s,id,up,2,true));restore();assert(s.enemies[2]==e and e.hp==hp and e.statuses.weak==nil and s.zhongliCandidate==z and z.jade==6 and s.actionQueue==nil)
 run(s,id,up,2);assert(s.zhongliCandidate.jade==(id=='zl04'and 0 or 3));count=count+1
end end
assert(count==16)
print('MULTI_SELECTED_QUEUE_PASS 12 target/card/version effects +4 first-dead retry and whole-state restores; no paid stage or pillar')
