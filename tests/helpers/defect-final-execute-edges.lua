local M=require('abyss_defect_final_cards');local execute=DEFECT_EXECUTE_UNOBSERVED
local realRequire=require
local trace,failAt,steps={},nil,0
local sentinel={error='injected execute boundary'}
local function step(name,...)
 trace[#trace+1]={name=name,args=table.pack(...)};steps=steps+1
 if steps==failAt then error(sentinel,0)end
end
local function install(name,fields)
 local mod=realRequire(name);for k,v in pairs(fields)do mod[k]=v end;return mod
end
local actions=install('abyss_card_actions',{
 fresh=function(_,s,id)step('fresh',id);s.nextUid=s.nextUid+1;local c={cardId=id,uid=s.nextUid};s.fresh=c;return c end,
 created=function(_,s,c)step('created',c);c.created=(c.created or 0)+1;s.lastCreated=c end,
 toHand=function(s,c)step('toHand',c);local pile=#s.hand<s.rules.player.maxHand and s.hand or s.discard;pile[#pile+1]=c end,
})
install('abyss_corruption',{created=function(s,c)step('corruption',c);c.corrupted=true;s.corrupted=c end})
install('abyss_actor',{applyPower=function(s,p,id,n,owner)step('power',p,id,n,owner);p.statuses[id]=(p.statuses[id]or 0)+n end})
install('abyss_events',{emit=function(s,name,e)step('event',name,e);s.events[#s.events+1]={name=name,event=e}end})
install('abyss_orbs',{rechannel=function(s,ball,c)step('rechannel',ball,c);s.orbs.balls[#s.orbs.balls+1]=ball end})
install('abyss_hand_choice',{begin=function(s,kind,n,q)step('choice',kind,n,q);s.choice={kind=kind,count=n};return false,'choice-return',s end})
install('abyss_sts_random',{
 shuffle=function(rng,pile)step('shuffle',rng,pile);rng.counter=rng.counter+1;for i=1,math.floor(#pile/2)do pile[i],pile[#pile-i+1]=pile[#pile-i+1],pile[i]end end,
 randomInt=function(rng,max)step('randomInt',rng,max);rng.counter=rng.counter+1;return max end,
})
require=function(name)step('require',name);return realRequire(name)end
local queue={
 pushTop=function(s,item)step('top',item);table.insert(s.queue,1,item)end,
 pushBottom=function(s,item)step('bottom',item);s.queue[#s.queue+1]=item end,
}
local combat={
 draw=function(s,n)step('draw',n);s.drawnCount=n;for _,c in ipairs(s.drawn)do s.hand[#s.hand+1]=c end;return s.drawn end,
 cardDefinition=function(_,c)step('definition',c);return {cost=c.cost}end,
 combatBaseCost=function(_,c)step('baseCost',c);return c.cost end,
}
local function state()
 local c={cardId='genetic_algorithm',uuid='logical',uid=1,deckUid=71,misc=1,cost=0}
 local twin={cardId='genetic_algorithm',uuid='logical',uid=2,misc=4,cost=1}
 local s={player={id='player',statuses={}},hand={c},draw={twin},discard={{uid=3,cost=0},{uid=4,cost=2,freeToPlayOnce=true},{uid=5,cost=1},{uid=3,cost=0}},
 exhaust={c},limbo={twin},queuedCards={{card=c},{card=twin}},cardActions={{instance=twin}},cardInUse=c,
 masterDeck={{uid=71,cardId='genetic_algorithm',misc=5}},orbs={slots=3,balls={{kind='dark',stored=25},{kind='frost'}}},
 rules={player={maxHand=4}},queue={},events={},nextUid=5,shuffleRng={counter=0},cardRandomRng={counter=0},
 drawn={{uid=6,cost=0},{uid=7,cost=1},{uid=8,cost=-1,freeToPlayOnce=true},{uid=9,cost=2}}}
 s.self=s;s.alias=c;return s
end
local cases={
 {'generate',{cardId='force_field'}},{'white_noise',{cardId='force_field'}},
 {'generate',{cardId='force_field'},function(s)s.player.statuses.corruption=1;s.rules.player.maxHand=1 end},
 {'generate',{}},{'power',{status='rebound',value=1}},{'power',{status='rebound',value=1},function(s)s.player.statuses.rebound=2 end},
 {'power',{status='buffer',value=2}},{'genetic',{value=2}},{'genetic',{value=3},function(s)s.cardInUse.deckUid=nil end},
 {'genetic',{value=2},function(s)s.draw[1].cardId='wrong'end},
 {'genetic',{value=2},function(s)s.cardInUse.misc=2147483647 end},
 {'genetic',{value=2},function(s)s.masterDeck[1].misc=2147483647 end},
 {'genetic',{value=2},function(s)s.masterDeck=nil end},
 {'recursion',{}},{'recursion',{},function(s)s.orbs.balls={}end},{'recursion',{},function(s)s.orbs=nil end},
 {'rechannel',{},function(s,e)e.ball=s.orbs.balls[1]end},{'recycle',{}},{'scrape',{value=4}},
 {'all_for_one',{}},{'all_for_one',{},function(s)s.discard[1].combatCost=2;s.discard[3].combatCost=0 end},
 {'discard_to_hand',{uid=3}},{'discard_to_hand',{uid=3},function(s)s.rules.player.maxHand=1 end},{'discard_to_hand',{uid=99}},
 {'fission',{value=0}},{'fission',{value=1}},{'fission',{value=1},function(s)s.orbs.balls={};s.orbs.slots=0 end},
 {'reboot',{value=4}},{'reboot',{value=6},function(s)s.hand={};s.discard={}end},{'reboot',{value=4},function(s)s.cardRandomRng=nil end},
 {'unsupported',{}},
}
local function deepProxy(root)
 local seen,backings={},{};local wrap
 wrap=function(value)
  if type(value)~='table'then return value end;if seen[value]then return seen[value]end
  local id=#backings+1;local out={};seen[value]=out;backings[id]={proxy=out,backing=value}
  setmetatable(out,{__index=function(_,key)step('read:'..id,key);return wrap(value[key])end,
   __newindex=function(_,key,v)step('write:'..id,key,v);value[key]=v end,
   __len=function()step('length:'..id);return #value end})
  return out
 end
 return wrap(root),backings
end
local function run(index,at,observable)
 local case=cases[index];local s=state();local e={action=case[1]};for k,v in pairs(case[2])do e[k]=v end
 if case[3]then case[3](s,e)end
 trace={};steps=0;failAt=nil
 local held={};for _,name in ipairs({'hand','draw','discard','exhaust','limbo','masterDeck'})do local pile=s[name];held[name]={pile=pile};for i,c in ipairs(pile or {})do held[name][i]=c end end
 local backings;if observable then local roots;roots,backings=deepProxy({state=s,effect=e,combat=combat,queue=queue});s,e=roots.state,roots.effect;combat,queue=roots.combat,roots.queue end
 trace={};steps=0;failAt=at
 local result=table.pack(pcall(execute,combat,s,e,queue));failAt=nil;local completed=steps
 if at then assert(not result[1]and result[2]==sentinel,'injected error identity')end
 if not at and not observable and result[1]then
  if e.action=='recycle'then assert(result.n==4 and result[2]==false and result[3]=='choice-return'and result[4]==s,'recycle return tuple')
  else assert(result.n==2 and result[2]==true,'execute true return')end
  if e.action=='generate'or e.action=='white_noise'then assert(s.fresh.created==2,'double created hooks');assert((s.fresh.costForTurn==0)==(e.action=='white_noise'),'white noise cost')end
  if e.action=='power'and e.status=='rebound'then assert((s.reboundJustEvoked==true)==(s.player.statuses.rebound==1),'rebound first application')end
  if e.action=='recursion'and #s.orbs.balls>0 then assert(s.queue[1].effect.op=='evokeOrb'and s.queue[2].effect.ball==s.orbs.balls[1],'recursion queue identity')end
  if e.action=='scrape'then assert(#s.queue==2 and s.queue[1].effect.uid==7 and s.queue[2].effect.uid==9,'scrape queue ordering')end
  if e.action=='discard_to_hand'and e.uid==3 and s.rules.player.maxHand>1 then assert(#s.discard==3 and s.hand[2].uid==3 and s.discard[3].uid==3,'first discard match')end
  if e.action=='fission'then assert(s.queue[#s.queue].effect.op=='draw'and s.queue[#s.queue-1].effect.op=='energy','fission reward order');if e.value==1 then assert(#s.queue==s.orbs.slots+2,'fission slot count')else assert(#s.orbs.balls==0,'fission removes balls')end end
  if e.action=='reboot'then assert(#s.hand==0 and #s.discard==0 and s.shuffleRng.counter==2,'reboot shuffle streams')end
 end
 local observed=result
 if not result[1]and type(result[2])=='string'then observed=table.pack(table.unpack(result,1,result.n));observed[2]=DEFECT_EXECUTE_ERROR(result[2])end
 DEFECT_EXECUTE_GRAPH_WRITE({state=s,effect=e,held=held,backings=backings,trace=trace,returned=observed,sentinel=sentinel},'edge:'..index..':'..tostring(at)..':'..tostring(observable))
 return completed
end
for i=1,#cases do local count=run(i);for at=1,count do run(i,at)end end
-- Proxy all state/effect/module boundaries separately; reset captured adapters
-- after each run, since proxy shells must never leak into the next case.
local realCombat,realQueue=combat,queue
for i=1,#cases do
 combat,queue=realCombat,realQueue;local count=run(i,nil,true)
 for at=1,count do combat,queue=realCombat,realQueue;run(i,at,true)end
end
combat,queue=realCombat,realQueue
print('DEFECT_EXECUTE_EDGES complete actions and every callback/metatable failure boundary')

-- Hook slots remain dynamic even though the actions module itself is cached.
do
 local s=state();trace={};steps=0;failAt=nil
 local first,hand=actions.created,actions.toHand
 actions.created=function(_,current,c)
  step('first dynamic hook',c);c.created=1
  actions.created=function(_,again,same)step('second dynamic hook',same);assert(again==current and same==c);same.created=9 end
  actions.toHand=function(current,card)step('dynamic hand',card);current.hand[#current.hand+1]=card;current.dynamicHand=card end
 end
 local result=table.pack(pcall(execute,combat,s,{action='generate',cardId='force_field'},queue))
 actions.created,actions.toHand=first,hand
 assert(result[1]and s.fresh.created==9 and s.dynamicHand==s.fresh,'dynamic created and toHand slots')
 DEFECT_EXECUTE_GRAPH_WRITE({state=s,trace=trace,returned=result},'dynamic-actions')
end
local realTostring=tostring
local unknown={false,7,0/0,setmetatable({},{__tostring=function()return 'table-action'end}),function()end}
for i=0,#unknown do
 local action=unknown[i];local s=state();trace={};steps=0
 tostring=function(v)if type(v)=='function'and v==action then return 'function-action'end;return realTostring(v)end
 local result=table.pack(pcall(execute,combat,s,{action=action},queue))
 assert(not result[1]and result[2]:find('unknown final Defect action: '..tostring(action),1,true),'unknown action error')
 result[2]=DEFECT_EXECUTE_ERROR(result[2]);DEFECT_EXECUTE_GRAPH_WRITE({state=s,action=action,returned=result,trace=trace},'unknown:'..i)
 tostring=realTostring
end
-- Combat, queue and RNG callbacks can replace later public slots mid-action.
do
 local s=state();trace={};steps=0;local draw,definition=combat.draw,combat.cardDefinition
 combat.draw=function(current,n)
  step('dynamic draw',n);combat.cardDefinition=function(_,c)step('dynamic definition',c);return {cost=0}end
  return current.drawn
 end
 local result=table.pack(pcall(execute,combat,s,{action='scrape',value=4},queue))
 combat.draw,combat.cardDefinition=draw,definition
 assert(result[1]and #s.queue==0,'dynamic combat definition')
 DEFECT_EXECUTE_GRAPH_WRITE({state=s,trace=trace,returned=result},'dynamic-combat')
end
do
 local s=state();trace={};steps=0;local top=queue.pushTop
 queue.pushTop=function(current,item)
  top(current,item);queue.pushTop=function(again,nextItem)step('dynamic top',nextItem);again.nextQueued=nextItem end
 end
 local result=table.pack(pcall(execute,combat,s,{action='recursion'},queue));queue.pushTop=top
 assert(result[1]and #s.queue==1 and s.nextQueued.effect.op=='evokeOrb','dynamic queue slot')
 DEFECT_EXECUTE_GRAPH_WRITE({state=s,trace=trace,returned=result},'dynamic-queue')
end
do
 local random=realRequire('abyss_sts_random');local shuffle,integer=random.shuffle,random.randomInt
 local s=state();trace={};steps=0
 random.shuffle=function(rng,pile)
  shuffle(rng,pile)
  random.randomInt=function(r,max)step('dynamic random',r,max);r.counter=r.counter+3;return 0 end
  random.shuffle=function(r,p)step('dynamic shuffle',r,p);r.counter=r.counter+7 end
 end
 local result=table.pack(pcall(execute,combat,s,{action='reboot',value=4},queue))
 random.shuffle,random.randomInt=shuffle,integer
 assert(result[1]and s.shuffleRng.counter==8 and s.cardRandomRng.counter==3,'dynamic RNG slots')
 DEFECT_EXECUTE_GRAPH_WRITE({state=s,trace=trace,returned=result},'dynamic-rng')
end
