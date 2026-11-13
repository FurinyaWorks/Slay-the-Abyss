package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D=H.C,H.Data;local eq,same=H.eq,H.same
local Paid=require('abyss_keqing_paid_cards')
local function fresh(id,up,stress,enabled)
 local data=C.copy(D)
 local attack={id='KQ001',name='candidate',type='attack',target='ENEMY',cost=1,rarity='special',color='colorless',experimental=true,keqingCandidate=true,
 effects={{op='damage',value=6}},upgrade={effects={{op='damage',value=9}}}}
 local block={id='KQ002',name='candidate',type='skill',target='SELF',cost=1,rarity='special',color='colorless',experimental=true,keqingCandidate=true,
 effects={{op='block',value=5}},upgrade={effects={{op='block',value=8}}}}
 if stress then attack.effects={{op='scry',value=2},{op='damage',value=6,times=2}}end
 data.cards.cards[#data.cards.cards+1]=attack;data.cards.cards[#data.cards.cards+1]=block
 local deck={};for i=1,7 do deck[i]={cardId=id,upgraded=up}end
 local s=C.new(data,{deck=deck,enemies={'jaw_worm'},seed=11,candidateLifecycle=enabled==false and nil or {kind='keqing',relicEnabled=true}})
 s.player.hp=100;s.player.maxHp=100;s.enemies[1].hp=100;s.enemies[1].maxHp=100
 return s
end
for _,up in ipairs({false,true})do
 local s=fresh('KQ001',up);eq(s.keqingResource.infusion,0);eq(s.keqingResource.relicUsed,false);eq(s.keqingResource.relicEnabled,true)
 s.keqingResource.infusion=2;local card=s.hand[1];local energy=s.energy
 local before=C.copy(s);local ok=C.play(s,card.uid,999);eq(ok,false);same(s,before)
 assert(C.play(s,card.uid,1));eq(s.energy,energy-1);eq(s.enemies[1].hp,100-(up and 11 or 8))
 eq(s.keqingResource.infusion,1);eq(s.cardInUse,nil);eq(s.pendingPlay,nil);eq(s.discard[#s.discard],card)
 before=C.copy(s);ok=C.play(s,card.uid,1);eq(ok,false);same(s,before)
 local n=fresh('KQ002',up);n.keqingResource.infusion=2;local cost=n.energy
 assert(C.play(n,n.hand[1].uid,1));eq(n.energy,cost-1);eq(n.player.block,up and 8 or 5);eq(n.keqingResource.infusion,2)
end
-- Synthetic Scry+two hits is an interruption stress fixture, not an authored KQ001 face.
do
 local s=fresh('KQ001',false,true);s.keqingResource.infusion=2;local card=s.hand[1];local energy=s.energy
 assert(C.play(s,card.uid,1));eq(s.energy,energy-1);eq(s.keqingResource.infusion,2)
 local pending=s.pendingScry;local q=s.actionQueue;local paid=s.pendingPlay.keqingPaid
 eq(paid.completed,nil);eq(s.cardInUse,card);local before=C.copy(s)
 eq(C.play(s,card.uid,1),false);same(s,before)
 eq(C.chooseScry(s,{999999},pending.token),false);same(s,before)
 -- A real resumed command failure must restore paused identities, not repay.
 local complete=Paid.complete
 Paid.complete=function(state,context,instance)complete(state,context,instance);error('after paid completion')end
 eq(pcall(C.chooseScry,s,{},pending.token),false);Paid.complete=complete
 same(s,before);eq(s.pendingScry,pending);eq(s.actionQueue,q);eq(s.pendingPlay.keqingPaid,paid);eq(s.cardInUse,card)
 assert(C.chooseScry(s,{},pending.token));eq(s.energy,energy-1);eq(s.enemies[1].hp,84);eq(s.keqingResource.infusion,1)
 eq(s.pendingPlay,nil);eq(s.pendingScry,nil);eq(s.actionQueue,nil)
end
-- Initial play failure after commit restores damage, payment, card and resource aliases.
do
 local s=fresh('KQ001',false);s.keqingResource.infusion=2
 local resource=s.keqingResource;local card=s.hand[1];local hand=s.hand;local before=C.copy(s)
 local complete=Paid.complete;Paid.complete=function(state,context,instance)complete(state,context,instance);error('after completion')end
 eq(pcall(C.play,s,card.uid,1),false);Paid.complete=complete
 same(s,before);eq(s.keqingResource,resource);eq(s.hand,hand);eq(s.hand[1],card)
 assert(C.play(s,card.uid,1));eq(s.keqingResource.infusion,1)
end
-- Source victory still reaches UseCard; death before UseCard does not spend the charge.
do
 local s=fresh('KQ001',false);s.keqingResource.infusion=2;s.enemies[1].hp=1
 assert(C.play(s,s.hand[1].uid,1));eq(C.outcome(s),'victory');eq(s.keqingResource.infusion,1)
 local n=fresh('KQ001',false);n.keqingResource.infusion=2;n.player.hp=1
 n.enemies[1].statuses.sharp_hide=3;n.enemies[1].powerOrder={'sharp_hide'}
 local resource=n.keqingResource;local card=n.hand[1]
 assert(C.play(n,card.uid,1));eq(n.player.hp,0);eq(n.keqingResource,resource);eq(resource.infusion,2);eq(n.cardInUse,card)
end
-- Explicit candidate data cannot run without the opt-in state.
do
 local s=fresh('KQ001',false);s.characterOwnerEnd=nil;local before=C.copy(s)
 local ok,why=C.play(s,s.hand[1].uid,1);eq(ok,false);eq(why,'keqing_candidate_unavailable');same(s,before)
end
-- Reject flags that would bypass QueuedPlay and silently omit candidate accounting.
for _,field in ipairs({'runNativeABI','originalV4','silentFinalCard','costMode'})do
 local s=fresh('KQ001',false);s.catalog.cards.KQ001[field]=true
 local before=C.copy(s);eq(Paid.canUse(s,s.catalog.cards.KQ001),false)
 local called,usable=pcall(C.canPlay,s,s.hand[1].uid,1)
 assert(not called or not usable,'native-only override escaped rejection');same(s,before)
end
-- Autoplay has its own admission and native dispatch; it must enforce the same gate.
for _,mode in ipairs({'silentFinalCard','runNativeABI','unmarked'})do
 for _,disposal in ipairs({'discard','exhaust','purge'})do
  local s=fresh('KQ001',false);s.keqingResource.infusion=2
  if mode=='unmarked'then s.catalog.cards.KQ001.keqingCandidate=nil else s.catalog.cards.KQ001[mode]=true end
  local card=table.remove(s.hand,1);local energy=s.energy;local resource=s.keqingResource
  C.queueCard(s,card,{targetIndex=1,exhaustCards=disposal=='exhaust',purge=disposal=='purge'})
  require('abyss_card_actions').drain(C,s)
  eq(s.enemies[1].hp,100);eq(s.energy,energy);eq(s.keqingResource,resource);eq(resource.infusion,2)
  eq(s.pendingPlay,nil);eq(s.cardInUse,nil)
  eq(#s.discard,disposal=='discard'and 1 or 0);eq(#s.exhaust,disposal=='exhaust'and 1 or 0)
  if disposal=='discard'then eq(s.discard[1],card)elseif disposal=='exhaust'then eq(s.exhaust[1],card)end
  for _,event in ipairs(s.events)do assert(event.kind~='play','rejected autoplay emitted play')end
 end
end
-- Accepted direct candidate autoplay must select QueuedPlay, not the native fallback.
do
 local s=fresh('KQ001',false);s.keqingResource.infusion=2
 local card=table.remove(s.hand,1);local energy=s.energy
 C.queueCard(s,card,{targetIndex=1,exhaustCards=false});require('abyss_card_actions').drain(C,s)
 eq(s.enemies[1].hp,92);eq(s.energy,energy);eq(s.keqingResource.infusion,1);eq(s.discard[1],card)
end
-- Resource initialization is new-battle scoped and never attached by ordinary C.new.
do
 local s=C.new(D,{deck={'strike'},enemies={'jaw_worm'},seed=2})
 eq(s.characterOwnerEnd,nil);eq(s.keqingResource,nil)
 local a=fresh('KQ001',false);local b=fresh('KQ001',false);a.keqingResource.relicUsed=true;a.keqingResource.infusion=2
 eq(b.keqingResource.relicUsed,false);eq(b.keqingResource.infusion,0)
 local before=C.copy(a);a.energy=0;before=C.copy(a);eq(C.play(a,a.hand[1].uid,1),false);same(a,before)
end
print('KEQING_PAID_USECARD_PASS')
