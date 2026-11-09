local F=require('abyss_encounter_formation')
local R=require('abyss_sts_random')
local all={'The Mushroom Lair','2 Orb Walkers','3 Darklings','Awakened One','Reptomancer','Jaw Worm Horde','3 Shapes','4 Shapes','Sphere and 2 Shapes','Gremlin Leader','Small Slimes','Gremlin Gang','2 Louse','3 Louse','Large Slime','Lots of Slimes','Exordium Thugs','Exordium Wildlife'}
local cases=0
local function boundary(mode,failAt,errorValue)
 local state={trace={},created={},calls=0,reads={},mode=mode}
 local b={state=state};state.self=state
 local function invoke(kind,...)
  state.calls=state.calls+1;state.trace[#state.trace+1]={kind,...}
  if state.calls==failAt then error(errorValue or 'injected boundary failure',0)end
 end
 local methods={}
 methods.construct=function(id,x,y)
  invoke('construct',id,x,y)
  local actor={kind=id,x=x,y=y,serial=#state.created+1,owner=state};state.created[#state.created+1]=actor
  if mode=='alias'then return state end
  if mode=='invalidActor'then return false end
  return actor
 end
 methods.visualFloat=function(lo,hi)
  invoke('visualFloat',lo,hi)
  if mode=='invalidFloat'then return 21 end
  return mode=='fractional'and .000021 or mode=='max'and hi or mode=='min'and lo or 0
 end
 local misc={}
 misc.boolean=function()
  invoke('boolean')
  if mode=='invalidBoolean'then return 1 end
  return state.calls%2==0
 end
 misc.integer=function(lo,hi)
  invoke('integer',lo,hi)
  if mode=='invalidInteger'then return hi+1 end
  return mode=='max'and hi or mode=='mix'and (state.calls%(hi+1))or lo
 end
 local miscProxy=setmetatable({},{__index=function(_,key)
  state.reads[#state.reads+1]='misc.'..key;return misc[key]
 end})
 methods.misc=miscProxy
 setmetatable(b,{__index=function(_,key)
  state.reads[#state.reads+1]='boundary.'..key;return methods[key]
 end})
 return b,state,methods,misc
end
for _,source in ipairs(all)do
 assert(F.supports(source))
 for _,mode in ipairs({'min','max','mix','fractional','alias','invalidActor','invalidFloat','invalidBoolean','invalidInteger'})do
  local b,s=boundary(mode);local result=table.pack(pcall(F.assemble,source,b));cases=cases+1
  FORMATION_GRAPH_WRITE({boundary=b,state=s,returned=result[1]and result or {false}},source..':'..mode,true)
 end
 local b=select(1,boundary('mix'));assert(F.assemble(source,b));local count=b.state.calls
 for failAt=1,count do for _,tableError in ipairs({false,true})do
  local marker=tableError and {failure=failAt}or 'injected boundary failure';local input,s=boundary('mix',failAt,marker)
  local result=table.pack(pcall(F.assemble,source,input));assert(not result[1]);assert(result[2]==marker)
  FORMATION_GRAPH_WRITE({boundary=input,state=s,returned=result,marker=marker},source..':failure:'..failAt..':'..tostring(tableError),true);cases=cases+1
 end end
end
-- Boundary methods are read each time, not snapshotted into a capability table.
do
 local b,s,methods,misc=boundary('mix');local original=methods.construct
 methods.construct=function(...)
  local actor=original(...)
  methods.construct=function(id,x,y)s.trace[#s.trace+1]={'replacement',id,x,y};return actor end
  misc.boolean=function()s.trace[#s.trace+1]={'replacementBoolean'};return false end
  return actor
 end
 local a=F.assemble('3 Louse',b);assert(a[1]==a[2]and a[2]==a[3],'dynamic constructor identity')
 FORMATION_GRAPH_WRITE({boundary=b,state=s,result=a},'dynamic replacement',true)
end
-- Public admission remains dynamic and permissive overrides keep original fallback.
do
 local original=F.supports;F.supports=function(source)return source=='custom' end
 local b,s=boundary('mix');local a=F.assemble('custom',b);assert(#a==2)
 FORMATION_GRAPH_WRITE({boundary=b,state=s,result=a},'dynamic supports fallback',true);F.supports=original
end
for _,b in ipairs({false,7,{}, {misc={}}, {misc=1,construct=function()end}})do assert(not pcall(F.assemble,'2 Louse',b))end
-- Each semantic assertion has a separate name; mutants cannot pass through timeout.
local function simple(source,ints,bools,visual)
 local trace,created={},{};local ii,bb=0,0
 local b={misc={integer=function(lo,hi)ii=ii+1;trace[#trace+1]={'i',lo,hi};return ints and ints[ii]or 0 end,
 boolean=function()bb=bb+1;trace[#trace+1]={'b'};return bools and bools[bb]or false end},
 visualFloat=function(lo,hi)trace[#trace+1]={'v',lo,hi};return visual or 0 end,
 construct=function(id,x,y)local a={kind=id,x=x,y=y};created[#created+1]=a;trace[#trace+1]={'c',id};return a end}
 return F.assemble(source,b),trace,created
end
local a=simple('Jaw Worm Horde');assert(a[1].x==-490,'fixed formation positions')
a=simple('4 Shapes',{0,0,0,0});assert(a[1].kind=='repulsor'and a[2].kind=='repulsor'and a[3].kind=='exploder'and a[4].kind=='exploder','shapes draw without replacement')
a=simple('Gremlin Leader',{7,7});assert(a[1].kind=='wizard_gremlin'and a[2].kind=='wizard_gremlin','leader draws with replacement')
a=simple('Gremlin Gang',{7,0,0,0});assert(a[1].kind=='wizard_gremlin'and a[2].kind=='mad_gremlin','gang pool endpoints')
a=simple('3 Louse',nil,{false,true,false});assert(a[1].kind=='green_louse'and a[2].kind=='red_louse'and a[3].kind=='green_louse','independent louse colors')
a=simple('Small Slimes',nil,{true});assert(a[1].kind=='spike_slime_s'and a[2].kind=='acid_slime_m','complementary slime sizes')
a=simple('Large Slime',nil,{true});assert(a[1].kind=='acid_slime_l','large slime color')
local trace,created;a,trace,created=simple('Exordium Thugs',{2,2},{false,false});assert(#created==6 and a[1]==created[3]and a[2]==created[6],'eager candidates retain selected aliases')
a=simple('Exordium Wildlife',{0,0},{false},.000021);assert(a[1].x==R.float32(-150+R.float32(.000021)),'visual offset float32')
a=simple('Lots of Slimes',{0,0,0,0,0});assert(#a==5 and a[4].kind=='acid_slime_s','full formation returned')
local b=select(1,boundary('mix'));assert(not pcall(F.assemble,'unsupported',b),'dynamic admission rejects unknown')
print('FORMATION_EDGES_PASS '..cases)
