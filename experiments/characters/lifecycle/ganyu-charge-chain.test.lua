package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local Paid=require('abyss_ganyu_paid_cards')
local defs=Paid.chargeChainDefinitions().cards
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh(def,up,charge,mode)
 local d=C.copy(D);for _,v in ipairs(defs)do d.cards.cards[#d.cards.cards+1]=C.copy(v)end
 local deck={};for i=1,20 do deck[i]=def.id end
 local s=C.new(d,{deck=deck,enemies={'jaw_worm'},seed=42,candidateLifecycle={kind='ganyu',relicEnabled=false}})
 local c=s.hand[1];c.upgraded=up;s.ganyuResource.charge=charge
 if mode=='full'then C.draw(s,5)elseif mode=='empty'then for i=#s.draw,1,-1 do s.exhaust[#s.exhaust+1]=table.remove(s.draw,i)end elseif mode=='noDraw'then s.player.noDraw=true elseif mode=='shuffle'then for i=#s.draw,1,-1 do s.discard[#s.discard+1]=table.remove(s.draw,i)end end
 s.player.statuses.feel_no_pain=3;s.exhaustPowerOrder={'feel_no_pain'}
 return s,c
end
local expected={ganyu_lab_20={2,false,2,3,1,1},ganyu_lab_60={1,true,1,1,1,2},ganyu_lab_23={0,true,0,0,2,2}}
for _,d in ipairs(defs)do local x=assert(expected[d.id]);eq(d.cost,x[1]);eq(d.upgrade.cost,x[1]);eq(d.exhaust,x[2]);eq(d.rarity,'uncommon')
 for index,effects in ipairs({d.effects,d.upgrade.effects})do local draw,charge=0,0;for _,e in ipairs(effects)do if e.op=='draw'then draw=e.value elseif e.op=='ganyuCard'then charge=e.amount end end;eq(draw,x[index+2]);eq(charge,x[index+4])end
end
local count=0
for _,def in ipairs(defs)do for _,up in ipairs({false,true})do for charge=0,2 do for _,mode in ipairs({'normal','full','empty','noDraw','shuffle'})do
 local s,c=fresh(def,up,charge,mode);local before=#s.hand;local e=up and def.upgrade.effects or def.effects
 local amount,draw,block=0,0,0;for _,v in ipairs(e)do if v.op=='ganyuCard'then amount=v.amount elseif v.op=='draw'then draw=v.value elseif v.op=='block'then block=v.value end end
 local oldDraw=C.draw;local called=false
 C.draw=function(st,n,...)if st==s then called=true;eq(st.ganyuResource.charge,def.id=='ganyu_lab_20'and charge or math.min(2,charge+amount))end;return oldDraw(st,n,...)end
 assert(C.play(s,c.uid));C.draw=oldDraw
 eq(s.ganyuResource.charge,math.min(2,charge+amount));eq(s.energy,3-def.cost)
 eq(s.player.block,block+(def.exhaust and 3 or 0));eq(s.pendingPlay,nil);eq(s.cardInUse,nil)
 local expectedDraw=(mode=='empty'or mode=='noDraw')and 0 or math.min(draw,11-before)
 eq(#s.hand,before-1+expectedDraw)
 local found=false;for _,v in ipairs(def.exhaust and s.exhaust or s.discard)do if v==c then found=true end end;assert(found)
 count=count+1
end end
 -- Exact source cost/amount/markers remain mandatory; rejection before payment.
 for _,mutate in ipairs({function(d)d.cost=99 end,function(d)d.effects[1].value=99 end,function(d)d.foreignMarker=true end,function(d)d.productionEnabled=true end})do
  local s,c=fresh(def,up,0,'normal');mutate(s.catalog.cards[def.id]);local before=C.copy(s);assert(not C.play(s,c.uid));same(s,before)
 end
 -- Failure after real charge dispatch restores the entire live state and aliases.
 local s,c=fresh(def,up,0,'normal');local saved=C.copy(s);local hand,res=s.hand,s.ganyuResource;local dispatch=Paid.dispatch;local reached=false
 Paid.dispatch=function(...)dispatch(...);reached=true;error('after charge stage')end
 assert(not pcall(C.play,s,c.uid));Paid.dispatch=dispatch;assert(reached);same(s,saved);eq(s.hand,hand);eq(s.hand[1],c);eq(s.ganyuResource,res);assert(C.play(s,c.uid))
 -- Genuine Scry pause immediately before charge; resume uses live charge and rollback.
 do local s,c=fresh(def,up,0,'normal');local dispatch=Paid.dispatch;local once=false
 Paid.dispatch=function(combat,state,e,q)if not once then once=true;q.pushTop(state,{kind='effect',effect=e});q.pushTop(state,{kind='effect',effect={op='scry',value=1}});return true end;return dispatch(combat,state,e,q)end
 assert(C.play(s,c.uid));Paid.dispatch=dispatch;local pending=assert(s.pendingScry);s.ganyuResource.charge=1
 local before=C.copy(s);local resource=s.ganyuResource;local paid=s.pendingPlay.ganyuPaid
 Paid.dispatch=function(...)dispatch(...);error('resumed charge fault')end
 assert(not pcall(C.chooseScry,s,{},pending.token));Paid.dispatch=dispatch;same(s,before);eq(s.ganyuResource,resource);eq(s.pendingPlay.ganyuPaid,paid)
 assert(C.chooseScry(s,{},pending.token));eq(s.ganyuResource.charge,2);eq(s.pendingPlay,nil)
 end
end end
print('CHARGE_CHAIN_PASS '..count..' real paid ordering/draw/exhaust cases; source guards and rollback')
