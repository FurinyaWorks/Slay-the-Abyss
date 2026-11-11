package.loaded.abyss_run={}
local G=require('abyss_golden_idol_event');local Run=require('abyss_run')
local count=0
for _,choice in ipairs({'take','leave','injury','damage','max_hp','bogus'})do
 for _,stage in ipairs({'intro','trap','result'})do
  for stop=0,48 do
   local trace={};local n=0;local marker={tag='injected'}
   local function tick(op,key,value)
    n=n+1;trace[#trace+1]={op,key,value};if n==stop then error(marker,0)end
   end
   local rawR={act=1,hp=80,maxHp=80,relics={}};local rawE={stage=stage,damage=20,maxHpLoss=6}
   local function proxy(raw,name)return setmetatable({},{__index=function(_,k)tick(name..'.get',k);return raw[k]end,__newindex=function(_,k,v)tick(name..'.set',k,v);raw[k]=v end})end
   local r,e=proxy(rawR,'run'),proxy(rawE,'event');local f=proxy({event=e},'flow')
   Run.obtainRelic=nil;Run.obtainCard=nil;Run.eventNormalDamage=nil
   setmetatable(Run,{__index=function(_,key)
    tick('Run.get',key)
    return function(run,id)
     tick('invoke',key,id);rawR.partial={id=id};return true,nil,'ignored'
    end
   end})
   local result=table.pack(pcall(G.choose,r,f,choice))
   GOLDEN_GRAPH_WRITE({run=rawR,event=rawE,trace=trace,result=result,marker=marker},choice..':'..stage..':'..stop,true);count=count+1
  end
 end
end
-- Mutate values across repeated reads; neither validation nor stage dispatch may cache them.
for flip=1,25 do
 local n=0;local trace={};local r=setmetatable({relics={}},{__index=function(_,k)
  n=n+1;trace[#trace+1]=k
  if k=='act'then return 1 end
  if k=='hp'then return n<flip and 80 or 0 end
  if k=='maxHp'then return n<flip and 80 or 20 end
 end})
 local e={stage='trap',maxHpLoss=6,damage=20}
 local out=table.pack(pcall(G.choose,r,{event=e},'bogus'))
 GOLDEN_GRAPH_WRITE({trace=trace,result=out},'flipping:'..flip,true);count=count+1
end
print('ADVERSARIAL_PASS '..count)
