package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local U=require('abyss_defect_utility_cards')
local Queries=require('abyss_relic_queries')
local originalBonus=Queries.shop.xBonus
local cases=0
local function clone(value,seen)
 if type(value)~='table'then return value end
 seen=seen or {};if seen[value]then return seen[value]end
 local out={};seen[value]=out;for k,v in pairs(value)do out[k]=clone(v,seen)end;return out
end
local function encode(value,seen)
 if type(value)~='table'then return type(value)..':'..tostring(value)end
 seen=seen or {count=0};if seen[value]then return '@'..seen[value]end
 seen.count=seen.count+1;seen[value]=seen.count
 local out={'#'..seen[value]..'{'},keys
 keys={};for k in pairs(value)do keys[#keys+1]=k end
 table.sort(keys,function(a,b)if type(a)~=type(b)then return type(a)<type(b)end;return a<b end)
 for _,key in ipairs(keys)do out[#out+1]=encode(key,seen)..'='..encode(value[key],seen)..';'end
 out[#out+1]='}';return table.concat(out)
end
local function state()
 return {energy=3,orbs={balls={{kind='frost'},{kind='lightning'},{kind='frost'},{kind='dark'},{kind='plasma'}}},
  relics={},events={},rng={seed=7,calls=0},player={hp=60,statuses={}}}
end
local function intent(entries)
 return {target={intents={{effects=entries}},intentIndex=1}}
end
local function run(name,s,e,c,bonus,expected,observe)
 cases=cases+1
 local trace={};local original={state=s,effect=e,context=c};local before=encode(original)
 local errorObject={name='bonus failure'}
 Queries.shop.xBonus=function(actual)
  trace[#trace+1]='bonus';assert(actual==s,'[UTILITY_PLAN] wrong bonus owner')
  if bonus=='throw'then error(errorObject)end
  return bonus or 0
 end
 local function proxy(value,label)
  if type(value)~='table'then return value end
  return setmetatable({},{__index=function(_,key)trace[#trace+1]=label..'.'..tostring(key);return value[key]end})
 end
 local ps,pe,pc=s,e,c
 if observe then
  ps,pe,pc=proxy(s,'state'),proxy(e,'effect'),proxy(c,'context')
  Queries.shop.xBonus=function(actual)
   trace[#trace+1]='bonus';assert(actual==ps,'[UTILITY_PLAN] wrong proxy bonus owner');return bonus or 0
  end
 end
 local ok,result=pcall(U.planEffect,ps,pe,pc)
 Queries.shop.xBonus=originalBonus
 assert(encode(original)==before,'[UTILITY_PLAN] planner mutated inputs '..name)
 if expected then expected(ok,result,trace,errorObject)end
 if not ok and type(result)=='string'then result=result:gsub('^.-:%d+: ','')end
 if ABYSS_UTILITY_TRACE then print(name..'|'..tostring(ok)..'|'..encode({result=result,inputs=original,trace=trace,errorIdentity=result==errorObject}))end
end
local function success(ok)assert(ok,'[UTILITY_PLAN] expected successful plan')end
local function failure(ok)assert(not ok,'[UTILITY_PLAN] expected rejected input')end
run('barrage',state(),{op='barrageDamage',value=4,normalAmount=6},{},nil,function(ok,p)
 success(ok);assert(#p.top==5 and #p.bottom==0 and not p.consumeAllEnergy,'[UTILITY_PLAN] Barrage slot count')
 for _,e in ipairs(p.top)do assert(e.op=='damage'and e.value==4 and e.normalAmount==6,'[UTILITY_PLAN] Barrage NORMAL hit')end
end)
run('compile',state(),{op='compileDriverDraw',value=1},{},nil,function(ok,p)
 success(ok);assert(#p.top==1 and p.top[1].op=='draw'and p.top[1].value==4,'[UTILITY_PLAN] distinct orb count')
end)
run('intent damageAll',state(),{op='weakIfAttacking',value=2},intent({{op='block',value=-1},{op='damageAll',value=0}}),nil,function(ok,p)
 success(ok);assert(p.top[1].op=='applyStatus'and p.top[1].status=='weak'and p.top[1].value==2,'[UTILITY_PLAN] attack intent')
end)
run('intent late invalid damage',state(),{op='weakIfAttacking',value=2},intent({{op='damage',value=3},{op='damage',value=-1}}),nil,failure)
run('intent nonattack',state(),{op='weakIfAttacking',value=2},intent({{op='block',value=-1}}),nil,function(ok,p)success(ok);assert(#p.top==0,'[UTILITY_PLAN] nonattack')end)
for _,op in ipairs({'barrageDamage','compileDriverDraw'})do
 for _,balls in ipairs({{},{{kind='frost'}},{{kind='bad'}},{{kind='frost'},{kind='bad'}},{[2]={kind='dark'}}})do
  local s=state();s.orbs.balls=balls;run(op..' slots '..cases,s,{op=op,value=op=='barrageDamage'and 4 or 1,normalAmount=6},{})
 end
 for _,value in ipairs({-1,0,1,1.5,2147483647,2147483648,'1',false})do
  run(op..' values '..cases,state(),{op=op,value=value,normalAmount=value},{})
 end
 run(op..' no orbs',{}, {op=op,value=1,normalAmount=1},{},nil,failure)
end
for _,entry in ipairs({{}, {op='damage'}, {op='damage',value=1.5},{op='damage',value='1'},{op='damage',value=2147483648},{op='unknown',value=-1}})do
 run('intent entry '..cases,state(),{op='weakIfAttacking',value=1},intent({entry}))
end
for _,c in ipairs({{},false,{target={}},{target={intents={}}},{target={intents={{effects=false}},intentIndex=1}}})do
 run('intent context '..cases,state(),{op='weakIfAttacking',value=1},c,nil,failure)
end
for _,energy in ipairs({-1,0,1,999,2147483647,2147483648,1.5,false,'1'})do
 local s=state();s.energy=energy;run('double '..cases,s,{op='doubleEnergy',value=1},{})
end
run('double owner cap', {energy=999},{op='doubleEnergy',value=1},{},nil,function(ok,p)success(ok);assert(p.top[1].value==999,'[UTILITY_PLAN] double addition amount')end)
for _,energy in ipairs({0,1,3})do
 for _,capture in ipairs({{},{energyOnUse=-1},{energyOnUse=0},{energyOnUse=2},{energyOnUse=-2},{energyOnUse=1.5},{energyOnUse=false},{energyOnUse=2147483647}})do
  for _,free in ipairs({{}, {freeToPlayOnce=true},{freeToPlayOnce=false},{freeToPlayOnce=0}})do
   local s,c=state(),clone(capture);s.energy=energy;for k,v in pairs(free)do c[k]=v end
   run('x snapshot '..cases,s,{op='xBlock',blockAmount=7},c,2)
  end
 end
end
for _,override in ipairs({{},{chemicalX=false},{chemicalX=0},{chemicalX=1},{chemicalX='0'}})do
 run('x override '..cases,state(),{op='xBlock',blockAmount=7},override,2)
end
run('x free',{energy=3},{op='xBlock',blockAmount=7},{energyOnUse=2,freeToPlayOnce=true},2,function(ok,p)
 success(ok);assert(p.bottom[1].remaining==4 and p.bottom[1].fixed and not p.consumeAllEnergy,'[UTILITY_PLAN] X free plan')
end)
run('x zero',{energy=0},{op='xBlock',blockAmount=7},{},0,function(ok,p)success(ok);assert(#p.bottom==0 and not p.consumeAllEnergy,'[UTILITY_PLAN] X zero plan')end)
run('x throw',state(),{op='xBlock',blockAmount=7},{},'throw',function(ok,result,_,object)failure(ok);assert(result==object,'[UTILITY_PLAN] error object identity')end)
run('x bad bonus',state(),{op='xBlock',blockAmount=7},{},-5,nil)
for _,count in ipairs({-1,0,2,3,4,1.5,false,'1'})do
 run('ftl '..cases,state(),{op='ftlDamage',value=5,normalAmount=7,threshold=3},{cardsPlayedBefore=count})
end
run('ftl queues',state(),{op='ftlDamage',value=5,normalAmount=7,threshold=3},{cardsPlayedBefore=2},nil,function(ok,p)
 success(ok);assert(p.top[1]and p.top[1].op=='draw'and p.bottom[1]and p.bottom[1].op=='damage'and p.bottom[1].normalAmount==7,'[UTILITY_PLAN] FTL queue order')
end)
for _,op in ipairs({'barrageDamage','compileDriverDraw','weakIfAttacking','doubleEnergy','xBlock','ftlDamage','unknown'})do
 local context=intent({{op='damage',value=1}});context.cardsPlayedBefore=1
 local effect={op=op,value=1,normalAmount=2,blockAmount=3,threshold=3}
 run('observed '..op,state(),effect,context,2,success,true)
 run('missing values '..op,state(),{op=op},{})
end
run('unknown no state',nil,{op='unknown'},nil,nil,function(ok,p)success(ok);assert(p==nil,'[UTILITY_PLAN] unknown fallback')end)
run('missing effect',state(),nil,{})
run('false context',state(),{op='doubleEnergy',value=1},false,nil,success)
print('DEFECT_UTILITY_PLANNING_PASS '..cases)
