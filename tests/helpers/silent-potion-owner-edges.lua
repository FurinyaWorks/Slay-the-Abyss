local F=require('abyss_silent_final_cards')
local P=require('abyss_silent_potions')
local originalRequire=require
local trace,steps,failAt={},0,nil
local sentinel={failure='Shiv action boundary'}
local function step(name,...)
 steps=steps+1;trace[#trace+1]={name=name,args=table.pack(...)}
 if steps==failAt then error(sentinel,0)end
end
local function proxy(name,values)
 return setmetatable({}, {__index=function(_,key)step('read '..name,key);return values[key]end})
end
local function run(spec,at)
 trace={};steps=0;failAt=at
 local s={nextUid=7,hand={},discard={},events={},player={statuses={}},rng={seed=19,counter=3}}
 s.self=s;s.alias=s.events
 local C,A,combatValues,actionValues
 local loadedC,loadedA
 local createdCount=0
 combatValues={
  canUpgrade=function(state,c)step('canUpgrade',c);assert(state==s,'owner identity');return not spec.reject end,
  upgrade=function(state,c)step('upgrade',c);assert(state==s,'owner identity');c.upgraded=true end,
 }
 actionValues={
  fresh=function(combat,state,id)
   step('fresh',id);assert(combat==C and state==s and id=='shiv','bound runtime identity')
   local c={cardId=id,uid=s.nextUid};s.nextUid=s.nextUid+1;s.lastCard=c
   if spec.dynamic then
    combatValues.canUpgrade=function(state1,c1)step('changed canUpgrade',c1);assert(state1==s and c1==c,'fresh method replacement');return true end
   end
   if spec.replaceModules then loadedC={};loadedA={} end
   return c
  end,
  created=function(combat,state,c)
   step('created',c);assert(combat==C and state==s,'bound runtime identity');createdCount=createdCount+1
   c.created=(c.created or 0)+1;s.events[#s.events+1]={kind='created',card=c}
   if spec.dynamic then actionValues.created=function(combat1,state1,c1)
    step('changed created',c1);assert(combat1==C and state1==s,'bound runtime identity')
    createdCount=createdCount+1;c1.created=(c1.created or 0)+1;s.events[#s.events+1]={kind='changed created',card=c1}
   end end
  end,
  toHand=function(state,c)
   step('toHand',c);assert(state==s,'owner identity')
   local destination=#s.hand<1 and s.hand or s.discard;destination[#destination+1]=c
  end,
 }
 C=proxy('Combat',combatValues);A=proxy('Actions',actionValues);loadedC=C;loadedA=A
 require=function(name)
  step('require',name)
  if name=='abyss_silent_potions'then return P end
  if name=='abyss_combat'then return loadedC end
  if name=='abyss_card_actions'then return loadedA end
  error('unexpected dependency '..name)
 end
 local effect=setmetatable({kind='potionShivs'}, {__index=function(_,key)
  step('effect read',key);if key=='value'then return spec.n end
 end})
 -- Passed combat deliberately differs: the historical operation binds require().
 local result=table.pack(pcall(F.apply,{wrongOwner=true},s,{effect=effect}))
 failAt=nil;require=originalRequire
 if at then assert(not result[1] and result[2]==sentinel,'raw thrown object identity')end
 local completed=steps
 if not at then
  local imports={};for _,row in ipairs(trace)do if row.name=='require'then imports[#imports+1]=row.args[1]end end
  assert(#imports==3 and imports[1]=='abyss_silent_potions'and imports[2]=='abyss_combat'and imports[3]=='abyss_card_actions','lazy dependency order')
  if not result[1]and not spec.reject and tonumber(spec.n)then error(result[2],0)end
  if result[1]then
   assert(result.n==1,'zero return arity')
   local count=math.max(0,math.floor(tonumber(spec.n)))
   assert(s.nextUid==7+count,'fresh card identity')
   assert(createdCount==count*2,'double dynamic created hooks')
   assert(#s.hand==math.min(1,count)and #s.discard==math.max(0,count-1),'overflow disposition')
   if count>0 then assert(s.lastCard.upgraded==true,'upgrade before creation')end
   if spec.dynamic and count>0 then
    local dynamic=false;for _,row in ipairs(trace)do if row.name=='changed canUpgrade'then dynamic=true end end
    assert(dynamic,'fresh method replacement')
    local replacements=0;for _,row in ipairs(trace)do if row.name=='changed created'then replacements=replacements+1 end end
    assert(replacements==count*2-1,'created method replacement')
   end
  elseif spec.reject then
   assert(s.nextUid==8 and s.lastCard.upgraded==nil and #s.hand==0,'failed upgrade partial writes')
  end
 end
 local observed=result
 if not result[1]and type(result[2])=='string'then
  observed=table.pack(table.unpack(result,1,result.n));observed[2]=OWNER_ERROR(result[2])
 end
 OWNER_GRAPH_WRITE({state=s,result=observed,trace=trace,sentinel=sentinel},spec.name..':'..tostring(at),true)
 return completed
end
for _,spec in ipairs({
 {name='zero',n=0},{name='negative',n=-1},{name='one',n=1},{name='two',n=2},{name='six',n=6},
 {name='fractional',n=1.5},{name='numeric-string',n='2'},
 {name='nil'},{name='false',n=false},{name='table',n={}},{name='nonnumeric',n='invalid'},
 {name='rejected',n=2,reject=true},{name='dynamic',n=2,dynamic=true},
 {name='bound-modules',n=2,replaceModules=true},
})do
 local count=run(spec)
 for at=1,count do run(spec,at)end
end
print('PASS complete Shiv action traces, all failure prefixes, bound modules and dynamic methods')
