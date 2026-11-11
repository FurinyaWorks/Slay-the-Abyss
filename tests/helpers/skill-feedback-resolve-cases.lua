-- Run this exact fixture in a fresh VM for each complete old/current module.
-- Every field read is recorded; writes, RNG and module loading are forbidden.
local modulePath=assert(SKILL_FEEDBACK_MODULE_PATH)
local Skill=assert(loadfile(modulePath))()
local nilValue,opaque,readFailure={},{},{}
local count=0
local function scalar(value)
 if value==nil then return 'nil' end
 if value==opaque then return 'opaque' end
 if value==readFailure then return 'read_failure' end
 return type(value)..':'..tostring(value)
end
local function scenario(kind,detail,context,changes,failAt)
 local trace,reads={},{}
 local function proxy(values,prefix)
  return setmetatable({}, {
   __index=function(_,key)
    local label=prefix..'.'..tostring(key)
    trace[#trace+1]=label
    if #trace==failAt then error(readFailure,0) end
    reads[label]=(reads[label] or 0)+1
    local sequence=changes and changes[label]
    local value
    if sequence then value=sequence[math.min(reads[label],#sequence)] else value=values[key] end
    if value==nilValue then return nil end
    return value
   end,
   __newindex=function()error('feedback input write',0)end
  })
 end
 local c={};for key,value in pairs(context or {})do c[key]=value end
 if type(c.effects)=='table' then
  local effects={}
  for i,op in ipairs(c.effects)do effects[i]=proxy({op=op},'effect'..i)end
  c.effects=proxy(effects,'effects')
 end
 local d=detail and proxy(detail,'detail') or detail
 local ctx=context and proxy(c,'context') or context
 local ok,result=pcall(Skill.resolve,kind,d,ctx)
 count=count+1
 print(count..'|'..tostring(ok)..'|'..scalar(result)..'|'..table.concat(trace,','))
end
local kinds={'intent','play','damage','status','status_damage','hp_loss','block','heal','unknown',false}
local details={{},{status='poison'},{status='thorns'},{effectType='projectile'},{effectType='none'},
 {effectType='poison',status='poison'},{effectType=false},{effectType='buff'},{effectType='heavy'}}
local contexts={{},{enemyId='sentry',intentId='sentry_1',family='heavy'},
 {enemyId='unknown',intentId='sentry_1',effects={'damage'}},{family='poison',statusKind='buff'},
 {family='bind',weight='heavy'},{family='none',intentKind='charge'},
 {family='',weight='heavy'},{family=opaque},{effects={'applyStatus','gainStatus','block'}},
 {effects={'block','damage','applyStatus'}},{effects={'enemyStrengthAll'}},
 {effects={'applyStatusAll'},intentKind='attack'},{intentKind='debuff'},{family=false,intentKind='defend'}}
local random,loaded=math.random,require
math.random=function()error('feedback RNG',0)end
require=function()error('feedback module load',0)end
if not SKILL_FEEDBACK_MUTATION_PROBE then
for _,kind in ipairs(kinds)do
 for _,detail in ipairs(details)do
  for _,context in ipairs(contexts)do scenario(kind,detail,context)end
 end
end
-- Enumerate effect classification and ordering, including damage early exit.
local ops={'damage','damageAll','damageEqualToBlock','enemyVampireDamage','block',
 'gainStatus','enemyHealAll','enemyStrengthAll','applyStatus','applyStatusAll','unknown',false}
for _,a in ipairs(ops)do for _,b in ipairs(ops)do
 scenario('intent',{}, {effects={a,b},intentKind='attack'})
end end
else
 scenario('intent',{}, {effects={'gainStatus','block'}})
 scenario('intent',{}, {enemyId='sentry',intentId='sentry_1',family='heavy'})
 scenario('intent',{}, {family='poison',intentKind='attack'})
end
-- Metatable changes retain repeated reads and observable failure prefixes.
for _,value in ipairs({nilValue,false,'heavy',opaque})do
 scenario('damage',{}, {weight='heavy'}, {['detail.effectType']={'projectile',value}})
end
scenario('status',{status='poison'}, {family='poison'}, {['detail.status']={'weak','poison'}})
scenario('intent',{}, {}, {['context.intentKind']={'unknown','unknown','unknown','charge'}})
scenario('damage',{}, {family='projectile'}, {['context.weight']={'heavy'}})
if not SKILL_FEEDBACK_MUTATION_PROBE then
for _,kind in ipairs(kinds)do
 for stop=1,12 do scenario(kind,{status='weak'}, {effects={'block','gainStatus','applyStatus'},intentKind='debuff'},nil,stop)end
end
-- nil/false details and contexts continue to use the public defaults.
scenario('intent',nil,nil);scenario('damage',false,false)
end
math.random,require=random,loaded
print('SKILL_RESOLVE_CASES '..count)
