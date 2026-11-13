-- PENDING new shared family source gate; actual C.play and native exhaust powers only.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local X=require('abyss_exhaust')
local defs=assert(GANYU_STORM_FAMILY_DEFINITIONS,'shared definitions object required')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local count=0
for _,def in ipairs(defs.cards)do for _,up in ipairs({false,true})do for _,noDraw in ipairs({false,true})do
 local d=C.copy(D);for _,v in ipairs(defs.cards)do d.cards.cards[#d.cards.cards+1]=C.copy(v)end
 local deck={{cardId=def.id,upgraded=up}};for i=1,19 do deck[#deck+1]='defend'end
 local s=C.new(d,{deck=deck,enemies={'jaw_worm'},seed=42,candidateLifecycle={kind='ganyu',relicEnabled=false}})
 local card;for _,pile in ipairs({s.hand,s.draw})do for i,c in ipairs(pile)do if c.cardId==def.id then card=table.remove(pile,i);break end end;if card then break end end;assert(card);s.hand[#s.hand+1]=card
 s.ganyuResource.charge=1;s.ganyuResource.storm={amount=9,turns=1};s.player.noDraw=noDraw
 s.player.statuses.feel_no_pain=3;s.player.statuses.dark_embrace=1;X.rememberPower(s,'feel_no_pain');X.rememberPower(s,'dark_embrace')
 local initial=#s.hand;local enemyHP=s.enemies[1].hp;local energy=s.energy;local id=def.id:sub(-2)
 assert(C.play(s,card.uid,1));eq(s.energy,energy-(id=='18'and 1 or 2));eq(s.enemies[1].hp,enemyHP)
 eq(s.ganyuResource.charge,1);eq(s.ganyuResource.storm.amount,9);eq(s.ganyuResource.storm.turns,id=='59'and 2 or 3)
 eq(#s.hand,initial-1+(id=='31'and not noDraw and 1 or 0));eq(s.player.block,id=='31'and 3 or 0)
 local destination=id=='31'and s.exhaust or s.discard;eq(destination[#destination],card);eq(s.pendingPlay,nil);eq(s.cardInUse,nil);count=count+1
end end end
print('PUBLIC_STORM_REFRESH_PASS '..count..' real payment/max-refresh/no immediate tick/charge preservation/native FNP-DE-NoDraw/disposal; controlled existing field')
