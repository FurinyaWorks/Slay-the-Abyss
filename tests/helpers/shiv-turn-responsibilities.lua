local S=require('abyss_shivs')
local E=require('abyss_events')
local function eq(a,b,label)assert(a==b,label or(tostring(a)..' ~= '..tostring(b)))end
local function observe(label,root)SHIV_GRAPH_WRITE(root,label,true)end
local function state()
 local s={phase='player',turn=2,energy=3,player={id='player',hp=20,statuses={infinite_blades=2,accuracy=4}},
 enemies={{id='enemy',hp=20,statuses={}}},hand={{uid=1,cardId='defend'}},draw={{uid=2,cardId='shiv',upgraded=false,shivAccuracyBonus=9}},
 discard={{uid=3,cardId='defend'}},exhaust={{uid=4,cardId='shiv',upgraded=false,shivAccuracyBonus=8}},events={},rng={seed=17,calls=0},nextUid=5}
 E.emit(s,'silent_generate',{uid=2})
 -- Detached history may contain an identity no longer in any live pile.
 s.events[1].frame.hand[2]={uid=5,cardId='shiv',upgraded=false,shivAccuracyBonus=-5}
 s.alias={hand=s.hand,oldFrame=s.events[1].frame,oldCard=s.draw[1],rng=s.rng};s.alias.self=s.alias
 return s
end
local function generated(s,n,up)
 eq(up,false,'generator receives false upgrade');local ids={}
 for i=1,n do
  local c={uid=s.nextUid,cardId='shiv',upgraded=(s.player.statuses.master_reality or 0)>0}
  s.nextUid=s.nextUid+1;local pile=i%2==1 and s.hand or s.discard;pile[#pile+1]=c;ids[i]=c.uid
  E.emit(s,'silent_generate',{uid=c.uid})
 end
 return ids
end
local function normalize(r)
 if not r[1]and type(r[2])=='string'then
  -- Match only complete known assertion errors at their exact source line.
  -- Unexpected errors (even in this module) remain entirely unmodified.
  SHIV_RAW_ERROR(r[2])
  r[2]=SHIV_ERROR_LOCATIONS[r[2]] or r[2]
 end
 return r
end
local function failure(name,edit,gen,expected)
 local s=state();if edit then edit(s)end
 local trace={};local root={state=s,trace=trace};observe(name..':before',root)
 local function run(t,n,up)
  trace[#trace+1]={state=t,count=n,upgrade=up};observe(name..':generator',root)
  return gen(t,n,up)
 end
 local r=table.pack(pcall(S.startTurn,s,run));root.result=normalize(r)
 eq(r[1],false,name..': must fail');assert(type(r[2])=='string'and r[2]:find(expected,1,true),name..': expected '..expected..' got '..tostring(r[2]))
 for _,pile in ipairs({s.hand,s.discard})do for _,card in ipairs(pile)do
  if type(card.uid)=='number'and card.uid>=5 then eq(card.shivAccuracyBonus,nil,'validate all before stamping')end
 end end
 observe(name..':after',root)
end
if SHIV_MODE=='direct'then
 for _,name in ipairs({'dead','escaped','halfDead','isDying','all-enemies-dead','no-enemies','zero','missing-power'})do
  local s=state();if name=='dead'then s.player.hp=0
  elseif name=='all-enemies-dead'then s.enemies={{hp=0},{hp=10,escaped=true},{hp=10,halfDead=true},{hp=10,isDying=true}}
  elseif name=='no-enemies'then s.enemies={}
  elseif name=='zero'then s.player.statuses.infinite_blades=0
  elseif name=='missing-power'then s.player.statuses.infinite_blades=nil
  else s.player[name]=true end
  s.player.statuses.accuracy='invalid';local before=SHIV_GRAPH(s)
  local r=table.pack(pcall(S.startTurn,s,function()error('inactive generator called',0)end))
  eq(r[1],true);eq(r[2],false);eq(r.n,2);eq(SHIV_GRAPH(s),before,'inactive state unchanged')
  observe(name,{state=s,result=r})
 end
 for _,value in ipairs({-1,0.5,2147483648,math.huge,0/0,'2',true})do
  failure('invalid-layers-'..tostring(value),function(s)s.player.statuses.infinite_blades=value end,function()error('generator should not run',0)end,'invalid Infinite Blades amount')
 end
 for _,value in ipairs({-1,0.5,2147483642,math.huge,0/0,'4',true})do
  failure('invalid-accuracy-'..tostring(value),function(s)s.player.statuses.accuracy=value end,function()error('generator should not run',0)end,'unsupported Accuracy amount')
 end
 for _,gen in ipairs({false,1,{},setmetatable({},{__call=function()end})})do
  local s=state();s.player.statuses.accuracy=-1;local before=SHIV_GRAPH(s)
  local r=normalize(table.pack(pcall(S.startTurn,s,gen)));eq(r[1],false)
  assert(r[2]:find('missing shared Shiv generator',1,true),'generator validation before Accuracy');eq(SHIV_GRAPH(s),before)
  observe('missing-generator',{state=s,result=r,generator=gen})
 end
 -- Full shape/count validation precedes per-UID validation; generation writes survive rejection.
 local cases={
  {'not-table',function()return false end,'wrong Shiv count'},
  {'short',function(_,ids)ids[2]=nil;return ids end,'wrong Shiv count'},
  {'long',function(_,ids)ids[3]=7;return ids end,'wrong Shiv count'},
  {'meta',function(_,ids)return setmetatable(ids,{tag='uids'})end,'wrong Shiv count'},
  {'string-key',function(_,ids)ids.bad=5;return ids end,'malformed UIDs'},
  {'zero-key',function(_,ids)ids[0]=5;return ids end,'malformed UIDs'},
  {'fraction-key',function(_,ids)ids[1.5]=5;return ids end,'malformed UIDs'},
  {'negative-key',function(_,ids)ids[-1]=5;return ids end,'malformed UIDs'},
  {'oversized-key',function(_,ids)ids[9]=5;return ids end,'malformed UIDs'},
  {'string-uid',function(_,ids)ids[1]='5';return ids end,'invalid generated Shiv'},
  {'zero-uid',function(_,ids)ids[1]=0;return ids end,'invalid generated Shiv'},
  {'negative-uid',function(_,ids)ids[1]=-1;return ids end,'invalid generated Shiv'},
  {'fraction-uid',function(_,ids)ids[1]=5.5;return ids end,'invalid generated Shiv'},
  {'overflow-uid',function(_,ids)ids[1]=2147483648;return ids end,'invalid generated Shiv'},
  {'infinite-uid',function(_,ids)ids[1]=math.huge;return ids end,'invalid generated Shiv'},
  {'nan-uid',function(_,ids)ids[1]=0/0;return ids end,'invalid generated Shiv'},
  {'boolean-uid',function(_,ids)ids[1]=true;return ids end,'invalid generated Shiv'},
  {'table-uid',function(_,ids)ids[1]={};return ids end,'invalid generated Shiv'},
  {'duplicate',function(_,ids)ids[2]=ids[1];return ids end,'invalid generated Shiv'},
  {'old-hand',function(_,ids)ids[1]=1;return ids end,'invalid generated Shiv'},
  {'old-draw',function(s,ids)s.hand[#s.hand+1]=s.draw[1];ids[1]=2;return ids end,'invalid generated Shiv'},
  {'old-discard',function(_,ids)ids[1]=3;return ids end,'invalid generated Shiv'},
  {'old-exhaust',function(s,ids)s.hand[#s.hand+1]=s.exhaust[1];ids[1]=4;return ids end,'invalid generated Shiv'},
  {'missing',function(_,ids)ids[1]=999;return ids end,'invalid generated Shiv'},
  {'wrong-card',function(s,ids)s.hand[2].cardId='defend';return ids end,'invalid generated Shiv'},
  {'wrong-upgrade',function(s,ids)s.hand[2].upgraded=true;return ids end,'invalid generated Shiv'},
  {'nil-upgrade',function(s,ids)s.hand[2].upgraded=nil;return ids end,'invalid generated Shiv'},
  {'draw-only',function(s,ids)s.draw[#s.draw+1]=table.remove(s.hand);return ids end,'invalid generated Shiv'},
  {'exhaust-only',function(s,ids)s.exhaust[#s.exhaust+1]=table.remove(s.hand);return ids end,'invalid generated Shiv'},
 }
 for _,case in ipairs(cases)do
  failure(case[1],nil,function(s,n,up)local ids=generated(s,n,up);local out=case[2](s,ids);s.alias.output=out;return out end,case[3])
 end
 for _,stage in ipairs({'before','after-one','after-all'})do
  local s=state();local fault={stage=stage};s.alias.fault=fault
  observe('throw-'..stage..':before',{state=s,fault=fault})
  local r=table.pack(pcall(S.startTurn,s,function(t,n,up)
   t.rng.seed=29;t.rng.calls=t.rng.calls+1
   if stage=='after-one'then generated(t,1,up)elseif stage=='after-all'then generated(t,n,up)end
   observe('throw-'..stage..':generator',{state=t,fault=fault});error(fault,0)
  end))
  eq(r[1],false);eq(r[2],fault,'error identity');eq(s.rng.seed,29)
  eq(#s.hand,stage=='before'and 1 or 2,'partial writes retained')
  observe('throw-'..stage..':after',{state=s,result=r,fault=fault})
 end
 for _,master in ipairs({0,1})do for _,bonus in ipairs({0,4,2147483641})do
  local s=state();s.player.statuses.master_reality=master;s.player.statuses.accuracy=bonus
  local old=SHIV_GRAPH(s.events[1]);local ids;local trace={}
  local r=table.pack(pcall(S.startTurn,s,function(t,n,up)
   trace[#trace+1]={count=n,upgrade=up};ids=generated(t,n,up);s.alias.output=ids
   E.emit(t,'other',{uid=ids[1]});t.events[#t.events].frame.hand[2].shivAccuracyBonus=-7
   -- Pre-call bonus is used even if the generator changes the live power.
   t.player.statuses.accuracy=6;observe('success-generator',{state=t,trace=trace,ids=ids});return ids
  end))
  eq(r[1],true,tostring(r[2]));eq(r[2],true);eq(r[3],ids,'UID return alias');eq(r.n,3)
  eq(s.hand[2].shivAccuracyBonus,bonus,'captured Accuracy');eq(s.discard[2].shivAccuracyBonus,bonus)
  eq(s.draw[1].shivAccuracyBonus,9);eq(s.exhaust[1].shivAccuracyBonus,8)
  eq(SHIV_GRAPH(s.events[1]),old,'historical frame unchanged')
  eq(#s.events[2].frame.hand,2);eq(#s.events[2].frame.discard,1,'first generation frame retains pile order')
  eq(s.events[2].frame.hand[2].shivAccuracyBonus,bonus,'new frame stamped')
  eq(s.events[3].frame.discard[2].shivAccuracyBonus,bonus,'later frame stamped')
  eq(s.events[4].frame.hand[2].shivAccuracyBonus,-7,'non-generation frame untouched')
  observe('success-'..master..'-'..bonus,{state=s,trace=trace,result=r,ids=ids})
 end end
 -- A dynamic metatable lookup is observable, as are metatables on cards/piles.
 local s=state();local reads={};local layers=s.player.statuses.infinite_blades;s.player.statuses.infinite_blades=nil
 setmetatable(s.player.statuses,{__index=function(_,key)reads[#reads+1]=key;if key=='infinite_blades'then return layers end end})
 setmetatable(s.hand,{tag='hand'});setmetatable(s.hand[1],{tag='card'})
 local r=table.pack(pcall(S.startTurn,s,generated));eq(r[1],true,tostring(r[2]));eq(r[2],true)
 observe('metatables',{state=s,reads=reads,result=r})
 -- Actor callbacks remain dynamically looked up, and the enemy scan does not
 -- short circuit after its first live target.
 local A=require('abyss_actor');local real=A.isActive;local calls={};local s=state()
 s.enemies[2]={id='second',hp=0,statuses={}};s.enemies[3]={id='third',hp=10,statuses={}}
 A.isActive=function(actor)calls[#calls+1]=actor.id;return real(actor)end
 local r=table.pack(pcall(S.startTurn,s,generated));A.isActive=real
 eq(r[1],true,tostring(r[2]));eq(#calls,4,'full active enemy scan');eq(calls[4],'third')
 observe('actor-callbacks',{state=s,calls=calls,result=r})
 -- The first actor hook replaces the method slot. Subsequent enemy reads
 -- must resolve the replacement rather than a captured earlier function.
 local s=state();s.enemies[2]={id='second',hp=10,statuses={}};local calls={}
 A.isActive=function(actor)
  calls[#calls+1]={slot='original',id=actor.id}
  A.isActive=function(nextActor)calls[#calls+1]={slot='replacement',id=nextActor.id};return real(nextActor)end
  return real(actor)
 end
 local r=table.pack(pcall(S.startTurn,s,generated));A.isActive=real
 eq(r[1],true,tostring(r[2]));eq(#calls,3);eq(calls[2].slot,'replacement');eq(calls[3].slot,'replacement')
 observe('actor-method-replacement',{state=s,calls=calls,result=r})
 local s=state();s.enemies[2]={id='later',hp=10,statuses={}};local calls={};local fault={actor=true};local didGenerate=false
 local before=SHIV_GRAPH(s)
 A.isActive=function(actor)calls[#calls+1]=actor.id;if actor.id=='later'then error(fault,0)end;return real(actor)end
 local r=table.pack(pcall(S.startTurn,s,function()didGenerate=true end));A.isActive=real
 eq(r[1],false);eq(r[2],fault);eq(didGenerate,false);eq(#calls,3);eq(SHIV_GRAPH(s),before,'late actor error before generation')
 observe('actor-late-error',{state=s,calls=calls,result=r,fault=fault})
 -- Valid UID upper boundary and single-layer generation, plus all four frame piles.
 local s=state();s.player.statuses.infinite_blades=1;s.nextUid=2147483647
 local r=table.pack(pcall(S.startTurn,s,function(t,n,up)
  local ids=generated(t,n,up);local frame=t.events[2].frame
  frame.draw[#frame.draw+1]={uid=ids[1],cardId='shiv'}
  frame.exhaust[#frame.exhaust+1]={uid=ids[1],cardId='shiv'}
  return ids
 end));eq(r[1],true,tostring(r[2]));eq(r[3][1],2147483647)
 eq(s.events[2].frame.draw[2].shivAccuracyBonus,4);eq(s.events[2].frame.exhaust[2].shivAccuracyBonus,4)
 observe('maximum-uid',{state=s,result=r})
 -- Frame failure happens after live-card stamping; it is not transactional.
 local s=state();local fault={frame=true};local writes={}
 local r=table.pack(pcall(S.startTurn,s,function(t,n,up)
  local ids=generated(t,n,up);local c=t.events[3].frame.discard[2]
  setmetatable(c,{__newindex=function(_,key,value)writes[#writes+1]={key=key,value=value};error(fault,0)end})
  return ids
 end));eq(r[1],false);eq(r[2],fault);eq(s.hand[2].shivAccuracyBonus,4);eq(s.discard[2].shivAccuracyBonus,4)
 eq(s.events[2].frame.hand[2].shivAccuracyBonus,4);eq(#writes,1)
 observe('frame-partial-error',{state=s,result=r,fault=fault,writes=writes})
 -- Upper bound is validated without allocating billions of cards.
 local s=state();s.player.statuses.infinite_blades=2147483647;local fault={bound=true}
 local r=table.pack(pcall(S.startTurn,s,function(_,n)eq(n,2147483647);error(fault,0)end));eq(r[2],fault)
 observe('maximum-layer',{state=s,result=r,fault=fault})
else
 local C=require('abyss_combat');local Silent=require('abyss_silent');local D=require('abyss_data')
 local data=S.withInfiniteBladesDefinition(Silent.withFoundationCards(D))
 for _,master in ipairs({0,1})do
  local deck={};for i=1,12 do deck[i]='defend'end
  local s=C.new(data,{seed=17,enemies={'cultist'},deck=deck})
  s.enemies[1].hp=300;s.enemies[1].maxHp=300
  S.applyAccuracy(s,4);S.applyInfiniteBlades(s,1);s.player.statuses.infinite_blades=3;s.player.statuses.master_reality=master
  C.draw(s,4);eq(#s.hand,9)
  local Random=require('abyss_sts_random');s.cardRandomRng=Random.fromSeed('17')
  local rngBefore=SHIV_GRAPH(s.cardRandomRng);local aliases={hand=s.hand,draw=s.draw,discard=s.discard,rng=s.cardRandomRng,events=s.events}
  local before=#s.events;local history=SHIV_GRAPH(s.events)
  observe('combat-before-'..master,{state=s,aliases=aliases})
  local r=table.pack(pcall(S.startTurn,s,Silent.generateShivs));eq(r[1],true,tostring(r[2]));eq(r[2],true);eq(#r[3],3)
  eq(#s.hand,10);eq(#s.discard,2);eq(SHIV_GRAPH(s.cardRandomRng),rngBefore,'generation RNG unchanged')
  local retained={};for i=1,before do retained[i]=s.events[i]end;eq(SHIV_GRAPH(retained),history,'real historical events unchanged')
  for _,pile in ipairs({s.hand,s.discard})do for _,c in ipairs(pile)do if c.cardId=='shiv'then
   eq(c.upgraded,master>0);eq(c.shivAccuracyBonus,4);eq(C.cardDefinition(s,c).effects[1].value,master>0 and 10 or 8)
  end end end
  local drawCount=#s.draw;C.draw(s,5);eq(#s.draw,drawCount,'generation before ordinary draw')
  observe('combat-generated-'..master,{state=s,aliases=aliases,result=r})
  local hp=s.enemies[1].hp;assert(C.play(s,r[3][1],1));eq(s.enemies[1].hp,hp-(master>0 and 10 or 8))
  observe('combat-played-'..master,{state=s,aliases=aliases,result=r})
 end
end
