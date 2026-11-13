package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local Run=require('abyss_run');local defs=require('abyss_ganyu_native_cards').definitions();local run=Run.new(D,42)
for _,d in ipairs(defs.cards)do run.data.cards.cards[#run.data.cards.cards+1]=C.copy(d)end
assert(Run.startCombat(run,'cultist_solo'));for _,e in ipairs(run.combat.enemies)do C.damage(run.combat,run.combat.player,e,999,true)end;assert(Run.finishCombat(run))
run.rewards.cards={'ganyu_lab_01'};run.rewards.cardUpgrades={false};run.rewards.cardResolved=false;assert(Run.claimCardReward(run,1));local deckUid=run.deck[#run.deck].uid
assert(Run.leaveCombatRewards(run));assert(Run.startCombat(run,'cultist_solo'));local s=run.combat;local card
for _,pile in ipairs({s.hand,s.draw})do for i,c in ipairs(pile)do if c.deckUid==deckUid then card=table.remove(pile,i);break end end end;assert(card);s.hand[#s.hand+1]=card;s.energy=3
assert(s.characterCandidate~='ganyu');local ok,why=C.play(s,card.uid,1);assert(ok==false);print('RUN_BOUNDARY_RECEIVED_BUT_NOT_ENABLED',why)
