-- Explicit experimental provider: generated identities are never replaced.
-- Invoke only after owner freezes the explicitly enabled launcher/provider.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local Run=require('abyss_run');local C=require('abyss_combat');local D=require('abyss_data');local R=require('abyss_sts_random')
local F=require('abyss_ganyu_storm_family_reward_run')
local allowed={};for _,n in ipairs({18,31,59,10,25,39,48,3,4,5,6,7,8,11,12,13,15,17,19,21,22,24,26,28,30,32,33,35,41,42,43,45,54,55,57,61,62,63,65,73})do allowed[string.format('ganyu_lab_%02d',n)]=true end
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;assert(type(b)=='table');for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local Pool=require('abyss_card_pool')
local probe=F.new(D,81);local definitions=require('abyss_ganyu_reward_catalog').definitions(true,true,true);eq(#definitions,42)
local eligible=0;for _,d in ipairs(definitions)do if d.rarity~='basic'then eligible=eligible+1 end end;eq(eligible,40)
probe.encounterTier='boss';local only=Pool.prepareRewards(probe);eq(#only,2);assert(only[1]~=only[2]);for _,id in ipairs(only)do assert(id=='ganyu_lab_05'or id=='ganyu_lab_31')end
for _,d in ipairs(probe.data.cards.cards)do if d.id=='ganyu_lab_31'then d.runNativeABI=true end end
assert(not pcall(Pool.prepareRewards,probe))
local seen={};local plays=0
for seed=81,92 do
 local run=F.new(D,seed);assert(Run.startCombat(run,'cultist_solo'))
 -- Controlled victory, but reward identities/upgrade bits are never injected.
 for _,enemy in ipairs(run.combat.enemies)do C.damage(run.combat,run.combat.player,enemy,999,true)end
 assert(Run.finishCombat(run));eq(run.phase,'reward')
 local offers=Run.rewardOptions(run);assert(#offers>0 and #offers<=3)
 local used={};for _,id in ipairs(offers)do assert(allowed[id],'outside admitted reward pool: '..id);assert(not used[id]);used[id]=true;seen[id]=true end
 local id=offers[1];local up=run.rewards.cardUpgrades[1]==true;local uid=run.nextDeckUid;local rng=R.snapshot(run.cardRng)
 assert(Run.leaveCombatRewards(run));assert(Run.reopenCombatRewards(run));same(Run.rewardOptions(run),offers)
 assert(Run.claimCardReward(run,1));same(R.snapshot(run.cardRng),rng);eq(run.deck[#run.deck].uid,uid);eq(run.deck[#run.deck].cardId,id);eq(run.deck[#run.deck].upgraded,up)
 local before=C.copy(run);assert(not Run.claimCardReward(run,1));same(run,before)
 assert(Run.leaveCombatRewards(run));assert(Run.startCombat(run,'cultist_solo'));local s=run.combat;local card
 for _,pile in ipairs({s.hand,s.draw,s.discard})do for i,v in ipairs(pile)do if v.deckUid==uid then card=table.remove(pile,i);break end end;if card then break end end
 assert(card);eq(card.cardId,id);eq(card.upgraded,up);s.hand[#s.hand+1]=card;s.energy=10
 for _,enemy in ipairs(s.enemies)do enemy.hp=100;enemy.maxHp=100;enemy.block=0 end
 assert(Run.play(run,card.uid,1));local found=false;for _,pile in ipairs({s.discard,s.exhaust})do for _,v in ipairs(pile)do if v==card then found=true end end end;assert(found);plays=plays+1
end
local n=0;for _ in pairs(seen)do n=n+1 end
print('STORM_FAMILY_GENERATED_REWARD_RUN_PASS '..plays..' actual sampled claim->deckUid->next Run.play; '..n..' distinct offer IDs observed, not full pool coverage; controlled victory/hand placement')
