-- Actual opt-in shared14/75 admission. No manual paid context or private dispatch.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local X=require('abyss_exhaust')
local defs=assert(require('abyss_ganyu_paid_cards').defensiveStormDefinitions(),'shared definitions object required')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local expected={['14']={8,11,3,4,2},['75']={10,14,4,6,3}}
local count=0;local seen={}
for _,def in ipairs(defs.cards)do local id=def.id:sub(-2);local e=assert(expected[id]);assert(not seen[id]);seen[id]=true
 for _,up in ipairs({false,true})do for _,frail in ipairs({false,true})do for _,prior in ipairs({false,{amount=9,turns=1},{amount=1,turns=5}})do
 local d=C.copy(D);for _,v in ipairs(defs.cards)do d.cards.cards[#d.cards.cards+1]=C.copy(v)end
 local s=C.new(d,{deck={{cardId=def.id,upgraded=up},'defend','defend','defend','defend'},enemies={'jaw_worm'},seed=42,candidateLifecycle={kind='ganyu',relicEnabled=false}})
 local card;for _,v in ipairs(s.hand)do if v.cardId==def.id then card=v end end;assert(card)
 s.player.hp=500;s.player.maxHp=500;s.enemies[1].hp=500;s.enemies[1].maxHp=500;s.enemies[1].block=0
 s.ganyuResource.charge=1;s.ganyuResource.storm=prior and C.copy(prior)or nil
 s.player.statuses.dexterity=2;if frail then s.player.statuses.frail=1 end
 s.player.statuses.feel_no_pain=3;X.rememberPower(s,'feel_no_pain')
 local energy=s.energy;assert(C.play(s,card.uid,1));eq(s.energy,energy-3);eq(s.enemies[1].hp,500)
 local block=(up and e[2]or e[1])+2;if frail then block=math.floor(block*.75)end
 eq(s.player.block,block+(id=='75'and 3 or 0));eq(s.ganyuResource.charge,1)
 local amount=math.max(up and e[4]or e[3],prior and prior.amount or 0);local turns=math.max(e[5],prior and prior.turns or 0)
 eq(s.ganyuResource.storm.amount,amount);eq(s.ganyuResource.storm.turns,turns)
 local destination=id=='75'and s.exhaust or s.discard;eq(destination[#destination],card);eq(s.pendingPlay,nil);eq(s.cardInUse,nil);eq(C.play(s,card.uid,1),false)
 for tick=1,turns do s.enemies[1].block=0;local hp=s.enemies[1].hp;assert(C.endTurn(s));eq(s.enemies[1].hp,hp-amount);if tick==turns then eq(s.ganyuResource.storm,nil)else eq(s.ganyuResource.storm.turns,turns-tick)end end
 count=count+1
 end end end
end
for id in pairs(expected)do assert(seen[id])end
print('PUBLIC_DEFENSIVE_STORM_PASS '..count..' actual3-cost/native Dex-Frail/block/storm max/charge/UID lifecycle/owner-end expiry; controlled enemies/prior field')
