-- Explicit experimental provider: generated identities are never replaced.
-- Invoke only after owner freezes the explicitly enabled launcher/provider.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local Run=require('abyss_run');local C=require('abyss_combat');local D=require('abyss_data');local R=require('abyss_sts_random')
local F=require('abyss_ganyu_shot_family_reward_run')
local allowed={};for _,n in ipairs({27,51,9,36,56,14,75,18,31,59,10,25,39,48,3,4,5,6,7,8,11,12,13,15,17,19,21,22,24,26,28,30,32,33,35,41,42,43,45,54,55,57,61,62,63,65,73})do allowed[string.format('ganyu_lab_%02d',n)]=true end
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;assert(type(b)=='table');for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local Pool=require('abyss_card_pool')
local probe=F.new(D,81);local definitions=require('abyss_ganyu_reward_catalog').definitions(true,true,true,true,true,true);eq(#definitions,49)
local eligible=0;for _,d in ipairs(definitions)do if d.rarity~='basic'then eligible=eligible+1 end end;eq(eligible,47)
probe.encounterTier='boss';local only=Pool.prepareRewards(probe);eq(#only,2);assert(only[1]~=only[2]);for _,id in ipairs(only)do assert(id=='ganyu_lab_05'or id=='ganyu_lab_31')end
for _,d in ipairs(probe.data.cards.cards)do if d.id=='ganyu_lab_31'then d.runNativeABI=true end end
assert(not pcall(Pool.prepareRewards,probe))

-- New-domain settlement refuses drift and restores the entire Run/RNG graph.
for _,id in ipairs({'ganyu_lab_27','ganyu_lab_51'})do
 local run=F.new(D,81);assert(Run.startCombat(run,'cultist_solo'));C.damage(run.combat,run.combat.player,run.combat.enemies[1],999,true)
 local definition;for _,d in ipairs(run.data.cards.cards)do if d.id==id then definition=d end end;definition.runNativeABI=true
 local before=C.copy(run);local combat,deck,rng=run.combat,run.deck,run.cardRng
 assert(not pcall(Run.finishCombat,run));same(run,before);assert(run.combat==combat and run.deck==deck and run.cardRng==rng)
 definition.runNativeABI=nil;assert(Run.finishCombat(run))
end
local original=C.copy(D);local current=F.new(D,81);local old=require('abyss_ganyu_shield_charge_reward_run').new(D,81)
for _,key in ipairs({'reward','shop','colorlessShop'})do same(current.data.cards.sourcePools[key],old.data.cards.sourcePools[key])end
for _,color in ipairs({'red','green','blue','purple'})do local n=0;for _,d in ipairs(current.data.cards.cards)do if d.color==color then n=n+1 end end;eq(n,75)end
same(D,original)
for _,d in ipairs(require('abyss_ganyu_reward_catalog').definitions(true,true,true,true,true))do assert(d.id~='ganyu_lab_27'and d.id~='ganyu_lab_51')end

-- New marker only: finite class counts, duplicate rejection and sampling rollback.
local counts={basic=0,common=0,uncommon=0,rare=0};for _,d in ipairs(definitions)do counts[d.rarity]=counts[d.rarity]+1 end
eq(counts.basic,2);eq(counts.common,10);eq(counts.uncommon,35);eq(counts.rare,2)
eq(#require('abyss_ganyu_reward_catalog').definitions(true,true,true,true,true),47)
local oldSample,oldCount,oldRarity=Pool.prepareRewards,Pool.rewardCount,Pool.rarity
local finite=F.new(D,81);Pool.rewardCount=function()return 100 end;Pool.rarity=function()return 'common'end
local all=Pool.prepareRewards(finite);eq(#all,10);local finiteSeen={};for _,id in ipairs(all)do assert(not finiteSeen[id]);finiteSeen[id]=true end
Pool.rewardCount=oldCount;Pool.rarity=oldRarity
for _,mode in ipairs({'empty','prismatic','afterSample','duplicate'})do
 local x=F.new(D,81);assert(Run.startCombat(x,'cultist_solo'));C.damage(x.combat,x.combat.player,x.combat.enemies[1],999,true)
 if mode=='prismatic'then x.relics[#x.relics+1]='prismatic_shard'elseif mode=='duplicate'then x.data.cards.cards[#x.data.cards.cards+1]=C.copy(x.data.cards.cards[1])end
 local before=C.copy(x);local refs={x.cardRng,x.combat,x.deck,x.rewards}
 if mode=='empty'then Pool.rewardCount=function()return 0 end elseif mode=='afterSample'then Pool.prepareRewards=function(r)local a,b,c,d=oldSample(r);error('after_sample_probe')end end
 local ok=pcall(Run.finishCombat,x);Pool.rewardCount=oldCount;Pool.prepareRewards=oldSample
 assert(not ok);same(x,before);assert(x.cardRng==refs[1]and x.combat==refs[2]and x.deck==refs[3]and x.rewards==refs[4])
 if mode=='prismatic'then table.remove(x.relics)elseif mode=='duplicate'then table.remove(x.data.cards.cards)end
 assert(Run.finishCombat(x))
end

local seen={};local plays=0;local newPlayed={}
for seed=1,128 do
 local run=F.new(D,seed);assert(Run.startCombat(run,'cultist_solo'))
 -- Controlled victory, but reward identities/upgrade bits are never injected.
 for _,enemy in ipairs(run.combat.enemies)do C.damage(run.combat,run.combat.player,enemy,999,true)end
 assert(Run.finishCombat(run));eq(run.phase,'reward')
 local offers=Run.rewardOptions(run);assert(#offers>0 and #offers<=3)
 local used={};for _,id in ipairs(offers)do assert(allowed[id],'outside admitted reward pool: '..id);assert(not used[id]);used[id]=true;seen[id]=true end
 local pick=1;for i,id in ipairs(offers)do if (id=='ganyu_lab_27'or id=='ganyu_lab_51')and not newPlayed[id]then pick=i;break end end
 local id=offers[pick];local up=run.rewards.cardUpgrades[pick]==true;local uid=run.nextDeckUid;local rng=R.snapshot(run.cardRng)
 assert(Run.leaveCombatRewards(run));assert(Run.reopenCombatRewards(run));same(Run.rewardOptions(run),offers)
 if seed==1 then
  local obtain=Run.obtainCard;local reached=false;local saved=C.copy(run);local deck,flow,rewards=run.deck,run.nodeFlow,run.rewards
  Run.obtainCard=function(...)local v=obtain(...);reached=true;error('post_obtain_probe')end
  local ok,why=Run.claimCardReward(run,pick);Run.obtainCard=obtain;assert(reached and not ok and why=='transaction_failed');same(run,saved);assert(run.deck==deck and run.nodeFlow==flow and run.rewards==rewards)
 end
 assert(Run.claimCardReward(run,pick));same(R.snapshot(run.cardRng),rng);eq(run.deck[#run.deck].uid,uid);eq(run.deck[#run.deck].cardId,id);eq(run.deck[#run.deck].upgraded,up)
 local before=C.copy(run);assert(not Run.claimCardReward(run,pick));same(run,before)
 assert(Run.leaveCombatRewards(run));assert(Run.startCombat(run,'cultist_solo'));local s=run.combat;local card
 for _,pile in ipairs({s.hand,s.draw,s.discard})do for i,v in ipairs(pile)do if v.deckUid==uid then card=table.remove(pile,i);break end end;if card then break end end
 assert(card);eq(card.cardId,id);eq(card.upgraded,up);s.hand[#s.hand+1]=card;s.energy=10
 for _,enemy in ipairs(s.enemies)do enemy.hp=100;enemy.maxHp=100;enemy.block=0 end
 local energy=s.energy;assert(Run.play(run,card.uid,1));
 if id=='ganyu_lab_27'or id=='ganyu_lab_51'then eq(s.energy,energy-(id=='ganyu_lab_27'and 2 or 1));eq(s.ganyuResource.charge,0);local expected=id=='ganyu_lab_27'and s.discard or s.exhaust;local actual=false;for _,v in ipairs(expected)do if v==card then actual=true end end;assert(actual)end;local found=false;for _,pile in ipairs({s.discard,s.exhaust})do for _,v in ipairs(pile)do if v==card then found=true end end end;assert(found);plays=plays+1;if id=='ganyu_lab_27'or id=='ganyu_lab_51'then newPlayed[id]=true end
 if newPlayed.ganyu_lab_27 and newPlayed.ganyu_lab_51 and seed>=12 then break end
end
assert(newPlayed.ganyu_lab_27 and newPlayed.ganyu_lab_51,'both shot identities must be naturally offered, claimed and paid')
local n=0;for _ in pairs(seen)do n=n+1 end
print('SHOT_FAMILY_GENERATED_REWARD_RUN_PASS '..plays..' actual sampled claim->deckUid->next Run.play; '..n..' distinct offer IDs observed, not full pool coverage; controlled victory/hand placement')
