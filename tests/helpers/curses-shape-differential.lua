-- Complete source modules are loaded in separate VMs. Boundary fields are
-- observed directly; the existing basic_curses fixture exercises real owners.
local source=assert(arg[1]);local NIL={}
local ids={'regret','injury','doubt','pain','decay','shame','writhe','clumsy','normality','parasite','curse_of_the_bell'}
local cases={}
local function add(name,spec)spec=spec or {};spec.name=name;cases[#cases+1]=spec end
local fields={'id','type','rarity','cost','effects','upgrade','exhaust','repeatable','costMode','condition','ethereal','innate','endTurnDamage','endTurnStatusAmount','onOtherCardHpLoss','playLimit','onRemoveMaxHpLoss'}
local values={NIL,false,true,0,-2,1,2,3,'curse','unknown',{}, {1}, function()end,0/0}
for _,id in ipairs(ids)do
 add('valid-'..id,{id=id})
 for _,field in ipairs(fields)do
  for i,value in ipairs(values)do add(id..'-'..field..'-'..i,{id=id,field=field,value=value})end
 end
end
for i,value in ipairs({NIL,false,true,0,-2,'curse',function()end})do add('primitive-'..i,{primitive=value})end
for _,id in ipairs({'injury','decay','doubt','shame','pain','normality','parasite','clumsy','writhe'})do
 for n=1,32 do
  add('read-throw-'..id..'-'..n,{id=id,throwAt=n})
  add('read-mutate-'..id..'-'..n,{id=id,mutateAt=n})
 end
 for _,mode in ipairs({'sequence-id','effects-second-read','effects-metatable-empty','effects-metatable-hidden','effects-next-nil','shape-mutates-traits','nil-upgrade-replaced','card-self-alias'})do add(mode..'-'..id,{id=id,mode=mode})end
end
for _,mode in ipairs({'normal','false','nil','multi','throw','load-throw','missing-supported','replacement-after-load','replace-on-read','mutate-card','card-read-throw'})do
 add('necro-'..mode,{id='necronomicurse',necro=mode})
end
for _,bad in ipairs({'type','effects','upgrade','ethereal','innate'})do add('necro-ignores-'..bad,{id='necronomicurse',field=bad,value=true})end
add('short-shape-no-traits',{id='injury',field='type',value='attack',throwField='ethereal'})
add('short-id-no-type',{id='unknown',throwField='type'})
add('short-effects-no-upgrade',{id='injury',field='effects',value={1},throwField='upgrade'})
add('effects-real-entry',{id='injury',field='effects',value={unexpected=true}})

local function execute(spec)
 local trace,backing,labels={},{},{}
 local function scalar(v)
  if v==nil then return 'nil'end
  if type(v)=='number'and v~=v then return 'nan'end
  if type(v)=='table'or type(v)=='function'then return labels[v]or type(v)end
  return type(v)..':'..tostring(v)
 end
 local function record(...)local out={};for i=1,select('#',...)do out[i]=scalar(select(i,...))end;trace[#trace+1]=table.concat(out,'|')end
 local count,idReads,effectsReads=0,0,0
 local data={id=spec.id or 'injury',type='curse',rarity='curse',cost=-2,effects={}}
 if data.id=='clumsy'then data.ethereal=true end
 if data.id=='writhe'then data.innate=true end
 if data.id=='decay'then data.endTurnDamage=2 end
 if data.id=='doubt'or data.id=='shame'then data.endTurnStatusAmount=1 end
 if data.id=='pain'then data.onOtherCardHpLoss=1 end
 if data.id=='normality'then data.playLimit=3 end
 if data.id=='parasite'then data.onRemoveMaxHpLoss=3 end
 if spec.field then data[spec.field]=spec.value;if spec.value==NIL then data[spec.field]=nil end end
 local card={};backing[card]=data;labels[card]='card'
 if spec.mode=='effects-metatable-empty'then data.effects=setmetatable({},{__index=function(_,k)record('effects-index',k);return true end})end
 if spec.mode=='effects-metatable-hidden'then data.effects=setmetatable({hidden=true},{__pairs=function()return function()end end})end
 if spec.mode=='card-self-alias'then data.extra=card end
 local effectsInitial=data.effects
 if type(effectsInitial)=='table'or type(effectsInitial)=='function'then labels[effectsInitial]=labels[effectsInitial]or'effects-initial'end
 setmetatable(card,{
  __index=function(_,key)
   count=count+1;record('read',key,data[key],count)
   if count==spec.throwAt or key==spec.throwField or spec.necro=='card-read-throw'then error('read-fault-'..key,0)end
   if count==spec.mutateAt then data.cost=0;data.playLimit=4;data.exhaust=true end
   if key=='id'then
    idReads=idReads+1
    if spec.mode=='sequence-id'then local order={spec.id,spec.id,'clumsy','writhe','decay','doubt','shame','pain','normality','parasite'};return order[idReads]or spec.id end
   end
   if key=='effects'then
    effectsReads=effectsReads+1
    if spec.mode=='effects-second-read'and effectsReads==2 then return {unexpected=true}end
   end
   if spec.mode=='shape-mutates-traits'and key=='condition'then data.ethereal=true;data.innate=true end
   if spec.mode=='nil-upgrade-replaced'and key=='upgrade'then data.upgrade=false;return nil end
   return data[key]
  end,
  __newindex=function(_,key,value)record('write',key,value);data[key]=value end,
 })
 local input=card;if spec.primitive~=nil then input=spec.primitive;if input==NIL then input=nil end end
 local supportedCount=0
 local function supported(c)
  assert(c==input,'wrong delegated card identity');supportedCount=supportedCount+1;record('supported',c)
  if spec.necro=='throw'then error('necro-supported-fault',0)end
  if spec.necro=='mutate-card'then c.upgrade=false;c.effects={changed=true}end
  if spec.necro=='false'then return false,'second'end
  if spec.necro=='nil'then return nil,'second',nil,'fourth'end
  if spec.necro=='multi'then return card,false,7,nil,'last'end
  return true
 end
 labels[supported]='supported-original'
 local replacement=function(...)record('replacement-supported');return supported(...)end;labels[replacement]='supported-replacement'
 local apiData={supported=supported};local api={};backing[api]=apiData;labels[api]='api'
 setmetatable(api,{__index=function(_,key)
  record('api-read',key,apiData[key]);local value=apiData[key]
  if spec.necro=='replace-on-read'then apiData[key]=replacement end
  return value
 end})
 local customNext=function(t)record('next',t);if spec.mode=='effects-next-nil'then return nil end;return next(t)end
 local env=setmetatable({next=customNext,require=function(name)
  record('require',name);assert(name=='abyss_necronomicurse','unexpected dependency')
  if spec.necro=='load-throw'then error('necro-load-fault',0)end
  return api
 end},{__index=_G})
 local M=assert(loadfile(source,'t',env))()
 if spec.necro=='replacement-after-load'then apiData.supported=replacement end
 if spec.necro=='missing-supported'then apiData.supported=nil end
 local result=table.pack(pcall(M.isImplemented,input))
 if not result[1]and type(result[2])=='string'then result[2]=result[2]:gsub('^[^\n]-:%d+: ',''):gsub(" %(local '[^']+'%)",'')end
 local seen,n={},0
 local function encode(v)
  if type(v)~='table'then return string.format('%q',scalar(v))end
  if seen[v]then return '@'..seen[v]end
  n=n+1;local id=n;seen[v]=id;local content=backing[v]or v;local keys={}
  for k in next,content do keys[#keys+1]=k end
  table.sort(keys,function(a,b)if type(a)==type(b)then return tostring(a)<tostring(b)end;return type(a)<type(b)end)
  local out={'#'..id..'{'};for _,key in ipairs(keys)do out[#out+1]=encode(key)..'='..encode(rawget(content,key))..','end;out[#out+1]='}';return table.concat(out)
 end
 return encode({input=input,card=card,data=data,effectsInitial=effectsInitial,result=result,trace=trace,reads=count,idReads=idReads,effectsReads=effectsReads,supportedCount=supportedCount})
end
local count=0
for i,spec in ipairs(cases)do if not arg[2]or arg[2]==spec.name then count=count+1;print(i..'\t'..spec.name..'\t'..execute(spec))end end
assert(count>0,'no selected cases');print('CURSES_SHAPE_CASES '..count)
