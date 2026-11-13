-- Pending remaining first-eight admission; exact src-only public Run commands.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Run=require('abyss_run');local B=require('abyss_xiao_play_bridge')
local function acquired(id,up)
 local r=Run.new(D,42,{experimental=true,candidateLifecycle={kind='xiao',relicEnabled=false}})
 for _,d in ipairs(B.definitions())do r.data.cards.cards[#r.data.cards.cards+1]=C.copy(d)end
 assert(Run.startCombat(r,'cultist_solo'))
 for _,e in ipairs(r.combat.enemies)do C.damage(r.combat,r.combat.player,e,999,true)end
 assert(Run.finishCombat(r));r.rewards.cards={'xiao_candidate_'..id};r.rewards.cardUpgrades={up};r.rewards.cardResolved=false
 assert(Run.claimCardReward(r,1));local uid=r.deck[#r.deck].uid
 assert(Run.leaveCombatRewards(r));assert(Run.startCombat(r,'cultist_solo'))
 local s=r.combat;local card
 for _,pile in ipairs({s.hand,s.draw})do for i,c in ipairs(pile)do if c.deckUid==uid then card=table.remove(pile,i);break end end end
 assert(card);s.hand[#s.hand+1]=card;s.enemies[1].hp=100;s.enemies[1].block=0
 eq(card.upgraded,up);eq(card.deckUid,uid);return r,card
end
for _,up in ipairs({false,true})do
 for _,id in ipairs({'x03','x05','x07','x08'})do
  local r,c=acquired(id,up);local s=r.combat;local energy=s.energy;local hand=#s.hand
  s.energy=0;local rejected=C.copy(r);assert(not Run.play(r,c.uid,1));same(r,rejected);s.energy=energy
  assert(Run.play(r,c.uid,1),'remaining core card rejected: '..id)
  eq(s.energy,energy-1);eq(s.cardInUse,nil)
  local found=false;for _,v in ipairs(s.discard)do if v.uid==c.uid then found=true end end;assert(found)
  if id=='x03'then eq(s.enemies[1].hp,up and 88 or 91)
  elseif id=='x05'then eq(s.enemies[1].hp,up and 91 or 94)
  elseif id=='x07'then eq(s.enemies[1].hp,up and 93 or 95);eq(s.player.block,up and 7 or 5)
  else eq(#s.hand,hand-1+(up and 3 or 2))end
 end
end
print('XIAO_CORE_RUN_PASS fixed reward UID base upgrade real paid effects and discard')
