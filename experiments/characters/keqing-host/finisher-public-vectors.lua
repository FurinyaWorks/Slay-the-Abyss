-- Public C.play runner for the integration owner. It never bypasses admission.
-- Terminal expectations deliberately stop at observed stages, not design approval.
local M={}
function M.run(C,D,eq)
 local function fresh(up,inf,wedge,hp)
  local data=C.copy(D);data.cards.cards[#data.cards.cards+1]={id='KQ004',name='finisher candidate',type='attack',target='ENEMY',cost=1,rarity='special',color='colorless',experimental=true,keqingCandidate=true,keqingStage='004',effects={{op='damage',value=4,times=2}},upgrade={effects={{op='damage',value=5,times=2}}}}
  local deck={};for i=1,7 do deck[i]={cardId='KQ004',upgraded=up}end
  local s=C.new(data,{deck=deck,enemies={'jaw_worm','jaw_worm'},seed=11,candidateLifecycle={kind='keqing',relicEnabled=true}})
  s.player.hp=100;s.player.maxHp=100
  for _,e in ipairs(s.enemies)do e.hp=100;e.maxHp=100;e.block=0 end
  s.enemies[1].hp=hp;s.keqingResource.infusion=inf;s.keqingResource.wedgeUntil=wedge and s.turn+1 or nil
  return s
 end
 local count=0
 for _,up in ipairs({false,true})do for inf=0,2 do for _,wedge in ipairs({false,true})do for _,hp in ipairs({100,1})do
  local s=fresh(up,inf,wedge,hp);local card=s.hand[1];local first=(up and 5 or 4)+(inf>0 and 2 or 0);local burst=(up and 6 or 4)+(inf>0 and 2 or 0)
  local ok,why=C.play(s,card.uid,1);assert(ok,'public 004 unavailable: '..tostring(why))
  eq(s.energy,2);eq(s.enemies[1].hp,math.max(0,hp-first*2-(wedge and burst or 0)));eq(s.enemies[2].hp,100-(wedge and burst or 0))
  eq(s.keqingResource.infusion,math.max(0,inf-1));eq(s.keqingResource.wedgeUntil,nil);eq(s.keqingResource.relicUsed,false);eq(s.player.block,0)
  eq(s.cardInUse,nil);eq(s.pendingPlay,nil);eq(s.discard[#s.discard],card);count=count+1
 end end end end
 return count
end
return M
