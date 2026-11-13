package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local Paid=require('abyss_ganyu_paid_cards');local Draw=require('abyss_ganyu_draw_card');local A=require('abyss_card_actions')
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh(id,up)
 local d=C.copy(D);for _,v in ipairs(Paid.drawDefinitions().cards)do d.cards.cards[#d.cards.cards+1]=v end
 local deck={{cardId=id,upgraded=up}};for i=1,12 do deck[#deck+1]='defend'end
 local s=C.new(d,{deck=deck,enemies={'jaw_worm'},seed=42,candidateLifecycle={kind='ganyu',relicEnabled=false}})
 local card;for _,pile in ipairs({s.hand,s.draw})do for i,v in ipairs(pile)do if v.cardId==id then card=table.remove(pile,i);break end end;if card then break end end;s.hand[#s.hand+1]=assert(card)
 s.ganyuResource.charge=2;s.ganyuResource.storm={amount=4,turns=2};return s,card
end
for _,id in ipairs({'ganyu_lab_30','ganyu_lab_33','ganyu_lab_43'})do for _,up in ipairs({false,true})do
 local s,c=fresh(id,up);for i=#s.draw,1,-1 do s.discard[#s.discard+1]=table.remove(s.draw,i)end
 local before=C.copy(s);local hand,draw,discard,rng,r=s.hand,s.draw,s.discard,s.rng,s.ganyuResource
 local native=C.draw;local reached=false
 C.draw=function(...)local v=native(...);reached=true;error('draw after actual reshuffle')end
 eq(pcall(C.play,s,c.uid,1),false);C.draw=native;assert(reached);same(s,before)
 assert(s.hand==hand and s.draw==draw and s.discard==discard and s.rng==rng and s.ganyuResource==r);assert(C.play(s,c.uid,1))
 -- True revealed pause: resource remains live until resumed and failed resume cannot re-reveal.
 s,c=fresh(id,up);local dispatch=Paid.dispatch;local once=false
 Paid.dispatch=function(combat,state,e,q)if not once then once=true;q.pushTop(state,{kind='effect',effect=e});q.pushTop(state,{kind='effect',effect={op='scry',value=1}});return true end;return dispatch(combat,state,e,q)end
 assert(C.play(s,c.uid,1));Paid.dispatch=dispatch;local p=assert(s.pendingScry);local paidEnergy=s.energy
 s.ganyuResource.charge=1;local saved=C.copy(s);local pending,queue,resource=s.pendingPlay,s.actionQueue,s.ganyuResource;local apply=Draw.dispatch
 Draw.dispatch=function(...)apply(...);error('draw-stage resumed fault')end
 eq(pcall(C.chooseScry,s,{},p.token),false);Draw.dispatch=apply;same(s,saved);assert(s.pendingScry==p and s.pendingPlay==pending and s.actionQueue==queue and s.ganyuResource==resource)
 assert(C.chooseScry(s,{},p.token));eq(s.energy,paidEnergy);eq(s.ganyuResource.charge,id=='ganyu_lab_43'and 0 or 1)
 saved=C.copy(s);eq(C.chooseScry(s,{},p.token),false);same(s,saved)
 for _,mode in ipairs({'normal','unmarked','native','badFace','extra','badExhaust'})do
  s,c=fresh(id,up);local d=s.catalog.cards[id]
  if mode=='unmarked'then d.ganyuCandidate=nil elseif mode=='native'then d.runNativeABI=true elseif mode=='badFace'then c.upgraded='false' elseif mode=='extra'then d.effects[1].fixed=true;d.upgrade.effects[1].fixed=true elseif mode=='badExhaust'then d.exhaust=not d.exhaust end
  if mode~='normal'then local b=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,b)end
  for i,v in ipairs(s.hand)do if v==c then table.remove(s.hand,i);break end end
  C.queueCard(s,c,{targetIndex=1,exhaustCards=false});A.drain(C,s);eq(s.energy,3)
  eq(s.ganyuResource.charge,mode=='normal'and(id=='ganyu_lab_30'and 0 or id=='ganyu_lab_43'and 1 or 2)or 2)
 end
end end
-- Death before custom stage must not consume resource or draw (controlled interruption).
do
 local s,c=fresh('ganyu_lab_30',false);local prepare=Paid.prepare
 Paid.prepare=function(...)local effects=prepare(...);table.insert(effects,1,{op='loseHp',value=999});return effects end
 local old=#s.hand;assert(C.play(s,c.uid,1));Paid.prepare=prepare;eq(s.player.hp,0);eq(s.ganyuResource.charge,2);eq(#s.hand,old-1)
end
print('GANYU_DRAW_TRANSACTION_PASS six reshuffles/Scry/live resource/retry/36 auto/strict gate/death')
