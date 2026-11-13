-- PENDING shared09/36/56 admission; no manual paid or private dispatch.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data')
local defs=assert(require('abyss_ganyu_paid_cards').shieldChargeDefinitions(),'shared definition object required')
local expected={['09']={2,8,11,2},['36']={1,4,7,1},['56']={2,5,8,2}}
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh(def,up)
 local d=C.copy(D);for _,v in ipairs(defs.cards)do d.cards.cards[#d.cards.cards+1]=C.copy(v)end
 local s=C.new(d,{deck={{cardId=def.id,upgraded=up},'defend','defend','defend','defend'},enemies={'jaw_worm'},seed=42,candidateLifecycle={kind='ganyu',relicEnabled=false}})
 local card;for _,c in ipairs(s.hand)do if c.cardId==def.id then card=c end end;assert(card);return s,card
end
local count=0;local seen={}
for _,def in ipairs(defs.cards)do local id=def.id:sub(-2);local v=assert(expected[id]);assert(not seen[id]);seen[id]=true
 for _,up in ipairs({false,true})do for charge=0,2 do for _,frail in ipairs({false,true})do
 local s,c=fresh(def,up);s.ganyuResource.charge=charge;s.ganyuResource.storm={amount=7,turns=2};local prior=C.copy(s.ganyuResource)
 s.player.statuses.dexterity=2;if frail then s.player.statuses.frail=1 end
 assert(C.play(s,c.uid,1));eq(s.energy,3-v[1]);local block=(up and v[3]or v[2])+2;if frail then block=math.floor(block*.75)end
 eq(s.player.block,block);eq(s.ganyuResource.charge,math.min(2,charge+v[4]));same(s.ganyuResource.storm,prior.storm);eq(s.ganyuResource.lastBank,prior.lastBank);eq(s.ganyuResource.lastOwnerEnd,prior.lastOwnerEnd)
 eq(s.discard[#s.discard],c);eq(c.upgraded,up);eq(s.pendingPlay,nil);eq(s.cardInUse,nil);local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before);count=count+1
 end end
 if id=='56'then local s,c=fresh(def,up);for turn=1,2 do assert(C.endTurn(s));local found=false;for _,x in ipairs(s.hand)do if x==c then found=true end end;assert(found);eq(c.upgraded,up);eq(s.ganyuResource.charge,0);eq(s.ganyuResource.storm,nil);eq(s.player.block,0)end end
 local s,c=fresh(def,up);s.energy=v[1]-1;local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before)
 end
end
for id in pairs(expected)do assert(seen[id])end
print('PUBLIC_SHIELD_CHARGE_PASS '..count..' actual paid Dex-Frail/charge saturation/field-markers/UID discard/replay +2 retained56 variants and insufficient payment; controlled resources')
