local trace, errorObject = {}, {kind='getter-error'}
local function pair()
 return {{op='applyStatusAll',status='weak',value=2,targetGroup='weak_then_vulnerable'},
 {op='applyStatusAll',status='vulnerable',value=2,targetGroup='weak_then_vulnerable'}}
end
local function check(label,build)
 for _,entry in ipairs({'private','supported','apply'}) do
  trace={}
  local input=build()
  local state={player={hp=30,statuses={}},enemies={{hp=20,statuses={}}},events={}}
  local combat={outcome=function() trace[#trace+1]='outcome';return nil end}
  if entry=='apply' and (label=='valid' or label=='unmarked-partial') then
   combat=require('abyss_combat');state=combat.new(require('abyss_data'),{seed=42,deck={'strike'},enemies={'cultist','cultist'}})
  end
  local f=entry=='private' and GROUP_TARGET or entry=='supported' and GROUP_EFFECTS.supported or function(v)
   -- A malformed group must be rejected before any combat access/effect.
   return GROUP_EFFECTS.apply(combat,state,v,state.player,state.enemies[1])
  end
  GROUP_GRAPH_WRITE({input=input,trace=trace,state=state,errorObject=errorObject},label..':'..entry..':before')
  math.randomseed(177);local expected=math.random();math.randomseed(177)
  debug.sethook(function() error("target-group instruction budget") end, "", 1000000)
  local result=table.pack(pcall(f,input))
  debug.sethook()
  if label=='valid' then
   assert(result[1], 'valid pair succeeds')
   if entry=='private' then assert(result.n==2 and result[2]==1,'group index/arity') end
   if entry=='supported' then assert(result.n==2 and result[2]==true,'support arity') end
   if entry=='apply' then assert(result.n==2 and state.enemies[1].statuses.weak==2 and state.enemies[2].statuses.vulnerable==2,'real pair applied') end
  elseif label=='unmarked-partial' and entry=='apply' then
   assert(not result[1] and state.energy==4,'unmarked later failure retains earlier energy')
  end
  -- Lua location prefixes move with extraction; retain complete error payload otherwise.
  if not result[1] and type(result[2])=='string' then result[2]=result[2]:gsub('effects.lua:%d+:','effects.lua:<line>:') end
  assert(math.random()==expected,'target group changed RNG')
  GROUP_GRAPH_WRITE({input=input,trace=trace,state=state,result=result,errorObject=errorObject},label..':'..entry..':after')
 end
end
check('valid',pair)
check('empty',function()return {} end)
check('nil',function()return nil end)
check('false',function()return false end)
check('string',function()return 'x' end)
check('unmarked-cycle',function()local v={};v[1]=v;return v end)
check('unmarked-shared',function()local v={op='block',value=1};return {v,v} end)
for _,key in ipairs({0,-1,1.5,'extra',true}) do
 check('bad-key-'..tostring(key),function()local v=pair();v[key]=false;return v end)
end
check('hole',function()local v=pair();v[4]=v[2];v[2]=nil;return v end)
check('non-table',function()local v=pair();v[3]=false;return v end)
check('non-adjacent',function()local v=pair();v[3]=v[2];v[2]={op='block',value=1};return v end)
check('single',function()local v=pair();v[2]=nil;return v end)
check('three',function()local v=pair();v[3]=pair()[1];return v end)
check('reversed',function()local v=pair();v[1],v[2]=v[2],v[1];return v end)
check('unequal',function()local v=pair();v[2].value=3;return v end)
check('extra-field',function()local v=pair();v[1].extra=true;return v end)
check('nested-marker',function()return {{op='conditional',['then']=pair()}} end)
check('marked-table-key',function()return {[pair()[1]]=false} end)
check('cycle',function()local v=pair();v[3]=v;return v end)
check('shared-marked',function()local v=pair();v[3]={nested=v[1]};return v end)
check('root-marker',function()local v=pair();v.targetGroup=false;return v end)
check('aliased-members',function()local v=pair();v[2]=v[1];return v end)
for _,amount in ipairs({0,-1,0.5,2147483647,2147483648,'2',false,math.huge,0/0}) do
 check('amount-'..tostring(amount),function()local v=pair();v[1].value=amount;v[2].value=amount;return v end)
end
for _,field in ipairs({'targetGroup','op','status','value'}) do
 check('dynamic-'..field,function()
  local v=pair();local original=v[1][field];v[1][field]=nil
  setmetatable(v[1],{__index=function(_,key)trace[#trace+1]=key;if key==field then return original end end})
  return v
 end)
 check('throw-'..field,function()
  local v=pair();v[1][field]=nil
  setmetatable(v[1],{__index=function(_,key)trace[#trace+1]=key;if key==field then error(errorObject) end end})
  return v
 end)
end
check('changing-value',function()
 local v=pair();v[1].value=nil;local n=0
 setmetatable(v[1],{__index=function(_,key)trace[#trace+1]=key;if key=='value' then n=n+1;return n==4 and 0.5 or 2 end end})
 return v
end)
check('changing-marker',function()
 local v=pair();v[1].targetGroup=nil;local n=0
 setmetatable(v[1],{__index=function(_,key)trace[#trace+1]=key;if key=='targetGroup' then n=n+1;return n==3 and 'changed' or 'weak_then_vulnerable' end end})
 return v
end)
check('dynamic-pairs',function()
 local v=pair();setmetatable(v,{__pairs=function(t)
  trace[#trace+1]='pairs';local i=0
  return function()i=i+1;trace[#trace+1]='next:'..i;if i<=2 then return i,rawget(t,i) end end
 end});return v
end)
check('throw-pairs',function()
 local v=pair();setmetatable(v[1],{__pairs=function()trace[#trace+1]='pairs-error';error(errorObject) end});return v
end)
check('dynamic-dense-read',function()
 local v=pair();local first=v[1];v[1]=nil
 setmetatable(v,{__pairs=function()local i=0;return function()i=i+1;if i<=2 then return i,i==1 and first or v[2] end end end,
 __index=function(_,key)trace[#trace+1]=key;if key==1 then return first end end});return v
end)

check('unmarked-partial',function()return {{op='energy',value=1},{op='unsupported'}} end)
check('aliased-dynamic-marker',function()
 local v=pair();v[1].targetGroup=nil
 setmetatable(v[1],{__index=function(_,key)trace[#trace+1]='alias:'..key;if key=='targetGroup' then return 'weak_then_vulnerable' end end})
 v[3]={nested=v[1]};return v
end)
check('fractional-before-dense-read',function()
 local v=pair();v[1.5]=false
 setmetatable(v,{__index=function(_,key)trace[#trace+1]=key;if key==3 then return {op='block',value=1} end end})
 return v
end)
