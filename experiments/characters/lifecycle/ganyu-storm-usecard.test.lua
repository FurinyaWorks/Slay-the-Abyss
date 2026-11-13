-- Actual opt-in public storm payment and lifecycle acceptance.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh(up,relic)
 local d=C.copy(D)
 if GANYU_STORM_DEFINITIONS then
  for _,definition in ipairs(dofile(GANYU_STORM_DEFINITIONS).cards)do d.cards.cards[#d.cards.cards+1]=definition end
 else
 d.cards.cards[#d.cards.cards+1]={id='ganyu_lab_05',name='storm candidate fixture',type='skill',target='SELF',cost=2,rarity='rare',experimental=true,ganyuCandidate=true,
 effects={{op='ganyuStorm',amount=4,turns=2}},upgrade={effects={{op='ganyuStorm',amount=6,turns=2}}}}
 end
 local s=C.new(d,{deck={'ganyu_lab_05','ganyu_lab_05','ganyu_lab_05'},enemies={'jaw_worm'},seed=42,candidateLifecycle={kind='ganyu',relicEnabled=relic==true}})
 s.hand[1].upgraded=up;s.enemies[1].hp=100;s.enemies[1].maxHp=100;s.enemies[1].block=0
 return s,s.hand[1]
end
for _,up in ipairs({false,true})do
 local s,c=fresh(up);local energy=s.energy;local amount=up and 6 or 4
 s.energy=1;local before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before);s.energy=energy
 assert(C.play(s,c.uid),'public storm is not wired; contract NOT passed')
 eq(s.energy,energy-2);eq(s.enemies[1].hp,100);eq(s.ganyuResource.storm.amount,amount);eq(s.ganyuResource.storm.turns,2)
 eq(s.discard[#s.discard],c);eq(s.cardInUse,nil);eq(s.pendingPlay,nil);eq(s.actionQueue,nil)
 before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before)
 assert(C.endTurn(s));eq(s.enemies[1].hp,100-amount);eq(s.ganyuResource.storm.turns,1)
 -- Existing native end-turn tests own enemy behavior. This verifies the next field tick explicitly.
 s.enemies[1].block=0;local hp=s.enemies[1].hp
 assert(C.endTurn(s));eq(s.enemies[1].hp,hp-amount);eq(s.ganyuResource.storm,nil)
end
print('PASS2 base/up public storm payment-to-owner-end lifecycle contracts')
local Storm=require('abyss_ganyu_storm_card');local Paid=require('abyss_ganyu_paid_cards')
-- The actual constructor relic option banks the remaining energy before this paid field ticks.
do
 local s,c=fresh(false,true);assert(C.play(s,c.uid));eq(s.energy,1);eq(s.ganyuResource.charge,0)
 assert(C.endTurn(s));eq(s.ganyuResource.charge,1);eq(s.ganyuResource.storm.turns,1);eq(s.enemies[1].hp,96)
end
-- Lower-strength actual refresh keeps the stronger field and refreshes duration.
do
 local s,c=fresh(true);assert(C.play(s,c.uid));assert(C.endTurn(s));eq(s.ganyuResource.storm.amount,6);eq(s.ganyuResource.storm.turns,1)
 local nextCard;for _,v in ipairs(s.hand)do if not v.upgraded then nextCard=v;break end end;assert(nextCard)
 local hp=s.enemies[1].hp;assert(C.play(s,nextCard.uid));eq(s.ganyuResource.storm.amount,6);eq(s.ganyuResource.storm.turns,2);eq(s.enemies[1].hp,hp)
 s.enemies[1].block=0;assert(C.endTurn(s));eq(s.enemies[1].hp,hp-6);eq(s.ganyuResource.storm.turns,1)
end
-- Paid setup fault rolls all the way back, including the original resource table alias.
do
 local s,c=fresh(false);local before=C.copy(s);local resource=s.ganyuResource;local hand=s.hand;local dispatch=Storm.dispatch;local hit=false
 Storm.dispatch=function(...)local result=dispatch(...);hit=true;error('after actual field installation')end
 eq(pcall(C.play,s,c.uid),false);Storm.dispatch=dispatch;assert(hit);same(s,before);eq(s.ganyuResource,resource);eq(s.hand,hand)
 assert(C.play(s,c.uid));eq(s.energy,1)
end
-- Real Scry choice between payment and setup owns its revealed rollback boundary.
do
 local s,c=fresh(true);for i=#s.hand,1,-1 do if s.hand[i]~=c then s.draw[#s.draw+1]=table.remove(s.hand,i);break end end
 local dispatch=Paid.dispatch;local once=false
 Paid.dispatch=function(combat,state,e,q)
  if not once then once=true;q.pushTop(state,{kind='effect',effect=e});q.pushTop(state,{kind='effect',effect={op='scry',value=1}});return true end
  return dispatch(combat,state,e,q)
 end
 assert(C.play(s,c.uid));Paid.dispatch=dispatch;local p=assert(s.pendingScry);eq(s.energy,1);eq(s.ganyuResource.storm,nil)
 local before=C.copy(s);local resource=s.ganyuResource;local q=s.actionQueue;local pending=s.pendingPlay;local storm=Storm.dispatch
 Storm.dispatch=function(...)storm(...);error('resumed field failure')end
 eq(pcall(C.chooseScry,s,{},p.token),false);Storm.dispatch=storm
 same(s,before);eq(s.ganyuResource,resource);eq(s.actionQueue,q);eq(s.pendingPlay,pending);eq(s.pendingScry,p)
 assert(C.chooseScry(s,{},p.token));eq(s.ganyuResource.storm.amount,6);eq(s.ganyuResource.storm.turns,2);eq(s.energy,1)
 local done=C.copy(s);eq(C.chooseScry(s,{},p.token),false);same(s,done)
end
local CardActions=require('abyss_card_actions')
for _,up in ipairs({false,true})do for _,mode in ipairs({'normal','unmarked','silentFinalCard','runNativeABI','extra'})do
 local s,c=fresh(up);local d=s.catalog.cards[c.cardId]
 if mode=='unmarked'then d.ganyuCandidate=nil elseif mode=='extra'then d.effects[1].uid=c.uid;d.upgrade.effects[1].uid=c.uid elseif mode~='normal'then d[mode]=true end
 for i,v in ipairs(s.hand)do if v==c then table.remove(s.hand,i);break end end
 local energy=s.energy;C.queueCard(s,c,{exhaustCards=false});CardActions.drain(C,s);eq(s.energy,energy)
 if mode=='normal'then eq(s.ganyuResource.storm.amount,up and 6 or 4);eq(s.ganyuResource.storm.turns,2)else eq(s.ganyuResource.storm,nil)end
end end
print('GANYU_STORM_TRANSACTION_PASS')
