-- Run from a host checkout that has explicitly wired the Ganyu candidate ABI.
-- No monkeypatches or private queue calls: this is a public C.new/C.play contract.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)
 if type(a)~='table'then eq(a,b);return end
 assert(type(b)=='table');for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end
end
local function fresh(id,up,charge)
 local d=C.copy(D)
 if GANYU_PAID_DEFINITIONS then
  for _,definition in ipairs(dofile(GANYU_PAID_DEFINITIONS).cards)do d.cards.cards[#d.cards.cards+1]=definition end
 else
 d.cards.cards[#d.cards.cards+1]={id='ganyu_lab_03',name='charged shot candidate',type='attack',target='ENEMY',cost=1,rarity='special',experimental=true,ganyuCandidate=true,
 effects={{op='ganyuCard',kind='chargedShot',direct=7,bloom=6}},upgrade={effects={{op='ganyuCard',kind='chargedShot',direct=9,bloom=8}}}}
 d.cards.cards[#d.cards.cards+1]={id='ganyu_lab_06',name='charge candidate',type='skill',target='SELF',cost=1,rarity='special',experimental=true,ganyuCandidate=true,
 effects={{op='ganyuCard',kind='charge',amount=1}},upgrade={effects={{op='ganyuCard',kind='charge',amount=2}}}}
 end
 local s=C.new(d,{deck={id,id,id,id,id,id,id},enemies={'jaw_worm','jaw_worm'},seed=42,candidateLifecycle={kind='ganyu',relicEnabled=false}})
 assert(s.ganyuResource,'Ganyu host initialization unavailable; this contract has NOT passed')
 s.ganyuResource.charge=charge;s.hand[1].upgraded=up
 for _,e in ipairs(s.enemies)do e.hp=100;e.maxHp=100;e.block=0 end
 s.enemies[1].block=2;s.enemies[2].block=1
 return s,s.hand[1]
end
local count=0
for _,up in ipairs({false,true})do for charge=0,2 do
 local s,card=fresh('ganyu_lab_03',up,charge);local energy=s.energy
 local before=C.copy(s);eq(C.play(s,card.uid,999),false);same(s,before)
 s.energy=0;before=C.copy(s);eq(C.play(s,card.uid,1),false);same(s,before);s.energy=energy
 assert(C.play(s,card.uid,1))
 local bloom=charge==2 and(up and 8 or 6)or 0
 eq(s.enemies[1].hp,102-(up and 9 or 7)-bloom);eq(s.enemies[2].hp,100-math.max(0,bloom-1))
 eq(s.energy,energy-1);eq(s.ganyuResource.charge,charge==2 and 0 or charge)
 eq(s.cardInUse,nil);eq(s.pendingPlay,nil);eq(s.actionQueue,nil);eq(s.discard[#s.discard],card)
 before=C.copy(s);eq(C.play(s,card.uid,1),false);same(s,before);count=count+1
 local n,c=fresh('ganyu_lab_06',up,charge);local old=n.energy
 assert(C.play(n,c.uid));eq(n.ganyuResource.charge,math.min(2,charge+(up and 2 or 1)))
 eq(n.energy,old-1);eq(n.enemies[1].hp,100);eq(n.discard[#n.discard],c);count=count+1
end end
-- A killed selected target must not suppress the scheduled bloom against survivor.
for _,up in ipairs({false,true})do
 local s,c=fresh('ganyu_lab_03',up,2);s.enemies[1].hp=1
 assert(C.play(s,c.uid,1));eq(s.enemies[1].hp,0);eq(s.enemies[2].hp,up and 93 or 95);eq(s.ganyuResource.charge,0)
 count=count+1
end
print('PASS '..count..' public Ganyu C.play base/up resource, target, payment and UID contracts')

for _,up in ipairs({false,true})do
 local s,c=fresh('ganyu_lab_03',up,2)
 s.player.statuses.strength=2;s.player.statuses.weak=1;s.enemies[1].statuses.vulnerable=1
 assert(C.play(s,c.uid,1))
 eq(s.enemies[1].hp,up and 79 or 83);eq(s.enemies[2].hp,up and 94 or 95);eq(s.ganyuResource.charge,0)
 local n,d=fresh('ganyu_lab_03',up,2);n.player.hp=1;n.enemies[1].statuses.thorns=3
 assert(C.play(n,d.uid,1));eq(n.player.hp,0);eq(n.enemies[2].hp,100);eq(n.ganyuResource.charge,0)
end
print('PASS independent 4 public modifier/retaliation terminal probes')
