package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local Paid=require('abyss_ganyu_paid_cards');local Conditional=require('abyss_ganyu_conditional_card')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh()
 local d=C.copy(D);for _,v in ipairs(Paid.conditionalDefinitions().cards)do d.cards.cards[#d.cards.cards+1]=v end
 local s=C.new(d,{deck={'ganyu_lab_17','defend','defend','defend'},enemies={'jaw_worm','jaw_worm'},seed=42,candidateLifecycle={kind='ganyu',relicEnabled=false}})
 local c;for _,v in ipairs(s.hand)do if v.cardId=='ganyu_lab_17'then c=v end end
 s.ganyuResource.charge=2;for _,e in ipairs(s.enemies)do e.hp=100;e.block=0 end;return s,assert(c)
end
-- Capture consumption/native hit failure restores the prepayment public graph.
do
 local s,c=fresh();local before=C.copy(s);local r=s.ganyuResource;local hand=s.hand;local damage=C.damage;local hit=false
 C.damage=function(...)local v=damage(...);hit=true;error('post conditional damage')end
 eq(pcall(C.play,s,c.uid,1),false);C.damage=damage;assert(hit);same(s,before);eq(s.ganyuResource,r);eq(s.hand,hand);assert(C.play(s,c.uid,1));eq(s.enemies[1].hp,78)
end
-- Reveal creates a paid continuation boundary; execution uses live resource but frozen modifiers.
do
 local s,c=fresh();s.draw[#s.draw+1]=table.remove(s.hand,#s.hand);assert(s.hand[1]~=nil)
 local dispatch=Paid.dispatch;local once=false
 Paid.dispatch=function(combat,state,e,q)if not once then once=true;q.pushTop(state,{kind='effect',effect=e});q.pushTop(state,{kind='effect',effect={op='scry',value=1}});return true end;return dispatch(combat,state,e,q)end
 assert(C.play(s,c.uid,1));Paid.dispatch=dispatch;local p=assert(s.pendingScry);eq(s.energy,1);eq(s.ganyuResource.charge,2)
 s.player.statuses.strength=50;s.ganyuResource.charge=1
 local before=C.copy(s);local r=s.ganyuResource;local q=s.actionQueue;local pending=s.pendingPlay;local apply=Conditional.dispatch
 Conditional.dispatch=function(...)apply(...);error('conditional resume fault')end
 eq(pcall(C.chooseScry,s,{},p.token),false);Conditional.dispatch=apply;same(s,before);eq(s.ganyuResource,r);eq(s.actionQueue,q);eq(s.pendingPlay,pending);eq(s.pendingScry,p)
 assert(C.chooseScry(s,{},p.token));eq(s.enemies[1].hp,92);eq(s.ganyuResource.charge,1);eq(s.energy,1)
 before=C.copy(s);eq(C.chooseScry(s,{},p.token),false);same(s,before)
end
local A=require('abyss_card_actions')
for _,mode in ipairs({'normal','unmarked','silentFinalCard','runNativeABI','extra','wrongFace'})do
 local s,c=fresh();local d=s.catalog.cards[c.cardId]
 if mode=='unmarked'then d.ganyuCandidate=nil elseif mode=='extra'then d.effects[1].fixed=true elseif mode=='wrongFace'then d.effects=d.upgrade.effects elseif mode~='normal'then d[mode]=true end
 for i,v in ipairs(s.hand)do if v==c then table.remove(s.hand,i);break end end
 C.queueCard(s,c,{targetIndex=1,exhaustCards=false});A.drain(C,s);eq(s.energy,3)
 eq(s.enemies[1].hp,mode=='normal'and 78 or 100);eq(s.ganyuResource.charge,mode=='normal'and 0 or 2)
end
for _,bad in ipairs({'false',1,0,{}})do
 local s,c=fresh();c.upgraded=bad;local before=C.copy(s);eq(C.canPlay(s,c.uid,1),false);eq(C.play(s,c.uid,1),false);same(s,before)
 for i,v in ipairs(s.hand)do if v==c then table.remove(s.hand,i);break end end
 C.queueCard(s,c,{targetIndex=1,exhaustCards=false});A.drain(C,s);eq(s.energy,3);eq(s.enemies[1].hp,100);eq(s.ganyuResource.charge,2)
end
print('GANYU_CONDITIONAL_TRANSACTION_PASS')
