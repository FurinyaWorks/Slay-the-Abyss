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
 d.cards.cards[#d.cards.cards+1]={id='ganyu_lab_03',name='charged shot candidate',type='attack',target='ENEMY',cost=1,rarity='special',experimental=true,ganyuCandidate=true,
 effects={{op='ganyuCard',kind='chargedShot',direct=7,bloom=6}},upgrade={effects={{op='ganyuCard',kind='chargedShot',direct=9,bloom=8}}}}
 d.cards.cards[#d.cards.cards+1]={id='ganyu_lab_06',name='charge candidate',type='skill',target='SELF',cost=1,rarity='special',experimental=true,ganyuCandidate=true,
 effects={{op='ganyuCard',kind='charge',amount=1}},upgrade={effects={{op='ganyuCard',kind='charge',amount=2}}}}
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
local Stage=require('abyss_ganyu_paid_cards');local Q=require('abyss_card_actions')
-- Actual public payment then native damage then injected failure restores aliases.
do
 local s,c=fresh('ganyu_lab_03',false,2);local resource=s.ganyuResource;local hand=s.hand;local enemy=s.enemies[1]
 local before=C.copy(s);local damage=C.damage
 C.damage=function(...)local result=damage(...);error('native damage fault after real paid resource consumption')end
 eq(pcall(C.play,s,c.uid,1),false);C.damage=damage
 same(s,before);eq(s.ganyuResource,resource);eq(s.hand,hand);eq(s.hand[1],c);eq(s.enemies[1],enemy)
 assert(C.play(s,c.uid,1));eq(s.ganyuResource.charge,0)
end
-- Test-only interruption at real paid-stage boundary, then whole resumed snapshot.
do
 local s,c=fresh('ganyu_lab_03',false,2);local energy=s.energy;local resource=s.ganyuResource
 local dispatch=Stage.dispatch;local injected=false
 Stage.dispatch=function(combat,state,e,queue)
  if not injected then
   injected=true;queue.pushTop(state,{kind='effect',effect=e})
   queue.pushTop(state,{kind='effect',effect={op='scry',value=2}});return true
  end
  return dispatch(combat,state,e,queue)
 end
 assert(C.play(s,c.uid,1));Stage.dispatch=dispatch
 local pending=assert(s.pendingScry);local paid=s.pendingPlay.ganyuPaid;local before=C.copy(s);local queue=s.actionQueue
 eq(s.energy,energy-1);eq(s.ganyuResource.charge,2);eq(paid.completed,nil)
 Stage.dispatch=function(...)dispatch(...);error('after Ganyu paid stage')end
 eq(pcall(C.chooseScry,s,{},pending.token),false);Stage.dispatch=dispatch
 same(s,before);eq(s.ganyuResource,resource);eq(s.actionQueue,queue);eq(s.pendingPlay.ganyuPaid,paid)
 assert(C.chooseScry(s,{},pending.token));eq(s.energy,energy-1);eq(s.ganyuResource.charge,0)
 local done=C.copy(s);eq(C.chooseScry(s,{},pending.token),false);same(s,done)
end
-- Automatic acceptance and rejected native/absent-marker paths use one gate.
for _,field in ipairs({'none','silentFinalCard','runNativeABI','unmarked'})do
 local s,c=fresh('ganyu_lab_03',false,2)
 local def=s.catalog.cards.ganyu_lab_03
 if field=='unmarked'then def.ganyuCandidate=nil elseif field~='none'then def[field]=true end
 table.remove(s.hand,1);local energy=s.energy
 C.queueCard(s,c,{targetIndex=1,exhaustCards=false});Q.drain(C,s)
 eq(s.energy,energy);eq(s.ganyuResource.charge,field=='none'and 0 or 2)
 eq(s.enemies[1].hp,field=='none'and 89 or 100);eq(s.discard[#s.discard],c)
end
-- A real reaction death stops the already-generated bloom, without undoing a
-- successfully performed resource consumption. The source remains in limbo.
do
 local s,c=fresh('ganyu_lab_03',false,2);s.player.hp=1
 s.enemies[1].statuses.thorns=3;s.enemies[1].powerOrder={'thorns'}
 assert(C.play(s,c.uid,1));eq(s.player.hp,0);eq(s.ganyuResource.charge,0)
 eq(s.enemies[2].hp,100);eq(s.cardInUse,c)
end
-- Non-active targets and extra effect metadata cannot silently change meaning.
for _,field in ipairs({'escaped','halfDead','isDying'})do
 local s,c=fresh('ganyu_lab_03',false,2);s.enemies[1][field]=true
 local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before)
end
do
 local s,c=fresh('ganyu_lab_03',false,2);s.catalog.cards.ganyu_lab_03.effects[1].fixed=true
 local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before)
 local normal=C.new(C.copy(D),{deck={'strike','strike','strike','strike','strike'},enemies={'jaw_worm'},seed=42})
 eq(normal.ganyuResource,nil);eq(normal.characterCandidate,nil)
end
print('GANYU_PAID_TRANSACTION_PASS')
