-- PENDING shared admission of30/33/43; this contract is not yet host verification.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local X=require('abyss_exhaust')
local defs=assert(GANYU_DRAW_DEFINITIONS,'shared source-bound definitions required')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local expected={['30']={cost=1,base=1,bonus=2,upBonus=3},['33']={cost=0,base=1,bonus=1,upBonus=2,exhaust=true},['43']={cost=0,base=0,bonus=2,upBonus=3,exhaust=true}}
local function fresh(def,up,charge,storm,mode)
 local d=C.copy(D);for _,v in ipairs(defs.cards)do d.cards.cards[#d.cards.cards+1]=C.copy(v)end
 local deck={{cardId=def.id,upgraded=up}};for i=1,19 do deck[#deck+1]='defend'end
 local s=C.new(d,{deck=deck,enemies={'jaw_worm'},seed=41,candidateLifecycle={kind='ganyu',relicEnabled=false}})
 local card;for _,pile in ipairs({s.hand,s.draw})do for i,v in ipairs(pile)do if v.cardId==def.id then card=table.remove(pile,i);break end end;if card then break end end;assert(card);s.hand[#s.hand+1]=card
 s.ganyuResource.charge=charge;s.ganyuResource.storm=storm and{amount=4,turns=2}or nil
 if mode=='full'then C.draw(s,10-#s.hand)elseif mode=='empty'then for i=#s.draw,1,-1 do s.exhaust[#s.exhaust+1]=table.remove(s.draw,i)end elseif mode=='noDraw'then s.player.noDraw=true end
 s.player.statuses.feel_no_pain=3;s.player.statuses.dark_embrace=1;X.rememberPower(s,'feel_no_pain');X.rememberPower(s,'dark_embrace')
 return s,card
end
local count=0;local seen={}
for _,def in ipairs(defs.cards)do local id=def.id:sub(-2);local v=assert(expected[id]);assert(not seen[id]);seen[id]=true
 for _,up in ipairs({false,true})do for charge=0,2 do for _,storm in ipairs({false,true})do for _,mode in ipairs({'normal','full','empty','noDraw'})do
 local s,c=fresh(def,up,charge,storm,mode);local initial=#s.hand;local active=id=='30'and charge==2 or id=='33'and storm or id=='43'and charge>=1
 local draws=v.base+(active and(up and v.upBonus or v.bonus)or 0);local finalCharge=charge;if active and id=='30'then finalCharge=0 elseif active and id=='43'then finalCharge=charge-1 end
 assert(C.play(s,c.uid,1));eq(s.energy,3-v.cost);eq(s.ganyuResource.charge,finalCharge);eq(s.ganyuResource.storm and s.ganyuResource.storm.turns,storm and 2 or nil)
 local gained=draws+(v.exhaust and 1 or 0);if mode=='empty'or mode=='noDraw'then gained=0 end
 eq(#s.hand,math.min(10,initial-1+gained));eq(s.player.block,v.exhaust and 3 or 0);eq(s.pendingPlay,nil);eq(s.cardInUse,nil)
 local found=false;for _,x in ipairs(v.exhaust and s.exhaust or s.discard)do if x==c then found=true end end;assert(found)
 local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before);count=count+1
 end end end end
end
for id in pairs(expected)do assert(seen[id])end
print('PUBLIC_RESOURCE_DRAW_PASS '..count..' actual paid base/up charge/storm draw limits/FNP/DE/UID finish/replay; controlled resources, not natural balance')
