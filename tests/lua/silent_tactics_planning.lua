package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local T=require('abyss_silent_tactics_cards')
local Queries=require('abyss_relic_queries')
local originalBonus=Queries.shop.xBonus
local cases=0
local function state()
 local card={uid=2,cardId='defend'}
 local s={energy=3,hand={{uid=1,cardId='strike'},card,card,{uid=3,cardId='glass_knife'}},
  catalog={cards={strike={type='attack'},defend={type='skill'},glass_knife={type='attack'}}},
  cardsPlayedThisTurn={{type='attack'},{type='skill'},{type='attack'},{type='attack'}},
  enemies={{id='a',hp=20,statuses={}},{id='dead',hp=0,statuses={}},{id='b',hp=10,statuses={artifact=1}}},
  relics={},events={},cardRandomRng={seed=13,calls=0}}
 s.alias=s.hand;s.cycle=s
 return s
end
local operations={'piercingWail','allOutDiscard','concentrateDiscard','cripplingPoison','escapePlan','expertise',
 'finisherDamage','flechettesDamage','skewer','glassKnife','malaise','unload','stormOfSteel','unknown'}
local function input(op)
 return {state=state(),effect={op=op,value=op=='concentrateDiscard'and 3 or 1,normalAmount=7,blockAmount=4,
  targets={{targetId='a',restore=true},{targetId='b',restore=false}},poisonBonus={tag='alias'},upgraded=true},
  context={instance={uid=3,cardId='glass_knife'}}}
end
local function run(name,make,mode,fault)
 cases=cases+1
 local original=make();local trace,counts={},{};local errorObject={tag='read failure'}
 local cache={}
 local function tick(label)
  trace[#trace+1]=label;counts[label]=(counts[label]or 0)+1
  if #trace==fault then error(errorObject)end
  return counts[label]
 end
 local function proxy(value,path)
  if type(value)~='table'then return value end
  if cache[value]then return cache[value]end
  local out={};cache[value]=out
  setmetatable(out,{__index=function(_,key)
   local n=tick(path..'.'..tostring(key));local result=value[key]
   if mode=='dynamic' and key=='value' and type(result)=='number'then result=result+n-1 end
   return proxy(result,path..'.'..tostring(key))
  end,__len=function()tick('#'..path);return #value end,
  __newindex=function(_,key,v)tick('write '..path..'.'..tostring(key));value[key]=v end})
  return out
 end
 local s,e,c=original.state,original.effect,original.context
 if mode then s,e,c=proxy(s,'state'),proxy(e,'effect'),proxy(c,'context')end
 Queries.shop.xBonus=function(actual)
  tick('xBonus');assert(actual==s,'[TACTICS_PLAN] bonus owner')
  if original.bonusThrow then error(errorObject)end
  if original.bonusMutation then actual.energy=1;actual.events[1]={kind='bonus'}end
  return original.bonus or 0
 end
 if original.callback then
  original.context.cardDefinition=function(actual,card)
   tick('definition');assert(actual==s,'[TACTICS_PLAN] definition owner')
   if original.callbackThrow then error(errorObject)end
   if original.callbackMutation then actual.events[#actual.events+1]={uid=card.uid};card.touched=true end
   return actual.catalog.cards[card.cardId]
  end
 end
 if TACTICS_GRAPH_WRITE then TACTICS_GRAPH_WRITE({inputs=original,args={s,e,c}},name..':before')end
 local ok,result=pcall(T.planEffect,s,e,c)
 Queries.shop.xBonus=originalBonus
 local identity=result==errorObject
 -- Only the source line prefix moves; retain the entire original error body.
 if not ok and type(result)=='string'then result=result:gsub('^.-:%d+: ','')end
 if fault then assert(not ok and identity,'[TACTICS_PLAN] injected error identity '..name)end
 if TACTICS_GRAPH_WRITE then TACTICS_GRAPH_WRITE({ok=ok,result=result,errorIdentity=identity,inputs=original,args={s,e,c},trace=trace},name..':after')end
 return #trace
end
for _,op in ipairs(operations)do
 local make=function()return input(op)end
 run(op,make)
 local reads=run(op..' observed',make,'observed')
 run(op..' dynamic',make,'dynamic')
 for fault=1,reads do run(op..' fault '..fault,make,'observed',fault)end
 for _,value in ipairs({false,'1',-1,0,1.5,2,3,2147483647,2147483648})do
  run(op..' value '..tostring(value),function()local x=input(op);x.effect.value=value;return x end)
 end
 run(op..' missing fields',function()local x=input(op);x.effect={op=op};return x end)
 run(op..' empty state',function()local x=input(op);x.state={};return x end)
 run(op..' false context',function()local x=input(op);x.context=false;return x end)
end
for _,op in ipairs({'skewer','malaise'})do
 for _,energy in ipairs({0,3,-1,1.5,false,2147483647})do
  for _,capture in ipairs({{}, {energyOnUse=-1},{energyOnUse=0},{energyOnUse=2},{energyOnUse=false},
   {freeToPlayOnce=true},{freeToPlayOnce=0},{chemicalX=false},{chemicalX=0},{chemicalX=1}})do
   run(op..' energy '..cases,function()local x=input(op);x.state.energy=energy;x.context=capture;x.bonus=2;return x end)
  end
 end
 for _,kind in ipairs({'bonusThrow','bonusMutation'})do
  run(op..' '..kind,function()local x=input(op);x[kind]=true;return x end,'observed')
 end
end
for _,op in ipairs({'flechettesDamage','unload'})do
 for _,kind in ipairs({'callback','callbackThrow','callbackMutation'})do
  run(op..' '..kind,function()local x=input(op);x.callback=true;x[kind]=true;return x end,'observed')
 end
 for _,bad in ipairs({false,{}, {uid=0,cardId='defend'},{uid='2',cardId='defend'},{uid=2,cardId='missing'}})do
  run(op..' bad hand '..cases,function()local x=input(op);x.state.hand[3]=bad;return x end)
 end
end
for _,targets in ipairs({false,{},{{targetId='a',restore=true},{targetId=4,restore=true}},{{targetId='a',restore=1}}})do
 run('wail targets '..cases,function()local x=input('piercingWail');x.effect.targets=targets;return x end)
end
for _,instance in ipairs({false,{}, {uid=0,cardId='glass_knife'},{uid=1,cardId='strike'}})do
 run('knife instance '..cases,function()local x=input('glassKnife');x.context.instance=instance;return x end)
end
for _,op in ipairs({'finisherDamage','flechettesDamage','skewer','glassKnife'})do
 for _,n in ipairs({false,-1,0,1.5,2147483648})do
  run(op..' normal '..cases,function()local x=input(op);x.effect.normalAmount=n;return x end)
 end
end
for _,op in ipairs(operations)do
 run(op..' empty piles',function()local x=input(op);x.state.hand={};x.state.cardsPlayedThisTurn={};x.state.enemies={};x.state.energy=0;return x end)
end
run('no effect',function()return {state=state()}end)
run('unknown nil state',function()return {effect={op='unknown'}}end)
run('storm false',function()local x=input('stormOfSteel');x.effect.upgraded=false;return x end)
run('storm invalid',function()local x=input('stormOfSteel');x.effect.upgraded=0;return x end)
run('missing history',function()local x=input('finisherDamage');x.state.cardsPlayedThisTurn=nil;return x end)
print('SILENT_TACTICS_PLANNING_PASS '..cases)
