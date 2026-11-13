package.path='experiments/characters/keqing-host/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,eq=H.C,H.eq;local S=require('source-starter')
for _,up in ipairs({false,true})do for _,relic in ipairs({false,true})do
 local data=C.copy(H.Data);for _,c in ipairs(S.definitions())do data.cards.cards[#data.cards.cards+1]=c end
 local s=C.new(data,{deck=S.deck(up),enemies={'jaw_worm'},seed=42,candidateLifecycle={kind='keqing',relicEnabled=relic}})
 s.player.hp=999;s.player.maxHp=999;s.enemies[1].hp=999;s.enemies[1].maxHp=999
 local played={};local setup,recast,burst=0,0,0
 for turn=1,8 do
  local actions=0
  while s.energy>0 and #s.hand>0 do
   -- Only currently visible hand/resource state. No draw reorder or future lookup.
   local c=s.hand[1];local id=c.cardId;local wedge=s.keqingResource.wedgeUntil
   local before=s.player.block;local wasUsed=s.keqingResource.relicUsed
   assert(C.play(s,c.uid,1));played[id]=(played[id]or 0)+1;actions=actions+1;assert(actions<=3)
   if id=='KQ003'then
    if wedge then recast=recast+1;eq(s.keqingResource.infusion,2);eq(s.keqingResource.wedgeUntil,nil)
    else setup=setup+1;eq(s.keqingResource.wedgeUntil,s.turn+1)
     eq(s.player.block,before+((relic and not wasUsed)and 4 or 0))
    end
   elseif id=='KQ004'and wedge then burst=burst+1;eq(s.keqingResource.wedgeUntil,nil)end
  end
  local seen,n={},0;for _,p in ipairs({s.hand,s.draw,s.discard,s.exhaust})do for _,c in ipairs(p)do assert(not seen[c.uid]);seen[c.uid]=true;n=n+1 end end;eq(n,10)
  local expiry=s.keqingResource.wedgeUntil;local oldTurn=s.turn
  assert(C.endTurn(s));eq(s.turn,oldTurn+1);eq(s.keqingResource.infusion,0)
  if expiry and expiry<=oldTurn then eq(s.keqingResource.wedgeUntil,nil)end
 end
 for _,id in ipairs({'KQ001','KQ002','KQ003','KQ004'})do assert(played[id])end
 assert(setup>0 and recast>0 and burst>0)
 eq(s.keqingResource.relicUsed,relic)
end end
print('KQ_SOURCE_STARTER_32_TURNS_PASS')
