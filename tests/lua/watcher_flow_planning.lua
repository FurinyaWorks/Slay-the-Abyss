package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local Flow=require('abyss_watcher_flow_cards')
local Queries=require('abyss_relic_queries')
local Actions=require('abyss_build_actions')
local originalBonus,originalAttack=Queries.shop.xBonus,Actions.isAttacking
local cases=0
local function encode(value,seen)
 if type(value)~='table'then return type(value)..':'..tostring(value)end
 seen=seen or {count=0};if seen[value]then return '@'..seen[value]end
 seen.count=seen.count+1;seen[value]=seen.count
 local out={'#'..seen[value]..'{'},keys
 keys={};for k in pairs(value)do keys[#keys+1]=k end
 table.sort(keys,function(a,b)if type(a)~=type(b)then return type(a)<type(b)end;return a<b end)
 for _,key in ipairs(keys)do out[#out+1]=encode(key,seen)..'='..encode(value[key],seen)..';'end
 out[#out+1]='}';return table.concat(out)
end
local function state()
 local a={id='enemy-1',hp=40,statuses={mark=3},intents={{effects={{op='damage',value=3}}}},intentIndex=1}
 local b={id='enemy-2',hp=0,statuses={mark=5},intents={{effects={{op='block',value=3}}}},intentIndex=1}
 return {energy=3,player={id='player',hp=70,stance='Neutral',statuses={}},enemies={a,b},discard={{uid=7,cardId='weave'},{uid=8,cardId='flurry_of_blows'}},hand={},rules={player={maxHand=2}},events={},rng={seed=5,calls=0}}
end
local function ok(success,result)assert(success,'[FLOW_PLAN] unexpected rejection '..tostring(result))end
local function no(success)assert(not success,'[FLOW_PLAN] unexpected acceptance')end
local function run(name,s,e,c,options,expected)
 options=options or {};cases=cases+1
 local trace={};local graph={state=s,effect=e,context=c};local before=encode(graph)
 local thrown={reason='original callback error'}
 local cache={}
 local function proxy(value,path)
  if type(value)~='table'then return value end
  if cache[value]then return cache[value]end
  local wrapped={};cache[value]=wrapped
  setmetatable(wrapped,{__index=function(_,key)trace[#trace+1]=path..'.'..tostring(key);return proxy(value[key],path..'.'..tostring(key))end,
   __len=function()trace[#trace+1]=path..'.length';return #value end,
   __newindex=function()error('[FLOW_PLAN] unexpected proxy write')end})
  return wrapped
 end
 local ps,pe,pc=s,e,c
 if options.observe then ps,pe,pc=proxy(s,'state'),proxy(e,'effect'),proxy(c,'context')end
 Queries.shop.xBonus=function(actual)
  trace[#trace+1]='bonus';assert(actual==ps,'[FLOW_PLAN] wrong bonus owner')
  if options.mutate then options.mutate(s,e,c)end
  if options.throw=='bonus'then error(thrown)end
  return options.bonus or 0
 end
 Actions.isAttacking=function(target)
  trace[#trace+1]='isAttacking';assert(target==(pc and pc.target),'[FLOW_PLAN] wrong attack target')
  if options.mutate then options.mutate(s,e,c)end
  if options.throw=='attack'then error(thrown)end
  if options.attack~=nil then return options.attack end
  return originalAttack(target)
 end
 if FLOW_GRAPH_WRITE then FLOW_GRAPH_WRITE({inputs=graph,call={state=ps,effect=pe,context=pc}},name..':before')end
 local success,result=pcall(Flow.planEffect,ps,pe,pc)
 Queries.shop.xBonus,Actions.isAttacking=originalBonus,originalAttack
 if not options.mutate then assert(encode(graph)==before,'[FLOW_PLAN] mutated input '..name)end
 if expected then expected(success,result,trace,thrown)end
 local sameError=result==thrown
 if not success and type(result)=='string'then result=result:gsub('^.-:%d+: ','')end
 if FLOW_GRAPH_WRITE then FLOW_GRAPH_WRITE({inputs=graph,call={state=ps,effect=pe,context=pc},result=result,trace=trace,errorIdentity=sameError,success=success},name..':after')end
 if ABYSS_FLOW_TRACE then print(name..'|'..tostring(success)..'|'..encode({inputs=graph,result=result,trace=trace,errorIdentity=sameError}))end
end
local function basic(op)
 local s=state();return s,{op=op,value=1,normalAmount=7,times=2,status='mark',uid=7},{target=s.enemies[1]}
end
for _,op in ipairs({'fearNoEvil','flowDamage','wallop','indignation','collect','triggerMarks','gainWatcherFlowPower','applyWatcherFlowPower','recallFlowCard'})do
 local s,e,c=basic(op);run('valid '..op,s,e,c,nil,ok)
 s,e,c=basic(op);run('reads '..op,s,e,c,{observe=true},ok)
 for _,entry in ipairs({{}, {value=-1},{value=0},{value=0.5},{value=false},{value='1'},{value=2147483647},{value=2147483648},{value=math.huge},{value=0/0}})do
  s,e,c=basic(op);e.value=entry.value;run(op..' value '..cases,s,e,c)
 end
 s,e,c=basic(op);run(op..' nil context',s,e,nil)
 s,e,c=basic(op);run(op..' false context',s,e,false)
end
for _,stance in ipairs({'Neutral','Calm','Wrath','Divinity',false})do
 local s,e,c=basic('indignation');s.player.stance=stance;run('stance '..tostring(stance),s,e,c,nil,function(success,p)
  ok(success,p);assert(#p.top==0,'[FLOW_PLAN] indignation queue')
  if stance=='Wrath'then assert(#p.bottom==2 and p.bottom[1].targetId=='enemy-1' and p.bottom[2].targetId=='enemy-2','[FLOW_PLAN] indignation ordered complete roster')
  else assert(p.bottom[1].stance=='Wrath','[FLOW_PLAN] indignation stance')end
 end)
end
for _,attack in ipairs({true,false})do
 local s,e,c=basic('fearNoEvil');run('fear attack '..tostring(attack),s,e,c,{attack=attack},function(success,p)
  ok(success,p);assert(p.top[1]and p.top[1].op=='damage'and p.top[1].normalAmount==7 and #p.bottom==0,'[FLOW_PLAN] damage before stance')
  assert(#p.top==(attack and 2 or 1),'[FLOW_PLAN] fear intent branch')
  if attack then assert(p.top[2].stance=='Calm','[FLOW_PLAN] fear Calm')end
 end)
end
for _,entry in ipairs({{}, {value=-1},{value=0},{value=1},{value=2},{value=3},{value=false},{value='2'},{value=0.5}})do
 local s,e,c=basic('flowDamage');e.times=entry.value;run('repeat '..cases,s,e,c)
end
for _,energy in ipairs({0,1,3})do for _,capture in ipairs({{}, {value=-1},{value=0},{value=2},{value=2000},{value=2147483647},{value=-2},{value=0.5},{value=false}})do
 for _,free in ipairs({{}, {value=false},{value=true},{value=0}})do
  local s,e,c=basic('collect');s.energy=energy;c.energyOnUse=capture.value;c.freeToPlayOnce=free.value
  run('collect captured '..cases,s,e,c,{bonus=2})
 end
end end
for _,chemical in ipairs({{}, {value=false},{value=0},{value=true},{value=1},{value='0'}})do
 local s,e,c=basic('collect');c.chemicalX=chemical.value;run('chemical '..cases,s,e,c)
end
for _,spec in ipairs({{energy=0,value=0,free=false,want=0},{energy=0,value=1,free=false,want=1},{energy=2000,value=1,free=true,want=999}})do
 local s,e,c=basic('collect');c.energyOnUse=spec.energy;c.freeToPlayOnce=spec.free;e.value=spec.value
 run('collect boundary '..cases,s,e,c,nil,function(success,p)
  ok(success,p);assert(#p.top==0,'[FLOW_PLAN] Collect priority')
  assert((p.bottom[1]and p.bottom[1].value or 0)==spec.want,'[FLOW_PLAN] Collect cap/zero/captured energy')
  assert(p.consumeAllEnergy==(spec.want>0 and not spec.free),'[FLOW_PLAN] Collect free spending')
 end)
end
for _,op in ipairs({'collect','fearNoEvil'})do
 local s,e,c=basic(op)
 run('callback error '..op,s,e,c,{throw=op=='collect'and 'bonus'or 'attack'},function(success,result,_,object)
  no(success);assert(result==object,'[FLOW_PLAN] original error identity')
 end)
 s,e,c=basic(op)
 run('callback mutation '..op,s,e,c,{mutate=function(actual,effect,context)
  actual.events[1]='callback';actual.rng.calls=1;effect.value=0;context.freeToPlayOnce=true
 end},ok)
end
for _,entry in ipairs({{}, {value=-1},{value=0},{value=1},{value=999},{value=0.5},{value='2'}})do
 local s,e,c=basic('triggerMarks');s.enemies[2].statuses.mark=entry.value;run('mark '..cases,s,e,c)
end
local s,e,c=basic('triggerMarks')
run('marks alive and dead ordered',s,e,c,nil,function(success,p)
 ok(success,p);assert(#p.bottom==2 and p.bottom[1].value==3 and p.bottom[2].value==5 and p.bottom[2].targetId=='enemy-2','[FLOW_PLAN] marks complete order')
end)
for _,id in ipairs({'battle_hymn','collect','energy_down','like_water','study','block_return','wrath_next_turn','draw_card_next_turn','vigor','mark','unknown'})do
 for _,op in ipairs({'gainWatcherFlowPower','applyWatcherFlowPower'})do
  s,e,c=basic(op);e.status=id;run('power '..op..id,s,e,c)
 end
end
s,e,c=basic('gainWatcherFlowPower');s.player.id=false
run('false player id retains fallback',s,e,c,nil,function(success,p)ok(success,p);assert(p.applyPower.targetId=='enemy-1','[FLOW_PLAN] false player id fallback')end)
s,e,c=basic('wallop')
run('Wallop snapshot',s,e,c,nil,function(success,p)ok(success,p);assert(p.damage.normalAmount==7 and p.damage.targetId=='enemy-1'and p.damage.after=='wallop'and #p.top==0,'[FLOW_PLAN] Wallop snapshot')end)
for _,uid in ipairs({-1,0,7,8,9,0.5,'7',false})do for _,size in ipairs({0,1,2,3})do
 s,e,c=basic('recallFlowCard');e.uid=uid;for _=1,size do s.hand[#s.hand+1]={cardId='strike'}end
 run('recall '..cases,s,e,c)
end end
s,e,c=basic('recallFlowCard');s.discard[2]={uid=7,cardId='invalid'}
run('first matching UID only',s,e,c,nil,function(success,p)ok(success,p);assert(p.move.uid==7 and p.move.cardId=='weave'and p.move.handHook==false,'[FLOW_PLAN] recall first match/hand hook')end)
s,e,c=basic('recallFlowCard');s.hand={{},{}}
run('recall full hand',s,e,c,nil,function(success,p)ok(success,p);assert(p.move==nil,'[FLOW_PLAN] recall full hand')end)
s,e,c=basic('collect');setmetatable(s.player,{label='preserve-metatable',alias=s.events});s.player.self=s.player
run('metatable cycle and alias',s,e,c,nil,ok)
run('missing effect',state(),nil,nil,nil,no)
run('unknown op',nil,{op='unknown'},nil,nil,no)
Flow.ops.extra=true
run('public extra op fallback',nil,{op='extra'},nil,nil,function(success,p)ok(success,p);assert(#p.top==0 and #p.bottom==0 and not p.consumeAllEnergy,'[FLOW_PLAN] extra op fallback')end)
Flow.ops.extra=nil
Flow.ops.flowDamage=false
s,e,c=basic('flowDamage');run('public disabled op',s,e,c,nil,no)
Flow.ops.flowDamage=true
print('WATCHER_FLOW_PLANNING_PASS '..cases)
