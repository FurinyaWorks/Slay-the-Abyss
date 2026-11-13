-- First-eight admission acceptance; exact src-only public Run commands.
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
  if id~='x08'then s.enemies[1].hp=0;rejected=C.copy(r);assert(not Run.play(r,c.uid,1));same(r,rejected);s.enemies[1].hp=100 end
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

for _,up in ipairs({false,true})do for _,id in ipairs({'x03','x07'})do
 local r,c=acquired(id,up);r.combat.enemies[1].hp=1;local before=C.copy(r);local battle=r.combat;local hand=battle.hand
 local finish=Run.finishCombat;local reached=false
 Run.finishCombat=function(run)local result=finish(run);reached=true;error('after actual core final kill reward publication')end
 assert(not pcall(Run.play,r,c.uid,1));Run.finishCombat=finish;assert(reached);same(r,before);eq(r.combat,battle);eq(battle.hand,hand)
 assert(Run.play(r,c.uid,1));assert(r.phase~='combat')
end end
print('XIAO_CORE_TERMINAL_PASS base upgrade final kill actual Run rewards and full fault rollback')
for _,up in ipairs({false,true})do
 local r,c=acquired('x08',up);local s=r.combat
 for i=#s.draw,1,-1 do s.discard[#s.discard+1]=table.remove(s.draw,i)end
 local before=C.copy(r);local draw,hand=s.draw,s.hand;local drawFn=C.draw;local reached=false
 C.draw=function(st,count)local result=drawFn(st,count);reached=true;error('after real native draw shuffle')end
 assert(not pcall(Run.play,r,c.uid,1));C.draw=drawFn;assert(reached);same(r,before);eq(s.draw,draw);eq(s.hand,hand)
 assert(Run.play(r,c.uid,1))
end
print('XIAO_CORE_DRAW_PASS upgraded and base actual reshuffle fault restores entire Run RNG and pile aliases')
