local G=require('abyss_golden_idol_event')
local Run=require('abyss_run')
local observed=0
local function fresh(stage)
 local event={id='golden_idol',stage=stage or 'trap',damage=20,maxHpLoss=6}
 local run={act=1,hp=80,maxHp=80,relics={},trace={},event=event}
 local flow={event=event,run=run};run.flow=flow;event.owner=run
 return run,flow,event
end
local function observe(run,flow,choice,uid,label)
 local out=table.pack(pcall(G.choose,run,flow,choice,uid))
 if not out[1]and type(out[2])=='string'then out[2]=GOLDEN_ERROR(out[2])end
 GOLDEN_GRAPH_WRITE({run=run,flow=flow,choice=choice,uid=uid,result=out},label,true)
 observed=observed+1;return out
end
local function install(mode)
 Run.obtainRelic=function(r,id)
  r.trace[#r.trace+1]={'relic',id};r.relics[#r.relics+1]=id
  if mode=='return'then return false,{reason='relic',run=r}end
  if mode=='throw'then error({reason='relic',run=r},0)end
  return true,id
 end
 Run.obtainCard=function(r,id)
  r.trace[#r.trace+1]={'card',id};r.card={uid=19,id=id,owner=r}
  if mode=='return'then return false,{reason='card',run=r}end
  if mode=='throw'then error({reason='card',run=r},0)end
  return true,mode=='blocked'and'curse_blocked'or mode=='table'and r.card or 19
 end
 Run.eventNormalDamage=function(r,damage)
  r.trace[#r.trace+1]={'damage',damage};r.hp=math.max(0,r.hp-damage)
  if mode=='return'then return false,{reason='damage',run=r}end
  if mode=='throw'then error({reason='damage',run=r},0)end
  return true
 end
end
for _,mode in ipairs({'ok','return','throw','blocked','table'})do
 for _,spec in ipairs({{'intro','take'},{'intro','leave'},{'intro','injury'},{'trap','injury'},{'trap','damage'},{'trap','max_hp'},{'trap','bad'},{'result','leave'},{'result','take'},{'unknown','leave'}})do
  install(mode);local r,f=fresh(spec[1]);observe(r,f,spec[2],nil,mode..':'..spec[1]..':'..spec[2])
 end
end
for _,health in ipairs({{1,1},{0,80},{81,80},{1,0},{1,2147483648},{1,1.5},{1.5,80},{-1,80},{'1',80},{1,'80'},{1,0/0},{0/0,80},{1,math.huge}})do
 install('ok');local r,f=fresh();r.hp,r.maxHp=health[1],health[2];observe(r,f,'bad',nil,'health:'..tostring(health[1])..':'..tostring(health[2]))
end
for _,stage in ipairs({'intro','trap','result'})do for _,uid in ipairs({false,0,{},'x'})do
 install('ok');local r,f=fresh(stage);observe(r,f,'take',uid,'uid:'..stage..':'..type(uid))
end end
for _,id in ipairs({'golden_idol','darkstone_periapt','omamori'})do for _,choice in ipairs({'take','injury','damage','max_hp'})do
 install('ok');local r,f=fresh(choice=='take'and'intro'or'trap');r.relics={id};observe(r,f,choice,nil,id..':'..choice)
end end
-- Proxy reads and writes are part of the graph, including short-circuit validation.
for _,choice in ipairs({'take','injury','damage','max_hp','bad'})do
 install('ok');local real,flow,event=fresh(choice=='take'and'intro'or'trap');local trace={}
 local proxy=setmetatable({},{__index=function(_,key)trace[#trace+1]={'get',key};return real[key]end,
 __newindex=function(_,key,value)trace[#trace+1]={'set',key,value};real[key]=value end})
 flow.run=proxy;event.owner=proxy
 observe(proxy,flow,choice,nil,'proxy:'..choice)
 GOLDEN_GRAPH_WRITE({state=real,trace=trace},'proxy trace:'..choice,true)
end
-- Named mutation oracles check semantics, rather than only old/new equality.
do
 install('ok');local r,f,e=fresh('intro');r.relics={'golden_idol'};assert(G.choose(r,f,'take'));assert(e.obtainedRelicId=='circlet','duplicate relic fallback')
 assert(e.stage=='trap','obtain before trap')
end
do
 install('return');local r,f,e=fresh('intro');local ok=G.choose(r,f,'take');assert(not ok and e.stage=='intro'and r.relics[1]=='golden_idol','late relic failure partial state')
end
do
 install('ok');local r,f,e=fresh();r.relics={'darkstone_periapt'};local ok,why=G.choose(r,f,'injury');assert(not ok and why=='event_obtain_content_unavailable'and #r.trace==0,'curse admission before obtain')
end
do
 install('blocked');local r,f,e=fresh();assert(G.choose(r,f,'injury'));assert(e.curseBlocked==true and e.obtainedCardUid==nil,'blocked curse result')
end
do
 install('ok');local r,f,e=fresh();r.hp=1;assert(G.choose(r,f,'damage'));assert(r.hp==0 and e.stage=='result','fatal damage result')
end
do
 install('ok');local r,f,e=fresh();assert(G.choose(r,f,'max_hp'));assert(r.maxHp==74 and r.hp==74,'maximum before clamp')
end
do
 install('ok');local r,f=fresh();r.hp=0;local ok,why=G.choose(r,f,'bad');assert(not ok and why=='invalid_event_health','health before invalid choice')
end
-- Dynamic public Run functions must be resolved on each command.
do
 install('ok');local r,f,e=fresh('intro');assert(G.choose(r,f,'take'))
 Run.obtainCard=function(state)state.trace[#state.trace+1]={'replacement'};return true,29 end
 assert(G.choose(r,f,'injury'));assert(e.obtainedCardUid==29,'dynamic obtainCard')
 GOLDEN_GRAPH_WRITE({run=r,flow=f},'dynamic replace',true)
end
print('GOLDEN_EDGES_PASS '..observed)
