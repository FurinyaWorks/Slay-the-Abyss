-- NEXT opt-in host acceptance, not a passed test until the host enables ganyuStorm.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh(up)
 local d=C.copy(D)
 if GANYU_STORM_DEFINITIONS then
  for _,definition in ipairs(dofile(GANYU_STORM_DEFINITIONS).cards)do d.cards.cards[#d.cards.cards+1]=definition end
 else
 d.cards.cards[#d.cards.cards+1]={id='ganyu_lab_05',name='storm candidate fixture',type='skill',target='SELF',cost=2,rarity='rare',experimental=true,ganyuCandidate=true,
 effects={{op='ganyuStorm',amount=4,turns=2}},upgrade={effects={{op='ganyuStorm',amount=6,turns=2}}}}
 end
 local s=C.new(d,{deck={'ganyu_lab_05','ganyu_lab_05','ganyu_lab_05'},enemies={'jaw_worm'},seed=42,candidateLifecycle={kind='ganyu',relicEnabled=false}})
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
