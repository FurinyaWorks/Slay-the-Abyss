local M=require('abyss_treasure_source')
local count=0
local function copy(value,seen)
 if type(value)~='table'then return value end
 seen=seen or {};if seen[value]then return seen[value]end
 local out={};seen[value]=out;for k,v in pairs(value)do out[copy(k,seen)]=copy(v,seen)end
 return setmetatable(out,getmetatable(value))
end
local function fixture(extras,gold,available,alias)
 local base={kind='relic',id='anchor',sourceId='Anchor',requestedId='Anchor',tier='common',available=available,
  trace={{tier='common',['end']=false,id='Anchor'}},origin='base',linkedSlot=2,slot=1}
 local key={kind='sapphire',relicId='anchor',linkedSlot=1,slot=2}
 local reward={items={base,key},relicId='anchor',relicSourceId='Anchor',relicUnavailable=not available,
  sapphireKey={relicId='anchor',linkedSlot=1,slot=2}}
 if gold then reward.gold=0;reward.items[#reward.items+1]={kind='gold',amount=0,slot=3}end
 if extras>0 then reward.extraRelics={}end
 for i=1,extras do
  local row=copy(base);row.slot=i+3;row.origin='matryoshka';row.linkedSlot=nil
  reward.items[#reward.items+1]=row;reward.extraRelics[#reward.extraRelics+1]=alias and row or copy(row)
 end
 return reward
end
local function check(reward)
 count=count+1;local input=TREASURE_GRAPH({reward=reward})
 local result=table.pack(M.pair(reward))
 assert(input==TREASURE_GRAPH({reward=reward}),'pair never mutates input graph')
 assert(result.n==(result[1]and 1 or 2),'public result arity')
 return table.unpack(result,1,result.n)
end
local function mutate(fn)
 local reward=fixture(2,true,true,false);fn(reward);return check(reward)
end
-- Named, independent assertions ensure each mutant kills the intended contract.
local function reject(fn,reason,label)
 local reward=fixture(2,true,true,false);fn(reward);local result,why=check(reward)
 assert(result==nil and why==reason,label)
end
local bad='treasure_reward_shape_unsupported'
reject(function(r)r.items[3].slot=1 end,bad,'duplicate slots rejected')
reject(function(r)local g=copy(r.items[3]);g.slot=9;r.items[#r.items+1]=g end,bad,'duplicate gold rejected')
reject(function(r)local k=copy(r.items[2]);k.slot=9;table.insert(r.items,1,k) end,bad,'duplicate sapphire rejected')
reject(function(r)local b=copy(r.items[1]);b.slot=9;table.insert(r.items,1,b) end,bad,'duplicate base rejected')
reject(function(r)r.items[4].origin='boss';r.relicId='mismatch' end,'boss_treasure_choice_required','boss refusal precedes linked identity')
reject(function(r)r.items[1].linkedSlot=9 end,bad,'base links sapphire slot')
reject(function(r)r.items[2].linkedSlot=9 end,bad,'sapphire links base slot')
reject(function(r)r.relicUnavailable=true end,bad,'availability identity preserved')
reject(function(r)r.sapphireKey.slot=9 end,bad,'root sapphire identity preserved')
reject(function(r)r.gold=99 end,bad,'gold amount identity preserved')
reject(function(r)r.extraRelics[1].id='other' end,bad,'extra canonical identity preserved')
reject(function(r)r.items[1].trace[1].id=7 end,bad,'relic trace shape validated')
reject(function(r)r.items[1].requestedId=7 end,bad,'relic requested source validated')
reject(function(r)r.items[2]=nil;r.items[3]=nil;r.items[4]=nil;r.items[5]=nil;r.relicId='mismatch' end,'treasure_choice_unavailable','missing key precedes linked identity')
local noExtra=fixture(0,false,true,false);noExtra.extraRelics={};local none,why=check(noExtra);assert(not none and why==bad,'unexpected extra list rejected')
local unavailable=fixture(0,false,false,false);local result=check(unavailable);assert(result and result.relicAvailable==false,'unavailable base can be forgone')
local values={false,0,-1,1.5,2147483648,'',{},function()end,math.huge,0/0}
for extras=0,2 do for _,gold in ipairs({false,true})do for _,available in ipairs({false,true})do for _,alias in ipairs({false,true})do
 local reward=fixture(extras,gold,available,alias);local result=assert(check(reward));assert(result.relicAvailable==available)
 -- Canonicalization is independent of insertion order and preserves Unicode/NUL.
 local reversed={};local keys={};for k in pairs(reward)do keys[#keys+1]=k end;table.sort(keys)
 for i=#keys,1,-1 do reversed[keys[i]]=reward[keys[i]]end
 assert(check(reversed).itemsSignature==result.itemsSignature,'canonical root order')
 for _,value in ipairs(values)do
  check(value)
  for _,field in ipairs({'items','gold','relicId','relicSourceId','relicUnavailable','extraRelics','sapphireKey'})do
   local input=copy(reward);input[field]=copy(value);check(input)
  end
 end
 for _,field in ipairs({'items','gold','relicId','relicSourceId','relicUnavailable','extraRelics','sapphireKey'})do local input=copy(reward);input[field]=nil;check(input)end
end end end end
for _,field in ipairs({'kind','id','sourceId','requestedId','tier','available','trace','origin','linkedSlot','slot','unknown'})do
 for _,value in ipairs(values)do mutate(function(r)r.items[1][field]=copy(value)end)end
 mutate(function(r)r.items[1][field]=nil end)
end
for _,field in ipairs({'kind','relicId','linkedSlot','slot','unknown'})do
 for _,value in ipairs(values)do mutate(function(r)r.items[2][field]=copy(value)end)end
 mutate(function(r)r.items[2][field]=nil end)
end
for _,field in ipairs({'kind','amount','slot','unknown'})do
 for _,value in ipairs(values)do mutate(function(r)r.items[3][field]=copy(value)end)end
 mutate(function(r)r.items[3][field]=nil end)
end
for _,field in ipairs({'tier','id','end','unknown'})do
 for _,value in ipairs(values)do mutate(function(r)r.items[1].trace[1][field]=copy(value)end)end
 mutate(function(r)r.items[1].trace[1][field]=nil end)
end
for _,which in ipairs({'root','items','base','key','gold','trace','traceRow','sapphire','extras','extra'})do
 mutate(function(r)
  local targets={root=r,items=r.items,base=r.items[1],key=r.items[2],gold=r.items[3],trace=r.items[1].trace,
   traceRow=r.items[1].trace[1],sapphire=r.sapphireKey,extras=r.extraRelics,extra=r.extraRelics[1]}
  setmetatable(targets[which],{__index=function()error('forbidden metatable read')end,__pairs=function()error('forbidden metatable traversal')end})
 end)
end
for _,field in ipairs({'items','extraRelics'})do
 for _,key in ipairs({0,-1,1.5,'1','extra',{},true})do mutate(function(r)r[field][key]={}end)end
 mutate(function(r)r[field][2]=nil end)
end
mutate(function(r)r.unexpected=r end)
mutate(function(r)r.items[1].trace[1].id='锚\0s2:{}';r.relicId='锚\0s2:{}';r.items[1].id=r.relicId;r.items[2].relicId=r.relicId;r.sapphireKey.relicId=r.relicId end)
print('TREASURE_SOURCE_EDGES_PASS '..count)
