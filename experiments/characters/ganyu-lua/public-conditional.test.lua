-- Verified exact shared548629f host. No manual paid or resource dispatch.
-- The shared owner supplies its definitions factory result via GANYU_CONDITIONAL_DEFINITIONS.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data')
local defs=assert(GANYU_CONDITIONAL_DEFINITIONS,'shared factory definitions required')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local expected={['17']={8,14,11,17,2},['19']={5,8,7,10,1},['35']={2,5,3,7,1},['32']={3,6,4,8,1},['41']={3,5,4,7,1},['42']={3,6,4,8,1},['45']={4,4,6,5,1}}
local function fresh(def,up,charge,storm)
 local data=C.copy(D);for _,d in ipairs(defs.cards)do data.cards.cards[#data.cards.cards+1]=C.copy(d)end
 local s=C.new(data,{deck={{cardId=def.id,upgraded=up},'defend','defend','defend','defend'},enemies={'jaw_worm','jaw_worm'},seed=41,candidateLifecycle={kind='ganyu',relicEnabled=false}})
 local card;for _,c in ipairs(s.hand)do if c.cardId==def.id then card=c end end;assert(card)
 s.ganyuResource.charge=charge;s.ganyuResource.storm=storm and{amount=0,turns=2}or nil;s.player.statuses.strength=2;s.player.statuses.dexterity=2
 for _,e in ipairs(s.enemies)do e.hp=100;e.block=1 end;return s,card
end
local count=0;local definitionsSeen={}
for _,def in ipairs(defs.cards)do local id=def.id:sub(-2);assert(expected[id]and not definitionsSeen[id],'exact seven definitions required');definitionsSeen[id]=true
 for _,up in ipairs({false,true})do for charge=0,2 do for _,storm in ipairs({false,true})do
 local s,c=fresh(def,up,charge,storm);local v=expected[id];local base,bonus=up and v[3]or v[1],up and v[4]or v[2]
 local active=id=='32'and storm or(id=='41'or id=='42')and charge>=1 or id~='32'and id~='41'and id~='42'and charge==2
 local value=base+(active and bonus or 0);local remaining=charge;if(id=='17'or id=='19'or id=='35')and charge==2 then remaining=0 elseif(id=='41'or id=='42')and charge>=1 then remaining=charge-1 end
 assert(C.play(s,c.uid,1));eq(s.energy,3-v[5]);eq(s.ganyuResource.charge,remaining);eq(s.ganyuResource.storm and s.ganyuResource.storm.turns,storm and 2 or nil)
 local block=id=='19'or id=='32'or id=='42';eq(s.player.block,block and value+2 or 0);eq(s.enemies[1].hp,block and 100 or 99-value);eq(s.enemies[2].hp,id=='35'and 99-value or 100)
 eq(s.pendingPlay,nil);eq(s.cardInUse,nil);local found=false;for _,x in ipairs(s.discard)do if x==c then found=true end end;assert(found)
 local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before);count=count+1
 end end end
 for _,up in ipairs({false,true})do
 local s,c=fresh(def,up,2,true);s.energy=0;local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before)
 if def.target=='ENEMY'then s.energy=3;before=C.copy(s);eq(C.play(s,c.uid,99),false);same(s,before)end
 end
end
for id in pairs(expected)do assert(definitionsSeen[id])end
print('PUBLIC_CONDITIONAL_PASS '..count..' real paid source variants/resources/modifiers/discard/replay + payment/target refusals')
