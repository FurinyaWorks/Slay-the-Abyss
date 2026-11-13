package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Paid=require('abyss_ganyu_paid_cards');local Storm=require('abyss_ganyu_storm_card');local A=require('abyss_card_actions')
local ids={'ganyu_lab_18','ganyu_lab_31','ganyu_lab_59'}
local function fresh(id,up)
 local d=C.copy(D);for _,v in ipairs(Paid.stormFamilyDefinitions().cards)do d.cards.cards[#d.cards.cards+1]=v end
 local s=C.new(d,{deck={id,'defend','defend','defend','defend','defend'},enemies={'cultist'},seed=42,candidateLifecycle={kind='ganyu',relicEnabled=false}})
 local card;for _,pile in ipairs({s.hand,s.draw})do for i,v in ipairs(pile)do if v.cardId==id then card=table.remove(pile,i);break end end;if card then break end end;s.hand[#s.hand+1]=assert(card);card.upgraded=up
 return s,card
end
for _,id in ipairs(ids)do for _,up in ipairs({false,true})do
 local s,c=fresh(id,up);local before=C.copy(s);local res,hand=s.ganyuResource,s.hand;local old=Storm.dispatch;local reached=false
 Storm.dispatch=function(...)local v=old(...);reached=true;error('actual family installation fault')end
 assert(not pcall(C.play,s,c.uid));Storm.dispatch=old;assert(reached);same(s,before);assert(s.ganyuResource==res and s.hand==hand);assert(C.play(s,c.uid))
 s,c=fresh(id,up);local dispatch=Paid.dispatch;local once=false
 Paid.dispatch=function(combat,state,e,q)if not once then once=true;q.pushTop(state,{kind='effect',effect=e});q.pushTop(state,{kind='effect',effect={op='scry',value=1}});return true end;return dispatch(combat,state,e,q)end
 assert(C.play(s,c.uid));Paid.dispatch=dispatch;local p=assert(s.pendingScry);eq(s.ganyuResource.storm,nil)
 s.ganyuResource.storm={amount=9,turns=1};before=C.copy(s);res=s.ganyuResource;local pending,queue=s.pendingPlay,s.actionQueue
 Storm.dispatch=function(...)old(...);error('family resumed actual refresh')end
 assert(not pcall(C.chooseScry,s,{},p.token));Storm.dispatch=old;same(s,before);assert(s.ganyuResource==res and s.pendingScry==p and s.pendingPlay==pending and s.actionQueue==queue)
 assert(C.chooseScry(s,{},p.token));eq(s.ganyuResource.storm.amount,9);eq(s.ganyuResource.storm.turns,id=='ganyu_lab_59'and 2 or 3)
 before=C.copy(s);eq(C.chooseScry(s,{},p.token),false);same(s,before)
 for _,mode in ipairs({'normal','unmarked','native','badFace','extra','badFlag'})do
  s,c=fresh(id,up);local d=s.catalog.cards[id]
  if mode=='unmarked'then d.ganyuCandidate=nil elseif mode=='native'then d.runNativeABI=true elseif mode=='badFace'then c.upgraded='false'elseif mode=='extra'then d.effects[1].fixed=true;d.upgrade.effects[1].fixed=true elseif mode=='badFlag'then if id=='ganyu_lab_59'then d.selfRetain=false else d.exhaust=not d.exhaust end end
  if mode~='normal'then local b=C.copy(s);eq(C.play(s,c.uid),false);same(s,b)end
  for i,v in ipairs(s.hand)do if v==c then table.remove(s.hand,i);break end end
  C.queueCard(s,c,{exhaustCards=false});A.drain(C,s);eq(s.energy,3);eq(s.ganyuResource.storm~=nil,mode=='normal')
 end
end end
-- A newly supported numerical storm shape does not authorize another card ID.
do local s,c=fresh('ganyu_lab_31',false);local d=s.catalog.cards[c.cardId];s.catalog.cards.foreign=C.copy(d);s.catalog.cards.foreign.id='foreign';c.cardId='foreign';local b=C.copy(s);eq(C.play(s,c.uid),false);same(s,b)end
-- Exhaust hooks occur through native UseCard; their post-draw fault is transactional.
for _,up in ipairs({false,true})do
 local s,c=fresh('ganyu_lab_31',up);s.player.statuses.dark_embrace=1;s.player.statuses.feel_no_pain=3;local X=require('abyss_exhaust');X.rememberPower(s,'feel_no_pain');X.rememberPower(s,'dark_embrace')
 local b=C.copy(s);local hand,draw,rng=s.hand,s.draw,s.rng;local native=C.draw;local reached=false
 C.draw=function(...)native(...);reached=true;error('after native exhaust draw')end
 assert(not pcall(C.play,s,c.uid));C.draw=native;assert(reached);same(s,b);assert(s.hand==hand and s.draw==draw and s.rng==rng);assert(C.play(s,c.uid));eq(s.player.block,3);eq(s.exhaust[#s.exhaust],c)
end
print('GANYU_STORM_FAMILY_TRANSACTION_PASS six installs/Scry/live refresh; 36 auto; native exhaust hooks rollback')
