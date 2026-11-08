local S=require('abyss_scry')
local E=require('abyss_events')
local Q=require('abyss_action_queue')
local Flow=require('abyss_watcher_flow_cards')
local Corruption=require('abyss_corruption')
local Shivs=require('abyss_shivs')
local function eq(a,b,label) assert(a==b,label or (tostring(a)..' ~= '..tostring(b))) end
local function observe(label,root) CHOICE_GRAPH_WRITE(root,label,true) end
local function state()
 local s={phase='player',turn=1,scrySerial=7,player={hp=20,statuses={}},enemies={{hp=20,statuses={}}},
  catalog={cards={defend={},weave={}}},events={},draw={},discard={},hand={},exhaust={},rng={seed=91,calls=0}}
 for i=1,3 do s.draw[i]={uid=i,cardId='defend'} end
 s.pendingScry={token=7,turn=1,drawSize=3,candidateUids={3,2,1}}
 s.alias={draw=s.draw,discard=s.discard,pending=s.pendingScry,card=s.draw[3],rng=s.rng};s.alias.self=s.alias
 return s
end
local function refusal(name,edit,uids,token,reason)
 local s=state();edit(s);local root={state=s,input=uids};observe(name..':before',root)
 local unchanged=CHOICE_GRAPH(s)
 local result=table.pack(pcall(S.choose,s,uids,token));root.result=result
 eq(result[1],true,name..': no throw');eq(result[2],false,name..': refusal');eq(result[3],reason,name..': priority')
 eq(CHOICE_GRAPH(s),unchanged,name..': refusal must not write any reachable field')
 observe(name..':after',root)
end
if CHOICE_MODE=='direct' then
 refusal('live-priority',function(s)s.phase='enemy';s.pendingScry=nil;s.draw=false end,false,0,'not_player_turn')
 refusal('nil-token',function()end,{},nil,'stale_scry_token')
 refusal('nan-token',function()end,{},0/0,'stale_scry_token')
 refusal('nil-count',function()end,nil,7,'invalid_scry_count')
 refusal('nan-uid',function()end,{0/0},7,'invalid_scry_uid')
 refusal('count-before-uid',function()end,{0,0,0,0},7,'invalid_scry_count')
 refusal('uid-before-queue',function(s)s.discard[1]={uid=4,cardId='weave'}end,{0},7,'invalid_scry_uid')
 refusal('queue-before-events',function(s)s.discard[1]={uid=4,cardId='weave'};s.events=nil end,{},7,'missing_weave_action_queue')
 refusal('dead',function(s)s.player.hp=0 end,{},7,'not_player_turn')
 refusal('no-enemy',function(s)s.enemies={} end,{},7,'not_player_turn')
 for _,v in ipairs({false,0,-1,1.5,2147483648,'7'}) do
  refusal('token-'..tostring(v),function(s)s.draw=false end,{},v,'stale_scry_token')
 end
 for name,edit in pairs({missing=function(s)s.pendingScry=nil end,serial=function(s)s.scrySerial=8 end,token=function(s)s.pendingScry.token=8 end}) do
  refusal('pending-'..name,edit,false,7,'stale_scry_token')
 end
 local edits={
  drawmeta=function(s)setmetatable(s.draw,{})end,
  drawsparse=function(s)s.draw[2]=nil end,
  missingcard=function(s)s.draw[2].cardId='missing'end,
  invalidcard=function(s)s.draw[2].uid=0 end,
  hand=function(s)s.hand[1]=s.draw[1]end,
  exhaust=function(s)s.exhaust[1]=false end,
  candidatenontable=function(s)s.pendingScry.candidateUids=false end,
  piles=function(s)s.discard[1]=s.draw[1] end,
  catalog=function(s)s.catalog.cards=nil end,
  turn=function(s)s.pendingScry.turn=2 end,size=function(s)s.pendingScry.drawSize=2 end,
  empty=function(s)s.pendingScry.candidateUids={} end,
  oversized=function(s)s.pendingScry.candidateUids={3,2,1,4} end,
  sparse=function(s)s.pendingScry.candidateUids={[1]=3,[3]=1} end,
  meta=function(s)setmetatable(s.pendingScry.candidateUids,{})end,
  reordered=function(s)s.pendingScry.candidateUids={2,3,1} end,
  duplicate=function(s)s.pendingScry.candidateUids={3,3} end,
  malformed=function(s)s.pendingScry.candidateUids={3,'2'}end,
  cardmeta=function(s)setmetatable(s.draw[1],{})end,
  inuse=function(s)s.cardInUse=s.draw[1]end,
 }
 -- Ordered names keep cross-VM trace order deterministic.
 for _,name in ipairs({'drawmeta','drawsparse','missingcard','invalidcard','hand','exhaust','candidatenontable','piles','catalog','turn','size','empty','oversized','sparse','meta','reordered','duplicate','malformed','cardmeta','inuse'}) do
  refusal('draw-'..name,edits[name],false,7,'stale_scry_draw')
 end
 for _,input in ipairs({false,{1,2,3,4},{[1]=3,[3]=1},{bad=3},setmetatable({3},{})}) do
  refusal('count',function()end,input,7,'invalid_scry_count')
 end
 for _,input in ipairs({{3,3},{0},{4},{'3'},{1.5},{2147483648},{false}}) do
  refusal('uid',function()end,input,7,'invalid_scry_uid')
 end
 for _,where in ipairs({'draw','discard'}) do
  refusal('weave-'..where,function(s)
   if where=='draw'then s.draw[3].cardId='weave'else s.discard[1]={uid=4,cardId='weave'}end
  end,{3},7,'missing_weave_action_queue')
 end
 for _,input in ipairs({{},{2,3},{1,2,3}}) do
  local s=state();observe('success:before',{state=s,input=input})
  local r=table.pack(pcall(S.choose,s,input,7));eq(r[1],true);eq(r[2],true);eq(s.pendingScry,nil)
  for i,uid in ipairs(input) do eq(s.discard[i].uid,uid,'selection order');eq(s.events[i].detail.uid,uid,'event order')end
  observe('success:after',{state=s,input=input,result=r})
 end
 local s=state();s.draw[3].cardId='weave';Q.start(s,{})
 local r=table.pack(pcall(S.choose,s,{3},7));eq(r[2],true);eq(s.actionQueue.actions[1].effect.uid,3)
 observe('weave-queue',{state=s,result=r})
 -- Real Corruption and Accuracy implementations, including detached event frames.
 local buff=state();buff.player.statuses={corruption=1,accuracy=4}
 buff.catalog.cards.defend={id='defend',type='skill',cost=1}
 buff.catalog.cards.shiv={id='shiv',type='attack',cost=0}
 buff.hand={{uid=4,cardId='defend'},{uid=5,cardId='shiv'}}
 observe('real-buffs-before',{state=buff})
 local result=table.pack(pcall(S.choose,buff,{3,2},7));eq(result[1],true,tostring(result[2]));eq(result[2],true)
 eq(buff.hand[1].combatCost,0);eq(buff.hand[1].turnCost,0);eq(buff.hand[2].shivAccuracyBonus,4)
 eq(buff.events[1].frame.hand[2].shivAccuracyBonus,4)
 observe('real-buffs-after',{state=buff,result=result})
 -- Lua source line numbers move during extraction. Keep the raw error locally,
 -- assert its exact semantic suffix, and compare only that suffix in the graph.
 local missing=state();missing.events=nil
 local unchanged=CHOICE_GRAPH(missing)
 local err=table.pack(pcall(S.choose,missing,{},7));eq(err[1],false)
 eq(err[2],CHOICE_MISSING_ERROR,'exact source location and full error text')
 eq(CHOICE_GRAPH(missing),unchanged,'events assertion before any write')
 err[2]='missing scry events'
 observe('missing-events',{state=missing,result=err})
 local oldC,oldS,oldE,oldPlan=Corruption.onDrawOrDiscard,Shivs.onDrawOrDiscard,E.emit,Flow.planScry
 for _,faultAt in ipairs({'none','corruption','accuracy','event','plan'}) do
  local s=state();Q.start(s,{});s.player.statuses.corruption=1;s.player.statuses.accuracy=1
  local trace={};local fault={stage=faultAt}
  local function hook(kind)
   trace[#trace+1]={kind=kind,pending=s.pendingScry,drawCount=#s.draw,discardCount=#s.discard,rng=s.rng.seed}
   observe('hook-'..faultAt..'-'..kind,{state=s,trace=trace,fault=fault})
   if kind=='plan'then eq(s.pendingScry,nil,'pending clears before plan')else eq(s.pendingScry,s.alias.pending,'pending retained through callbacks')end
   if kind==faultAt then error(fault,0)end
  end
  Corruption.onDrawOrDiscard=function(t)hook('corruption');t.rng.seed=t.rng.seed+1;t.rng.calls=t.rng.calls+1
   Shivs.onDrawOrDiscard=function()hook('dynamic-accuracy')end
  end
  Shivs.onDrawOrDiscard=function()hook('accuracy')end
  if faultAt=='accuracy'then Corruption.onDrawOrDiscard=function()hook('corruption')end end
  E.emit=function(t,kind,detail)hook('event');return oldE(t,kind,detail)end
  Flow.planScry=function(t,eligible)hook('plan');return oldPlan(t,eligible)end
  observe('callbacks-before-'..faultAt,{state=s,trace=trace,fault=fault})
  local r=table.pack(pcall(S.choose,s,{2,3},7))
  if faultAt=='none'then eq(r[1],true,tostring(r[2]));eq(r[2],true);eq(#s.discard,2)
  else eq(r[1],false);eq(r[2],fault);eq(#s.discard,faultAt=='plan'and 2 or 1,'partial write retained')end
  observe('callbacks-after-'..faultAt,{state=s,trace=trace,fault=fault,result=r})
 end
 Corruption.onDrawOrDiscard,Shivs.onDrawOrDiscard,E.emit,Flow.planScry=oldC,oldS,oldE,oldPlan
 -- Dynamic state lookup remains visible, without inventing a rawget contract.
 local s=state();local pending=s.pendingScry;s.pendingScry=nil;local reads={}
 setmetatable(s,{__index=function(_,key)reads[#reads+1]=key;if key=='pendingScry'then return pending end end})
 local r=table.pack(pcall(S.choose,s,{3},7));eq(r[2],true)
 observe('state-metatable',{state=s,reads=reads,result=r,pending=pending})
else
 local C=require('abyss_combat');local W=require('abyss_watcher_cards');local D=require('abyss_data')
 local s,uid
 for seed=1,100 do
  local deck={'cut_through_fate'};for i=1,6 do deck[#deck+1]='defend'end
  s=C.new(W.withFoundationCards(D),{seed=seed,enemies={'cultist'},enableStances=true,deck=deck})
  for _,card in ipairs(s.hand)do if card.cardId=='cut_through_fate'then uid=card.uid end end
  if uid then break end
 end
 assert(uid);s.enemies[1].hp=1000;s.enemies[1].maxHp=1000
 local Random=require('abyss_sts_random');local shuffle=Random.shuffle;local rngTrace={};local legacyRandom=C.random
 C.random=function(t,maximum)
  observe('legacy-rng-before',{state=t,maximum=maximum})
  local value=legacyRandom(t,maximum);rngTrace[#rngTrace+1]={maximum=maximum,value=value}
  observe('legacy-rng-after',{state=t,maximum=maximum,value=value});return value
 end
 Random.shuffle=function(rng,pile)
  observe('rng-before',{rng=rng,pile=pile})
  local result=table.pack(shuffle(rng,pile));rngTrace[#rngTrace+1]={count=#pile}
  observe('rng-after',{rng=rng,pile=pile,result=result});return table.unpack(result,1,result.n)
 end
 assert(C.play(s,uid,1));eq(s.enemies[1].hp,993)
 local p=s.pendingScry;local input={p.candidateUids[1],p.candidateUids[2]};local alias={pending=p,draw=s.draw,hand=s.hand,queue=s.actionQueue}
 local real=C.draw;local fault={afterRealDraw=true};local trace={}
 observe('combat-before',{state=s,alias=alias,input=input,fault=fault})
 C.draw=function(t,n)real(t,n);trace[#trace+1]={hand=#t.hand,rng=t.rng};observe('combat-partial',{state=t,alias=alias,trace=trace});error(fault,0)end
 local result=table.pack(pcall(C.chooseScry,s,input,p.token));C.draw=real
 eq(result[1],false);eq(result[2],fault);eq(s.pendingScry,p);eq(s.draw,alias.draw);eq(s.hand,alias.hand);eq(s.actionQueue,alias.queue);eq(#s.draw,2);eq(s.enemies[1].hp,993)
 observe('combat-rollback',{state=s,alias=alias,result=result,fault=fault,trace=trace})
 local result2=table.pack(pcall(C.chooseScry,s,input,p.token));eq(result2[1],true);eq(result2[2],true);eq(s.pendingScry,nil);eq(s.actionQueue,nil);eq(s.enemies[1].hp,993)
 assert(#rngTrace>0,'real resumed draw must consume shuffle RNG')
 observe('combat-resumed',{state=s,alias=alias,result=result2,trace=trace,rngTrace=rngTrace})
 Random.shuffle=shuffle;C.random=legacyRandom
end
