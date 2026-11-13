package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Stage=require('abyss_zhongli_paid_cards');local Endpoint=require('abyss_zhongli_card_effects')
local Schedule=require('abyss_power_schedule');local CardActions=require('abyss_card_actions')
local cases={zl21={kind='installPillar',status='zl_candidate_pillar',base=3,up=4},zl31={kind='installRepair',status='zl_candidate_repair',base=2,up=3}}
local function fresh(id,up,enemies)
 local data=C.copy(D)
 for name,spec in pairs(cases)do data.cards.cards[#data.cards.cards+1]={id=name,name='HOLD '..name,type='power',cost=2,target='SELF',rarity='special',color='colorless',experimental=true,zhongliCandidate=true,
  effects={{op='zhongliCard',kind=spec.kind,value=spec.base}},upgrade={effects={{op='zhongliCard',kind=spec.kind,value=spec.up}}}}end
 local deck={};for i=1,8 do deck[i]={cardId=id,upgraded=up}end
 local s=C.new(data,{deck=deck,enemies=enemies or {'jaw_worm'},seed=11,candidateLifecycle={kind='zhongli',relicEnabled=false}})
 s.player.hp=100;s.player.maxHp=100;s.enemies[1].hp=100;s.enemies[1].maxHp=100
 return s
end
local function absent(s,card)
 for _,pile in ipairs({s.hand,s.draw,s.discard,s.exhaust})do for _,c in ipairs(pile)do assert(c~=card,'Power instance returned to a pile')end end
 eq(s.cardInUse,nil);eq(s.pendingPlay,nil)
end
for id,spec in pairs(cases)do for _,up in ipairs({false,true})do
 local s=fresh(id,up);local card=s.hand[1];local energy=s.energy;local before=C.copy(s)
 eq(C.play(s,999999),false);same(s,before)
 s.energy=1;before=C.copy(s);eq(C.play(s,card.uid),false);same(s,before);s.energy=energy
 assert(C.play(s,card.uid));eq(s.energy,energy-2);eq(s.player.statuses[spec.status],up and spec.up or spec.base)
 absent(s,card);eq(s.zhongliCandidate.jade,0)
 before=C.copy(s);eq(C.play(s,card.uid),false);same(s,before)
 -- Controlled refill for strongest-wins replay: real second paid Power uses a
 -- distinct hand UID and leaves only one scheduled Power, not two copies.
 s.energy=3;local second=s.hand[1];second.upgraded=not up
 assert(C.play(s,second.uid));eq(s.energy,1);eq(s.player.statuses[spec.status],spec.up);absent(s,second)
 local count=0;for _,row in ipairs(Schedule.list(s.player,{[spec.status]=true}))do if row.id==spec.status then count=count+1 end end
 eq(count,1)
end end
-- Public payment and installation fail atomically, retaining external aliases.
for id in pairs(cases)do
 local s=fresh(id,false);local card=s.hand[1];local resource=s.zhongliCandidate;local statuses=s.player.statuses;local hand=s.hand;local before=C.copy(s)
 local dispatch=Endpoint.dispatch
 Endpoint.dispatch=function(...)dispatch(...);error('after actual Power install')end
 eq(pcall(C.play,s,card.uid),false);Endpoint.dispatch=dispatch
 same(s,before);eq(s.zhongliCandidate,resource);eq(s.player.statuses,statuses);eq(s.hand,hand);eq(s.hand[1],card)
 assert(C.play(s,card.uid));absent(s,card)
end
-- Synthetic real selection between payment and installation, not a Power skill.
do
 local s=fresh('zl21',true);local c=s.hand[1];local energy=s.energy;local dispatch=Stage.dispatch;local once=false
 Stage.dispatch=function(combat,state,e,queue)
  if not once then once=true;queue.pushTop(state,{kind='effect',effect=e});queue.pushTop(state,{kind='effect',effect={op='scry',value=2}});return true end
  return dispatch(combat,state,e,queue)
 end
 assert(C.play(s,c.uid));Stage.dispatch=dispatch
 local pending=assert(s.pendingScry);local resource=s.zhongliCandidate;local paid=s.pendingPlay.zhongliPaid;local queue=s.actionQueue;local before=C.copy(s)
 eq(s.energy,energy-2);eq(s.player.statuses.zl_candidate_pillar,nil)
 local endpoint=Endpoint.dispatch;Endpoint.dispatch=function(...)endpoint(...);error('resumed install fault')end
 eq(pcall(C.chooseScry,s,{},pending.token),false);Endpoint.dispatch=endpoint
 same(s,before);eq(s.zhongliCandidate,resource);eq(s.pendingPlay.zhongliPaid,paid);eq(s.actionQueue,queue)
 assert(C.chooseScry(s,{},pending.token));eq(s.energy,energy-2);eq(s.player.statuses.zl_candidate_pillar,4);absent(s,c)
 local done=C.copy(s);eq(C.chooseScry(s,{},pending.token),false);same(s,done)
end
for id,spec in pairs(cases)do for _,up in ipairs({false,true})do
 local s=fresh(id,up);local c=table.remove(s.hand,1);local energy=s.energy
 C.queueCard(s,c,{exhaustCards=false});CardActions.drain(C,s)
 eq(s.energy,energy);eq(s.player.statuses[spec.status],up and spec.up or spec.base);absent(s,c)
end end
for _,field in ipairs({'silentFinalCard','runNativeABI','unmarked'})do
 local s=fresh('zl21',false);local c=table.remove(s.hand,1)
 if field=='unmarked'then s.catalog.cards.zl21.zhongliCandidate=nil else s.catalog.cards.zl21[field]=true end
 C.queueCard(s,c,{exhaustCards=false});CardActions.drain(C,s);eq(s.player.statuses.zl_candidate_pillar,nil)
end
for _,field in ipairs({'fixed','times','targetId'})do
 local s=fresh('zl21',false);s.catalog.cards.zl21.effects[1][field]=true
 local before=C.copy(s);local called,ok=pcall(C.play,s,s.hand[1].uid);assert(not called or not ok);same(s,before)
end
do
 local s=fresh('zl21',false,{'jaw_worm','jaw_worm'});local before=C.copy(s)
 eq(C.play(s,s.hand[1].uid),false);same(s,before)
 s=fresh('zl21',false);s.enemies[1].halfDead=true;before=C.copy(s);eq(C.play(s,s.hand[1].uid),false);same(s,before)
end
print('ZHONGLI_PAID_USECARD_PASS')
