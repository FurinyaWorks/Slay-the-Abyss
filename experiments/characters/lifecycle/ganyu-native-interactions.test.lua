package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local defs=require('abyss_ganyu_native_cards').definitions()
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function fresh(id,up)
 local d=C.copy(D);for _,v in ipairs(defs.cards)do d.cards.cards[#d.cards.cards+1]=C.copy(v)end
 local deck={id};for i=1,19 do deck[#deck+1]='defend'end
 local s=C.new(d,{deck=deck,enemies={'jaw_worm','jaw_worm'},seed=42,candidateLifecycle={kind='ganyu',relicEnabled=false}});local card
 for _,pile in ipairs({s.hand,s.draw})do for i,c in ipairs(pile)do if c.cardId==id then card=c;table.remove(pile,i);break end end;if card then break end end
 for _,c in ipairs(s.hand)do s.draw[#s.draw+1]=c end;s.hand={card};card.upgraded=up
 for _,e in ipairs(s.enemies)do e.hp=100;e.maxHp=100;e.block=0 end
 return s,card
end
local n=0
for _,up in ipairs({false,true})do
 -- Formal damage modifiers apply to each printed hit, unlike numeric research model.
 local s,c=fresh('ganyu_lab_21',up);s.player.statuses.strength=2;s.player.statuses.weak=1
 assert(C.play(s,c.uid));local value=math.floor(((up and 14 or 10)+2)*0.75)
 eq(s.enemies[1].hp,100-value);eq(s.enemies[2].hp,100-value);n=n+1
 local b,d=fresh('ganyu_lab_02',up);b.player.statuses.dexterity=2;b.player.statuses.frail=1
 assert(C.play(b,d.uid));eq(b.player.block,math.floor(((up and 8 or 5)+2)*0.75));n=n+1
 -- Exhaust callbacks use formal schedule and must not fire twice for one UID.
 local x,y=fresh('ganyu_lab_55',up);x.player.statuses.feel_no_pain=3;x.player.statuses.dark_embrace=1
 require('abyss_exhaust').rememberPower(x,'feel_no_pain');require('abyss_exhaust').rememberPower(x,'dark_embrace')
 assert(C.play(x,y.uid));eq(x.player.block,(up and 3 or 1)+3);eq(#x.hand,2);eq(#x.exhaust,1);eq(x.exhaust[1],y)
 eq(C.play(x,y.uid),false);eq(x.player.block,(up and 3 or 1)+3);eq(#x.hand,2);n=n+1
 -- Draw prevention does not cancel printed defense, payment or exhaust.
 local a,z=fresh('ganyu_lab_55',up);a.player.noDraw=true
 assert(C.play(a,z.uid));eq(a.player.block,up and 3 or 1);eq(#a.hand,0);eq(#a.exhaust,1);n=n+1
end
print('PASS '..n..' public C.play modifier/exhaust-hook/draw-prevention base-up integrations')
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
for _,up in ipairs({false,true})do
 local s,c=fresh('ganyu_lab_55',up);s.player.statuses.feel_no_pain=3;s.player.statuses.dark_embrace=1;require('abyss_exhaust').rememberPower(s,'feel_no_pain');require('abyss_exhaust').rememberPower(s,'dark_embrace')
 local before=C.copy(s);local hand=s.hand;local exhausted=s.exhaust;local draw=C.draw;local calls=0
 C.draw=function(state,amount,...)
  local result=draw(state,amount,...);calls=calls+1
  if calls==2 then error('after exhaust-triggered draw')end
  return result
 end
 local called,ok=pcall(C.play,s,c.uid);C.draw=draw
 assert(not called or ok==false);eq(calls,2);same(s,before);eq(s.hand,hand);eq(s.exhaust,exhausted);eq(s.hand[1],c)
 assert(C.play(s,c.uid));eq(s.player.block,(up and 3 or 1)+3);eq(#s.exhaust,1);eq(#s.hand,2)
end
print('PASS 2 real public-play exhaust-hook failure full-state/alias rollback and retry cases')
