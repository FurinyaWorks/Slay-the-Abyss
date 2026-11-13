package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Paid=require('abyss_ganyu_paid_cards');local Retrieve=require('abyss_ganyu_retrieval_card');local A=require('abyss_card_actions')
local ids={'ganyu_lab_10','ganyu_lab_25','ganyu_lab_39','ganyu_lab_48'}
local function fresh(id,up)
 local d=C.copy(D);for _,v in ipairs(require('abyss_ganyu_reward_catalog').definitions(true,true))do d.cards.cards[#d.cards.cards+1]=v end
 local target=id=='ganyu_lab_39'and 'ganyu_lab_05'or id=='ganyu_lab_48'and 'ganyu_lab_06'or 'ganyu_lab_03'
 local s=C.new(d,{deck={{cardId=id,upgraded=up},target,{cardId=target,upgraded=true},'defend','defend','defend','defend','defend','defend','defend','defend'},enemies={'cultist'},seed=42,candidateLifecycle={kind='ganyu',relicEnabled=false}})
 local card,matches,others=nil,{},{}
 for _,pile in ipairs({s.hand,s.draw})do for _,v in ipairs(pile)do if v.cardId==id then card=v elseif v.cardId==target then matches[#matches+1]=v else others[#others+1]=v end end end
 s.hand={assert(card),table.remove(others)};s.draw=others;s.discard={};local zone=id=='ganyu_lab_25'and s.discard or s.draw
 zone[#zone+1]=matches[1];zone[#zone+1]=matches[2]
 return s,card,matches[1],zone
end
for _,id in ipairs(ids)do for _,up in ipairs({false,true})do
 local s,c,target,zone=fresh(id,up);s.player.noDraw=true;local rng=C.copy(s.rng);local charge=s.ganyuResource.charge
 local nativeDraw=C.draw;C.draw=function()error('retrieval must not call draw')end
 assert(C.play(s,c.uid));C.draw=nativeDraw;eq(s.energy,up and 3 or 2);eq(s.hand[#s.hand],target);same(s.rng,rng);eq(s.ganyuResource.charge,charge)
 eq((id=='ganyu_lab_10'and s.discard or s.exhaust)[1],c)
 local b=C.copy(s);eq(C.play(s,c.uid),false);same(s,b)
 -- Post-native toHand failure restores actual card and original graph references.
 s,c,target,zone=fresh(id,up);b=C.copy(s);local hand,draw,discard=s.hand,s.draw,s.discard;local old=A.toHand;local reached=false
 A.toHand=function(...)old(...);reached=true;error('after actual retrieval')end
 assert(not pcall(C.play,s,c.uid));A.toHand=old;assert(reached);same(s,b);assert(s.hand==hand and s.draw==draw and s.discard==discard);assert(C.play(s,c.uid))
 -- Real Scry continuation and failed resume preserve revealed state and one payment.
 s,c,target,zone=fresh(id,up);local dispatch=Paid.dispatch;local once=false
 Paid.dispatch=function(combat,state,e,q)if not once then once=true;q.pushTop(state,{kind='effect',effect=e});q.pushTop(state,{kind='effect',effect={op='scry',value=1}});return true end;return dispatch(combat,state,e,q)end
 assert(C.play(s,c.uid));Paid.dispatch=dispatch;local p=assert(s.pendingScry);b=C.copy(s);local pending,queue=s.pendingPlay,s.actionQueue;local apply=Retrieve.dispatch
 Retrieve.dispatch=function(...)apply(...);error('resumed retrieval fault')end
 assert(not pcall(C.chooseScry,s,{},p.token));Retrieve.dispatch=apply;same(s,b);assert(s.pendingScry==p and s.pendingPlay==pending and s.actionQueue==queue)
 assert(C.chooseScry(s,{},p.token));eq(s.energy,up and 3 or 2);b=C.copy(s);eq(C.chooseScry(s,{},p.token),false);same(s,b)
 for _,mode in ipairs({'normal','unmarked','native','badFace','extra','badExhaust'})do
  s,c=fresh(id,up);local d=s.catalog.cards[id]
  if mode=='unmarked'then d.ganyuCandidate=nil elseif mode=='native'then d.runNativeABI=true elseif mode=='badFace'then c.upgraded='false'elseif mode=='extra'then d.effects[1].uid=99;d.upgrade.effects[1].uid=99 elseif mode=='badExhaust'then d.exhaust=not d.exhaust end
  if mode~='normal'then b=C.copy(s);eq(C.play(s,c.uid),false);same(s,b)end
  for i,v in ipairs(s.hand)do if v==c then table.remove(s.hand,i);break end end
  local n=#s.hand;C.queueCard(s,c,{exhaustCards=false});A.drain(C,s);eq(s.energy,3);eq(#s.hand,n+(mode=='normal'and 1 or 0))
 end
end end
-- Execution-time hand capacity is rechecked after a real revealed pause.
for _,id in ipairs(ids)do
 local s,c,target,zone=fresh(id,false);local dispatch=Paid.dispatch;local once=false
 Paid.dispatch=function(combat,state,e,q)if not once then once=true;q.pushTop(state,{kind='effect',effect=e});q.pushTop(state,{kind='effect',effect={op='scry',value=1}});return true end;return dispatch(combat,state,e,q)end
 assert(C.play(s,c.uid));Paid.dispatch=dispatch;local p=assert(s.pendingScry)
 -- Controlled additional native instance supplies enough capacity pressure, not a reward claim.
 local max=0;for _,pile in ipairs({s.hand,s.draw,s.discard,s.exhaust})do for _,v in ipairs(pile)do max=math.max(max,v.uid)end end;max=math.max(max,c.uid)
 while #s.hand<10 do max=max+1;s.hand[#s.hand+1]={uid=max,cardId='defend',upgraded=false}end
 local original=C.copy(zone);assert(C.chooseScry(s,{},p.token));eq(#s.hand,10)
 -- For discard retrieval the source is exhausted, so both search zones remain unchanged.
 same(zone,original);eq(s.energy,2)
end
print('GANYU_RETRIEVAL_TRANSACTION_PASS 8 identity/noDraw/native fault/Scry and 48 auto gates')
