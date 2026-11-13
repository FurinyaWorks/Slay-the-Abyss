-- Author opt-in candidate catalog tests, not shared registration or natural rewards.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data')
local defs=require('abyss_ganyu_paid_cards').stormFamilyDefinitions().cards
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local expected={['18']={1,2,3,3},['31']={2,6,8,3},['59']={2,3,4,2}}
for _,def in ipairs(defs)do for _,up in ipairs({false,true})do
 local d=C.copy(D);d.cards.cards[#d.cards.cards+1]=def
 local s=C.new(d,{deck={def.id,def.id,def.id},enemies={'jaw_worm'},seed=42,candidateLifecycle={kind='ganyu',relicEnabled=false}})
 local card=s.hand[1];card.upgraded=up;s.player.hp=100;s.player.maxHp=100;s.enemies[1].hp=100;s.enemies[1].maxHp=100;s.enemies[1].block=0
 local id=def.id:sub(-2);local v=expected[id]
 if id=='59'then
  assert(C.endTurn(s));local found=false;for _,c in ipairs(s.hand)do if rawequal(c,card)then found=true end end
  assert(found,'retained card instance lost');eq(s.ganyuResource.storm,nil)
 end
 local energy=s.energy;assert(C.play(s,card.uid));eq(s.energy,energy-v[1]);eq(s.ganyuResource.storm.amount,up and v[3]or v[2]);eq(s.ganyuResource.storm.turns,v[4])
 local pile=id=='31'and s.exhaust or s.discard;eq(pile[#pile],card);eq(C.play(s,card.uid),false)
 -- Clear native enemy guard for exact tick oracle, not a change to card mechanics.
 for tick=1,v[4]do
  s.enemies[1].block=0;local hp=s.enemies[1].hp
  assert(C.endTurn(s));eq(s.enemies[1].hp,hp-(up and v[3]or v[2]))
  if tick==v[4]then eq(s.ganyuResource.storm,nil)else eq(s.ganyuResource.storm.turns,v[4]-tick)end
 end
end end
print('PASS6 generated storm-family public payments, native retain/exhaust/discard and full-duration expiry')
