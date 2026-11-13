-- Author positive contract for explicit candidate Run host; fixed rewards only.
-- Fixed offer integration fixtures, NOT natural pool generation or balance evidence.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local Run=require('abyss_run');local C=require('abyss_combat');local D=require('abyss_data');local R=require('abyss_sts_random')
local defs=require('abyss_ganyu_native_cards').definitions()
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;assert(type(b)=='table');for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local base=Run.new(D,42,{experimental=true,candidateLifecycle={kind='ganyu',relicEnabled=false}})
for _,card in ipairs(defs.cards)do base.data.cards.cards[#base.data.cards.cards+1]=C.copy(card)end
assert(Run.startCombat(base,'cultist_solo'))
for _,enemy in ipairs(base.combat.enemies)do C.damage(base.combat,base.combat.player,enemy,999,true)end
assert(Run.finishCombat(base));eq(base.phase,'reward')
local count=0
for _,def in ipairs(defs.cards)do for _,up in ipairs({false,true})do
 local run=C.copy(base);run.rewards.cards={def.id};run.rewards.cardUpgrades={up};run.rewards.cardResolved=false
 local uid=run.nextDeckUid;local rng=R.snapshot(run.cardRng);local size=#run.deck
 -- Closing picker is not abandonment; reopen preserves exact offer.
 assert(Run.leaveCombatRewards(run));assert(Run.reopenCombatRewards(run));eq(Run.rewardOptions(run)[1],def.id)
 assert(Run.claimCardReward(run,1));eq(#run.deck,size+1);eq(run.deck[#run.deck].uid,uid);eq(run.deck[#run.deck].upgraded,up)
 same(R.snapshot(run.cardRng),rng);assert(not Run.claimCardReward(run,1));eq(#run.deck,size+1)
 assert(Run.leaveCombatRewards(run));assert(Run.startCombat(run,'cultist_solo'))
 local s=run.combat;local found
 for _,pile in ipairs({s.hand,s.draw})do for i,card in ipairs(pile)do if card.deckUid==uid then found=card;table.remove(pile,i);break end end;if found then break end end
 assert(found,'reward instance absent from next combat');eq(found.cardId,def.id);eq(found.upgraded,up)
 -- Deliberate hand fixture: proves received instance executable, not natural draw access.
 s.hand[#s.hand+1]=found;s.energy=10
 for _,enemy in ipairs(s.enemies)do enemy.hp=100;enemy.maxHp=100;enemy.block=0 end
 eq(s.characterCandidate,'ganyu');eq(s.experimentalMechanics,true);eq(s.ganyuResource.charge,0);assert(Run.play(run,found.uid,1));local located=false
 for _,pile in ipairs({s.discard,s.exhaust})do for _,card in ipairs(pile)do if card.uid==found.uid then located=true;eq(card.deckUid,uid)end end end
 assert(located);count=count+1
end end
-- Unknown content claim must not resolve or grow deck; explicit abandon does.
local rejected=C.copy(base);rejected.rewards.cards={'ganyu_lab_missing'};rejected.rewards.cardUpgrades={false};rejected.rewards.cardResolved=false
local before=C.copy(rejected);assert(not Run.claimCardReward(rejected,1));same(rejected,before)
assert(Run.claimCardReward(rejected,0));eq(rejected.rewards.cardResolved,true);eq(#rejected.deck,#before.deck)
print('PASS '..count..' fixed-offer public native Run claim->persistent UID->candidate next battle->Run.play cases; no natural-pool claim')

-- Explicit synthetic prior resource state proves per-battle reset, not natural acquisition.
for _,enabled in ipairs({false,true})do
 local config={kind='ganyu',relicEnabled=enabled}
 local run=Run.new(D,43,{experimental=true,candidateLifecycle=config});assert(run.candidateLifecycle~=config);config.relicEnabled=not enabled;eq(run.candidateLifecycle.relicEnabled,enabled)
 for _,card in ipairs(defs.cards)do run.data.cards.cards[#run.data.cards.cards+1]=C.copy(card)end
 assert(Run.startCombat(run,'cultist_solo'));local first=run.combat;eq(first.characterCandidate,'ganyu');eq(first.ganyuRelicEnabled,enabled)
 first.player.hp=33;first.ganyuResource.charge=2;first.ganyuResource.storm={amount=7,turns=2}
 for _,enemy in ipairs(first.enemies)do C.damage(first,first.player,enemy,999,true)end;assert(Run.finishCombat(run));eq(run.hp,39) -- default Burning Blood heals6 after the fixture victory
 assert(Run.leaveCombatRewards(run));local before=C.copy(run);assert(not Run.startCombat(run,'missing_encounter'));same(run,before)
 assert(Run.startCombat(run,'cultist_solo'));local second=run.combat;assert(second~=first);assert(second.ganyuResource~=first.ganyuResource);eq(second.ganyuRelicEnabled,enabled);eq(second.player.hp,39);eq(second.ganyuResource.charge,0);eq(second.ganyuResource.storm,nil)
end
print('PASS2 candidate Run private options/HP carryover/failure unchanged/resource reset fixtures')
