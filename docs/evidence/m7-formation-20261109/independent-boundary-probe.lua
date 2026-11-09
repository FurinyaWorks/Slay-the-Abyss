-- Independent review probe. Run from repository root with Fengari, not Full.
package.path='src/lua/?.lua;'..package.path
local before=dofile('tests/fixtures/encounter-formation-before.lua')
local current=dofile(arg[1] or 'src/lua/abyss_encounter_formation.lua')
local sources={'The Mushroom Lair','2 Orb Walkers','3 Darklings','Awakened One','Reptomancer',
 'Jaw Worm Horde','3 Shapes','4 Shapes','Sphere and 2 Shapes','Gremlin Leader','Gremlin Gang',
 'Small Slimes','Large Slime','Lots of Slimes','2 Louse','3 Louse','Exordium Thugs','Exordium Wildlife'}
local runs,failures=0,0
local function equal(a,b,message)assert(a==b,(message or 'mismatch')..'\n'..tostring(a)..'\n'..tostring(b))end
local function run(module,source,mode,stop)
 local trace,created,aliases={}, {}, {}
 local events,bi,ii,vi,mi,ci=0,0,0,0,0,0
 local token={}
 local function event(s)
  events=events+1;trace[#trace+1]=s
  if events==stop then error(token,0) end
 end
 local replaced=false
 local boundary,misc={},{ }
 setmetatable(misc,{__index=function(_,key)
  event('misc-read:'..key)
  if key=='boolean'then
   bi=bi+1;local generation=bi
   return function()event('bool-call:'..generation);return (generation+mode)%3==0 end
  elseif key=='integer'then
   ii=ii+1;local generation=ii
   return function(lo,hi)
    event('index-call:'..generation..':'..lo..':'..hi)
    equal(lo,0);return mode==0 and 0 or mode==1 and hi or (generation+mode)%(hi+1)
   end
  end
 end})
 setmetatable(boundary,{__index=function(_,key)
  event('boundary-read:'..key)
  if key=='misc'then
   mi=mi+1
   -- First table is validation-only; actual helper calls must use the second.
   if mi==1 then return setmetatable({},{__index=function()error('validation misc unexpectedly used',0)end})end
   assert(not replaced,'boundary.misc was read again after capture');return misc
  elseif key=='construct'then
   ci=ci+1;local generation=ci
   return function(id,x,y)
    event('new-call:'..generation..':'..id..':'..tostring(x)..':'..tostring(y))
    replaced=true
    local actor
    if mode==2 then actor=aliases.shared or {};aliases.shared=actor else actor={}end
    actor.id,actor.x,actor.y,actor.serial,actor.constructor=id,x,y,#created+1,generation
    created[#created+1]=actor;return actor
   end
  elseif key=='visualFloat'then
   vi=vi+1;local generation=vi
   return function(lo,hi)
    event('offset-call:'..generation..':'..lo..':'..hi);equal(lo,-20);equal(hi,20)
    return ({-20,20,0.1,-0.1})[(generation+mode)%4+1]
   end
  end
 end})
 local ok,result=pcall(module.assemble,source,boundary)
 local selected={}
 if ok then
  for _,actor in ipairs(result)do
   local same={};for i,other in ipairs(created)do if actor==other then same[#same+1]=i end end
   assert(#same>0,'selected actor cloned')
   selected[#selected+1]=table.concat(same,',')..':'..actor.id..':'..actor.serial..':'..actor.constructor..':'..tostring(actor.x)..':'..tostring(actor.y)
  end
 elseif result~=token then error('unexpected boundary failure: '..tostring(result),0)end
 runs=runs+1
 return tostring(ok)..'\n'..table.concat(trace,'|')..'\n'..table.concat(selected,'|'),events,#created
end
for _,source in ipairs(sources)do for mode=0,2 do
 local old,count,constructed=run(before,source,mode)
 local new,newCount,newConstructed=run(current,source,mode)
 equal(old,new,source..' dynamic capability trace');equal(count,newCount);equal(constructed,newConstructed)
 if source=='Exordium Thugs'then equal(constructed,6)end
 if source=='Exordium Wildlife'then equal(constructed,5)end
 for stop=1,count do
  local a,ae=run(before,source,mode,stop);local b,be=run(current,source,mode,stop)
  equal(a,b,source..' stop='..stop);equal(ae,stop);equal(be,stop);failures=failures+1
 end
end end
print('PASS independent dynamic-capability differential: '..runs..' executions; '..failures..' boundary fail-prefix pairs; 18 formations x 3 modes')
-- The public supports callback remains mutable and is called before boundary inspection.
for _,module in ipairs({before,current})do
 local original=module.supports;local sentinel={};local seen=0
 module.supports=function(source)seen=seen+1;assert(source==sentinel);return true end
 local made={};local result=module.assemble(sentinel,{misc={boolean=function()return false end,integer=function()return 0 end},
  visualFloat=function()return 0 end,construct=function(id,x,y)local a={id=id,x=x,y=y};made[#made+1]=a;return a end})
 equal(seen,1);equal(#made,5);equal(result[1],made[1]);equal(result[2],made[3]);equal(result[1].id,'fungi_beast');equal(result[2].id,'green_louse')
 module.supports=function()error(sentinel,0)end
 local ok,err=pcall(module.assemble,'2 Louse',setmetatable({},{__index=function()error('boundary touched before support',0)end}))
 equal(ok,false);equal(err,sentinel);module.supports=original
end
print('PASS independent admission/fallback: live supports, table source admitted into historical Wildlife fallback, selected aliases, failure before boundary access')
-- Reentrant constructors must not share a result or routing state across calls.
for _,module in ipairs({before,current})do
 local nested,entered=nil,false
 local result=module.assemble('The Mushroom Lair',{misc={},construct=function(id,x,y)
  if not entered then entered=true;nested=module.assemble('2 Orb Walkers',{misc={},construct=function(i,a,b)return {id=i,x=a,y=b}end})end
  return {id=id,x=x,y=y}
 end})
 equal(#result,3);equal(#nested,2);equal(result[1].id,'fungi_beast');equal(nested[1].id,'orb_walker');assert(result~=nested)
end
print('PASS independent reentrancy: nested assemble retains separate routing/result ownership')
