package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local W,Run,Nodes,R,C,P=require('abyss_wheel_event'),require('abyss_run'),require('abyss_nodes'),require('abyss_sts_random'),require('abyss_combat'),require('abyss_living_wall')
local Data=require('abyss_data')
local function eq(a,b,label)assert(a==b,(label or 'wheel boundary')..': '..tostring(a)..' ~= '..tostring(b))end
local function same(a,b)
 eq(type(a),type(b));if type(a)~='table'then eq(a,b);return end
 for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end
end
local function fixture(stage,outcome)
 local r=Run.new(Data,42);r.phase='node';r.nodeFlow={type='event',complete=false,event={id='wheel',stage=stage,outcome=outcome}}
 W.prepare(r,r.nodeFlow.event);r.miscRng=R.restore({words={'0000000000000000','0000000000000003'},counter=0})
 r.deck={{uid=7,cardId='strike',upgraded=false},{uid=8,cardId='bash',inBottleFlame=true}}
 return r,r.nodeFlow.event
end
local function direct(r,choice,uid)return W.choose(r,r.nodeFlow,choice,uid)end
local function patch(owner,key,replacement,fn)
 local old=owner[key];owner[key]=replacement;local out=table.pack(pcall(fn));owner[key]=old;assert(out[1],out[2])
end
for _,stage in ipairs({'result','wheel_result','relic_reward','choose_card','unknown',false})do
 for _,choice in ipairs({'spin','accept','claim_relic','skip_relic','purge','leave','unknown'})do
  local r=fixture(stage,9);local before=C.copy(r)
  local ok,why=direct(r,choice,999)
  eq(ok,false,'UID gate');eq(why,stage=='choose_card' and choice=='purge' and 'card_not_purgeable' or 'invalid_event_choice');same(r,before)
 end
end
print('PASS wheel boundaries UID gate')
-- Nil/false and unsupported outcomes preserve fallthrough, including missing choice.
for _,outcome in ipairs({-1,6,false,'0'})do local r=fixture('wheel_result',outcome);eq(direct(r,'accept'),false)end
local r=fixture('wheel_result');eq(direct(r,'accept'),false)
for _,stage in ipairs({'result','wheel_result','relic_reward','choose_card','unknown',false})do
 local x=fixture(stage,1);eq(direct(x,nil),false)
end
-- Failure-producing dependencies are looked up at call time. A direct failure
-- retains dependency partial writes; Nodes owns complete transaction rollback.
for _,case in ipairs({{'prepareRelic',1,'accept','wheel_result'},{'obtainCard',3,'accept','wheel_result'},
 {'eventDamage',5,'accept','wheel_result'},{'obtainRelic',1,'claim_relic','relic_reward'},
 {'removeCard',4,'purge','choose_card'}})do
 for _,transaction in ipairs({false,true})do
  local x,e=fixture(case[4],case[2]);e.relicOffer={id='anchor'};e.choice='purge'
  local before=C.copy(x);local owners={deck=x.deck,flow=x.nodeFlow,pool=x.relicPool,rng=x.miscRng}
  patch(Run,case[1],function(run)
   run.gold=run.gold+11;run.deck[1].sentinel='partial';run.miscRng.counter=19
   return false,'injected_'..case[1]
  end,function()
   local ok,why=(transaction and Nodes.chooseEvent or direct)(x,case[3],case[1]=='removeCard' and 7 or nil)
   eq(ok,false);eq(why,'injected_'..case[1])
  end)
  if transaction then same(x,before);eq(x.deck,owners.deck);eq(x.nodeFlow,owners.flow);eq(x.relicPool,owners.pool);eq(x.miscRng,owners.rng)
  else eq(x.deck[1].sentinel,'partial');eq(x.miscRng.counter,19)end
 end
end
print('PASS wheel boundaries transaction rollback')
-- Float32 nested rounding differs from a double multiply at this boundary.
local x,e=fixture('wheel_result',5);x.maxHp=16777219;x.hp=x.maxHp
assert(direct(x,'accept'));eq(e.damage,1677722,'float32 damage')
-- A late error preserves spin writes before description construction.
x,e=fixture();e.goldAmount=nil
local ok,why=pcall(direct,x,'spin');eq(ok,false);assert(why:find('concatenate'));eq(e.stage,'wheel_result');eq(e.outcome,3);eq(x.miscRng.counter,1)
-- Purge scans through all candidates, even after a match; late reads may fail.
x,e=fixture('choose_card',4)
patch(P,'purgeCards',function()return {{uid=7},setmetatable({},{__index=function()error('late purge read',0)end})}end,function()
 local succeeded,message=pcall(direct,x,'purge',7);eq(succeeded,false);eq(message,'late purge read');eq(#x.deck,2)
end)
-- Event field reads/writes must not be cached or hoisted across stage dispatch.
for _,stage in ipairs({'wheel_result','relic_reward','choose_card','unknown',false})do
 local a,event=fixture(stage,9);local trace={}
 a.nodeFlow.event=setmetatable({},{__index=function(_,key)trace[#trace+1]='read:'..key;return event[key]end,
 __newindex=function(_,key,value)trace[#trace+1]='write:'..key;event[key]=value end})
 direct(a,'invalid')
 if WHEEL_GRAPH_WRITE then WHEEL_GRAPH_WRITE({trace=trace,event=event},'dynamic-event-access')end
end
print('WHEEL_BOUNDARIES passed')
