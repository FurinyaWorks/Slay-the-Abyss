package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Paid=require('abyss_keqing_paid_cards');local original=Paid.complete;local calls=0
Paid.complete=function(...)calls=calls+1;return original(...)end
local function fresh(up,lethal)
 local data=C.copy(D);data.cards.cards[#data.cards.cards+1]={id='KQ001',name='terminal probe',type='attack',target='ENEMY',cost=1,rarity='special',color='colorless',experimental=true,keqingCandidate=true,effects={{op='damage',value=6}},upgrade={effects={{op='damage',value=9}}}}
 local deck={};for i=1,7 do deck[i]={cardId='KQ001',upgraded=up}end
 local s=C.new(data,{deck=deck,enemies={'jaw_worm'},seed=11,candidateLifecycle={kind='keqing',relicEnabled=true}})
 s.player.hp=lethal and 1 or 100;s.player.maxHp=100;s.player.block=0;s.enemies[1].hp=lethal and 100 or 1;s.enemies[1].maxHp=100;s.enemies[1].block=0;s.keqingResource.infusion=2
 if lethal then C.addStatus(s.enemies[1],'thorns',3)end
 return s
end
for _,up in ipairs({false,true})do for _,lethal in ipairs({false,true})do
 local s=fresh(up,lethal);local card=s.hand[1];local energy=s.energy;local before=calls
 assert(C.play(s,card.uid,1));eq(s.energy,energy-1)
 if lethal then
  eq(s.player.hp,0);eq(calls,before);eq(s.keqingResource.infusion,2);eq(s.cardInUse,card);eq(s.pendingPlay,nil)
 else
  eq(s.enemies[1].hp,0);eq(calls,before+1);eq(s.keqingResource.infusion,1);eq(s.cardInUse,nil);eq(s.pendingPlay,nil);eq(s.discard[#s.discard],card)
 end
 local done=C.copy(s);eq(C.play(s,card.uid,1),false);same(s,done);eq(calls,before+(lethal and 0 or 1))
end end
Paid.complete=original
print('KEQING_HOST_TERMINAL_PASS 4 actual Combat cases')
