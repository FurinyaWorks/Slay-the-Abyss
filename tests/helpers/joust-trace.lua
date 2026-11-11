local Random=require('abyss_sts_random')
local Run={}
package.loaded.abyss_run=Run
local Joust=require('abyss_joust_event')
local calls={}
local failing=false
local failure={kind='payout failure'}
Run.gainGold=function(run,amount)
 calls[#calls+1]={kind='gold',run=run,amount=amount}
 run.gold=run.gold+amount
 if failing then error(failure)end
 return amount
end
local random=Random.randomBooleanChance
Random.randomBooleanChance=function(rng,chance)
 calls[#calls+1]={kind='rng',rng=rng,chance=chance}
 return random(rng,chance)
end
local function observe(run,flow,choice,uid,label)
 local returned=table.pack(pcall(Joust.choose,run,flow,choice,uid))
 JOUST_GRAPH_WRITE({run=run,flow=flow,event=flow.event,calls=calls,returned=returned,
  options=Joust.options(run,flow.event),failure=failure},label,true)
 return returned
end
for seed=0,15 do
 for _,bet in ipairs({'bet_against','bet_for'})do
  for _,gold in ipairs({0,49,50,100})do
   calls={};local run={gold=gold,miscRng=Random.fromSeed(tostring(seed))};local flow={event={}}
   run.nodeFlow=flow;Joust.prepare(run,flow.event)
   observe(run,flow,'continue',nil,'explain')
   observe(run,flow,bet,nil,'pay')
   observe(run,flow,'continue',nil,'roll')
   local result=observe(run,flow,'continue',nil,'settle')
   assert(result[1]and result[2]and result[3]=='pending','valid payout')
   observe(run,flow,'leave',nil,'leave')
  end
 end
end
for _,stage in ipairs({'halt','explanation','pre_joust','joust','complete','unknown'})do
 for _,choice in ipairs({'continue','bet_for','bet_against','leave','invalid'})do
  for _,uid in ipairs({false,0,'uid'})do
   calls={};local run={gold=100,miscRng=Random.fromSeed('9')};local flow={event={stage=stage}}
   local result=observe(run,flow,choice,uid,'uid rejection')
   assert(result[1]and result[2]==false and result[3]=='invalid_event_choice','UID rejection before stage effects')
  end
  calls={};local run={gold=100,miscRng=Random.fromSeed('9')};local flow={event={stage=stage,betFor=true,ownerWins=false}}
  observe(run,flow,choice,nil,'stage choice matrix')
 end
end
for _,win in ipairs({false,true})do
 calls={};local run={gold=20,miscRng=Random.fromSeed('9')}
 local flow={event={stage='joust',betFor=true,ownerWins=win}}
 failing=true
 local result=observe(run,flow,'continue',nil,'payout failure')
 assert(result[1]~=win,'only winning payout calls Run')
 if win then assert(result[2]==failure and flow.event.stage=='joust'and run.gold==270,'partial payout failure')end
 failing=false
end
-- Replace the command after module load: no extraction may capture a method.
calls={};Run.gainGold=function(run,amount)
 calls[#calls+1]={kind='replacement',run=run,amount=amount};run.gold=run.gold+7;return 7
end
local run={gold=5,miscRng=Random.fromSeed('1')};local flow={event={stage='joust',betFor=false,ownerWins=false}}
observe(run,flow,'continue',nil,'dynamic payout')
assert(flow.event.goldGained==7 and run.gold==12,'dynamic Run command')
Random.randomBooleanChance=function(rng,chance)
 calls[#calls+1]={kind='replacement rng',rng=rng,chance=chance};error(failure)
end
flow.event.stage='pre_joust'
local result=observe(run,flow,'continue',nil,'random failure')
assert(not result[1]and result[2]==failure and flow.event.stage=='pre_joust','random failure before stage write')
