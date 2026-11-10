-- The same inputs execute against independently loaded complete old/new modules.
-- Capture raw graph identity before/after, packed returns (including nil holes),
-- dependency calls, metatable effects, and errors. No golden result generation.
local Map=OWNER_MAP
local R=require('abyss_sts_random')
local Acts=require('abyss_acts')
local E=require('abyss_emerald_elite')
local copy=require('abyss_copy').copy
-- Only immutable seed setup is shared inside this VM; each scenario gets fresh tables.
local initialMapRng=R.snapshot(R.fromSeed('42'))
local trace={}
local function event(...) trace[#trace+1]=table.pack(...) end
for _,entry in ipairs({{R,'restore'},{R,'snapshot'},{R,'randomIntBetween'},{Acts,'mapSeed'},{E,'prepare'}})do
 local owner,key=entry[1],entry[2];local original=owner[key]
 owner[key]=function(...)event(key,...);return original(...)end
end
local function graph(label,value) OWNER_GRAPH_WRITE(value,label,true) end
local function base(act,x,y)
 act,x,y=act or 1,x or 3,y or 0
 local first=1+(act-1)*17
 local node={id='selected',type='elite',hasEmeraldKey=true,lane=x+1,floor=first+y,nextIds={}}
 local map={seed='42',runSeed='42',mapSeed=Acts.mapSeed('42',act),sourceSignature='signature',
  nodes={node},emeraldSelection={version=1,act=act,nodeId='selected',x=x,y=y},
  mapRng=copy(initialMapRng),floor=first+y-1,path={}}
 if act~=1 then map.act,map.firstFloor=act,first end
 if y>0 then
  map.nodes[2]={id='prior',floor=first+y-1,type='combat',nextIds={'selected'}}
  map.currentNodeId='prior';map.path={'prior'}
 end
 return map,'selected',node
end
local function invoke(label,map,id,method,boost,winged)
 trace={}
 graph(label..':before',{map=map,id=id,boost=boost,trace=trace})
 local result
 if method=='commit' then result=table.pack(pcall(Map.commitEmeraldBoost,map,id,boost))
 else result=table.pack(pcall(Map.prepareEmeraldBoost,map,id,winged)) end
 -- Only source locations are layout-dependent; preserve error type/message.
 if not result[1] and type(result[2])=='string' then
  result[2]=result[2]:gsub('src/lua/abyss_map.lua:%d+:','src/lua/abyss_map.lua:<line>:')
 end
 graph(label..':after',{map=map,id=id,boost=boost,result=result,trace=trace})
 return result
end
local function case(label,change)
 local m,id,n=base();local replacement,newId=change(m,n)
 if replacement~=nil then m=replacement end
 if newId~=nil then id=newId end
 invoke(label,m,id);invoke(label..':commit',m,id,'commit',false)
end
for _,value in ipairs({false,0,'map',function()end})do invoke('owner-'..type(value),value,'selected')end
invoke('owner-nil',nil,'selected')
case('owner-meta',function(m)setmetatable(m,{__index=function(_,k)event('owner-read',k);error('owner accessed')end})end)
for i,value in ipairs({false,true,0,{}})do case('boost-'..i,function(m)m.emeraldBoost=value end)end
for _,value in ipairs({false,0,'nodes'})do case('nodes-'..type(value),function(m)m.nodes=value end)end
case('nodes-nil',function(m)m.nodes=nil end)
case('nodes-meta',function(m)setmetatable(m.nodes,{__len=function()event('nodes-length');error('length touched')end})end)
case('nodes-empty',function(m)m.nodes={}end)
case('nodes-string-key',function(m)m.nodes.extra=true end)
case('nodes-zero',function(m)m.nodes[0]={}end)
case('nodes-hole',function(m)m.nodes[3]={}end)
for _,count in ipairs({107,108})do case('nodes-count-'..count,function(m)for i=2,count do m.nodes[i]={id='other'..i,type='combat'}end end)end
for _,value in ipairs({false,0,'selection'})do case('selection-'..type(value),function(m)m.emeraldSelection=value end)end
case('selection-nil',function(m)m.emeraldSelection=nil end)
case('selection-meta',function(m)setmetatable(m.emeraldSelection,{__index=function(_,k)event('selection-read',k);error('selection accessed')end})end)
for _,field in ipairs({'version','act','x','y','nodeId'})do
 case('selection-'..field..'-nil',function(m)m.emeraldSelection[field]=nil end)
 for i,value in ipairs({false,true,'1',-1,0,1,3,4,6,7,14,15,.5,math.huge,0/0})do
  case('selection-'..field..'-'..i,function(m)m.emeraldSelection[field]=value end)
 end
end
case('selection-extra',function(m)m.emeraldSelection.extra=true end)
case('id-false',function()return nil,false end)
invoke('id-nil',base(),nil)
for _,act in ipairs({1,2,3})do for _,x in ipairs({0,6})do for _,y in ipairs({0,14})do
 local m,id=base(act,x,y);invoke('valid-edge-'..act..'-'..x..'-'..y,m,id)
end end end
for _,field in ipairs({'act','runSeed','seed','mapSeed','sourceSignature','firstFloor'})do
 case(field..'-nil',function(m)m[field]=nil end)
 for i,value in ipairs({false,0,'','42','foreign',{},4})do case(field..'-'..i,function(m)m[field]=value end)end
end
case('seed-overflow',function(m)m.runSeed='9223372036854775808';m.seed=m.runSeed end)
case('seed-leading-zero',function(m)m.runSeed='042';m.seed=m.runSeed end)
for _,seed in ipairs({'-9223372036854775808','9223372036854775807','0'})do
 case('seed-valid-'..seed,function(m)m.runSeed=seed;m.seed=seed;m.mapSeed=Acts.mapSeed(seed,1)end)
end
for _,field in ipairs({'id','type','hasEmeraldKey','lane','floor'})do
 case('node-'..field..'-nil',function(_,n)n[field]=nil end)
 for i,value in ipairs({false,true,0,1,'elite','selected','4',{},4.5})do
  case('node-'..field..'-'..i,function(_,n)n[field]=value end)
 end
end
for _,value in ipairs({false,1,'node'})do case('node-scalar-'..type(value),function(m)m.nodes[2]=value end)end
case('duplicate-identical',function(m,n)m.nodes[2]=copy(n)end)
case('duplicate-alias',function(m,n)m.nodes[2]=n end)
case('second-key',function(m)m.nodes[2]={id='other',hasEmeraldKey=true}end)
case('unselected-false-key',function(m)m.nodes[2]={id='other',hasEmeraldKey=false}end)
case('unselected-nil-key',function(m)m.nodes[2]={id='other'}end)
case('selected-key-false',function(_,n)n.hasEmeraldKey=false end)
case('node-metatable',function(_,n)setmetatable(n,{__index=function(_,k)event('node-read',k);return nil end})end)
case('opaque-state-and-aliases',function(m,n)
 m.sentinel={};m.sentinel.self=m.sentinel;m.sentinel.node=n;m.sentinel.selection=m.emeraldSelection
 m.sentinel.rng=m.mapRng
end)
case('node-read-order',function(m,n)
 local backing=copy(n);m.nodes[1]=setmetatable({},{__index=function(_,k)event('node-read',k);return backing[k]end})
end)
case('node-error-order',function(m)m.nodes[2]=setmetatable({},{__index=function(_,k)event('late-read',k);error('late node '..k,0)end});m.nodes[1].hasEmeraldKey=false end)
case('late-node-error',function(m)m.nodes[2]=setmetatable({},{__index=function(_,k)event('late-read',k);error('late node '..k,0)end})end)
case('early-owner-before-nodes',function(m)m.emeraldBoost=false;m.nodes=setmetatable({},{__len=function()error('early nodes length',0)end})end)
case('early-selection-before-seed',function(m)m.emeraldSelection.version=0;m.runSeed='overflow' end)
case('seed-before-node-error',function(m)m.mapSeed='wrong';m.nodes[1]=setmetatable({},{__index=function()error('node evaluated before seed',0)end})end)
for i,value in ipairs({false,0,'rng',{}, {version=1}})do case('bad-rng-'..i,function(m)m.mapRng=value end)end
case('bad-rng-nil',function(m)m.mapRng=nil end)
case('bad-rng-owner-first',function(m)m.mapRng={};m.emeraldSelection.x=-1 end)
case('bad-rng-unreachable-first',function(m)m.mapRng={};m.floor=17 end)
case('unreachable-terminal',function(m)m.floor=17 end)
case('unreachable-missing-current',function(m)m.floor=1 end)
case('unreachable-foreign-edge',function(m)m.floor=1;m.currentNodeId='selected';m.nodes[1].nextIds={'missing'} end)
do
 local m,id=base(1,3,1);m.nodes[2].nextIds={}
 invoke('unreachable-normal',m,id);invoke('reachable-winged',m,id,nil,nil,true)
 invoke('winged-truthy-string',m,id,nil,nil,'true')
end
-- Test public-boundary multiple returns and errors from dependencies separately.
do
 local original=E.prepare
 for _,mode in ipairs({'nil','false','error','multi'})do
  E.prepare=function(selection,rng)
   event('prepare-injected',mode)
   if mode=='nil' then return nil,false,'sentinel-nil','extra' end
   if mode=='false' then return false,nil,'sentinel-false','extra' end
   if mode=='error' then error('sentinel-prepare-error',0) end
   local effect,nextRng=original(selection,rng);return effect,nextRng,'ignored','extra'
  end
  local m,id=base();invoke('dependency-'..mode,m,id)
 end
 E.prepare=original
end
-- Successful prepare/choose/commit ownership, retries, path failures and aliases.
do
 local m,id=base();local boost,nextRng=Map.prepareEmeraldBoost(m,id)
 graph('ownership:prepared',{map=m,boost=boost,nextRng=nextRng})
 invoke('commit-not-chosen',m,id,'commit',boost)
 assert(Map.choose(m,id))
 for _,field in ipairs({'currentNodeId','floor','path'})do
  local bad=copy(m);bad[field]=false;invoke('commit-bad-'..field,bad,id,'commit',boost)
 end
 for i,path in ipairs({{}, {'other'},setmetatable({id},{}),{id,extra=true}})do
  local bad=copy(m);bad.path=path;invoke('commit-path-shape-'..i,bad,id,'commit',boost)
 end
 for _,field in ipairs({'runSeed','mapSeed','mapSignature','nodeId','beforeRng','afterRng','effect'})do
  local bad=copy(boost);bad[field]=false;invoke('commit-boost-'..field,m,id,'commit',bad)
 end
 local bad=copy(boost);bad.extra=true;invoke('commit-boost-extra',m,id,'commit',bad)
 bad=copy(boost);setmetatable(bad,{});invoke('commit-boost-meta',m,id,'commit',bad)
 invoke('commit-valid',m,id,'commit',boost)
 graph('ownership:committed',{map=m,boost=boost,nextRng=nextRng})
 boost.effect.roll=99;nextRng.counter=999
 graph('ownership:caller-mutated',{map=m,boost=boost,nextRng=nextRng})
 invoke('commit-retry',m,id,'commit',boost)
 invoke('prepare-after-commit',m,id)
end
if OWNER_INTEGRATION then
 local data={rules={map={floors=17,generatedRows=15,bossFloor=16,bossTreasureFloor=17,restFloor=15,treasureFloor=9,
 nodeTypes={'combat','elite','camp','shop','event','treasure','boss'}}},enemies={encounters={}}}
 local context={endingUnlocked=true,emeraldOwned=false}
 local function route(map,target)
  local index={};for _,node in ipairs(map.nodes)do index[node.id]=node end
  local function find(id)
   if id==target then return {id}end
   for _,nextId in ipairs(index[id].nextIds)do local path=find(nextId);if path then table.insert(path,1,id);return path end end
  end
  for _,node in ipairs(Map.available(map))do local path=find(node.id);if path then return path end end
  error('missing selected route')
 end
 for act=1,3 do
  local m=Map.generate(data,'42',act,context);local id=m.emeraldSelection.nodeId
  local path=route(m,id)
  for i=1,#path-1 do assert(Map.choose(m,path[i]))end
  local boost=assert(Map.prepareEmeraldBoost(m,id));assert(Map.choose(m,id))
  graph('restore-uncommitted-'..act,table.pack(Map.restore(data,Map.snapshot(m),context)))
  assert(Map.commitEmeraldBoost(m,id,boost))
  local snapshot=Map.snapshot(m);trace={}
  local restored=table.pack(Map.restore(data,snapshot,context))
  graph('restore-success-'..act,{map=m,snapshot=snapshot,result=restored,trace=trace,data=data,context=context})
  for _,field in ipairs({'emeraldBoost','emeraldSelection','mapRng'})do
   local bad=copy(snapshot);bad[field]=false;trace={}
   graph('restore-tamper-'..act..'-'..field,{snapshot=bad,result=table.pack(Map.restore(data,bad,context)),trace=trace})
  end
  graph('restore-no-context-'..act,table.pack(Map.restore(data,snapshot)))
 end
end
