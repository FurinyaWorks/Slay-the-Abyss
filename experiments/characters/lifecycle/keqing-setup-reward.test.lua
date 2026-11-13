package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local Run=require('abyss_run');local D=require('abyss_data')
local F=require('abyss_keqing_setup_reward_run');local Pool=require('abyss_card_pool')
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;assert(type(b)=='table');for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local allowed={KQ005=true,KQ009=true,KQ019=true,KQ034=true,KQ052=true,KQ053=true,KQ054=true,KQ055=true,KQ039=true,KQ049=true,KQ008=true,KQ018=true,KQ025=true,KQ010=true,KQ011=true,KQ013=true}
local before=C.copy(D);local r=F.new(D,42);same(D,before);eq(r.hp,60);eq(#r.deck,10)
local baseline=require('abyss_keqing_starter_run').new(D,42)
for _,key in ipairs({'reward','shop','colorlessShop'})do same(r.data.cards.sourcePools[key],baseline.data.cards.sourcePools[key])end
for _,color in ipairs({'red','green','blue','purple'})do local n=0;for _,c in ipairs(r.data.cards.cards)do if c.color==color then n=n+1 end end;eq(n,75)end
local oldCount=Pool.rewardCount
Pool.rewardCount=function()return 20 end;r.encounterTier='boss';local snap=C.copy(r)
local ids,rng,offset,ups=Pool.prepareRewards(r);eq(#ids,16);eq(offset,r.cardRarityOffset or 5);same(r,snap)
local seen={};for _,id in ipairs(ids)do assert(allowed[id]and not seen[id]);seen[id]=true end
local ids2,rng2,offset2,ups2=Pool.prepareRewards(r);same(ids,ids2);same(rng,rng2);eq(offset,offset2);same(ups,ups2);Pool.rewardCount=oldCount
local function victory(seed)
 local x=F.new(D,seed);assert(Run.startCombat(x,'cultist_solo'))
 C.damage(x.combat,x.combat.player,x.combat.enemies[1],999,true)
 return x
end
-- Complete source drift refusal, actual settlement rollback and valid retry.
for _,flag in ipairs({'runNativeABI','silentFinalCard','originalV4','costMode','xiaoCandidate','ganyuCandidate','zhongliCandidate','unknownField'})do
 local x=victory(44);local card;for _,v in ipairs(x.data.cards.cards)do if v.id=='KQ013'then card=v end end;card[flag]=true
 local saved=C.copy(x);local rngRef,combat,deck=x.cardRng,x.combat,x.deck
 local ok,why=pcall(Run.finishCombat,x);assert(not ok and tostring(why):find('candidate reward definition drift',1,true));same(x,saved)
 assert(x.cardRng==rngRef and x.combat==combat and x.deck==deck);card[flag]=nil;assert(Run.finishCombat(x))
end
for _,mode in ipairs({'empty','prismatic','afterSampling'})do
 local x=victory(46);if mode=='prismatic'then x.relics[#x.relics+1]='prismatic_shard'end
 local saved=C.copy(x);local refs={x.cardRng,x.combat,x.deck};local old=Pool.prepareRewards
 if mode=='empty'then Pool.rewardCount=function()return 0 end end
 if mode=='afterSampling'then Pool.prepareRewards=function(owner)local a,b,c,d=old(owner);error('after_sampling')end end
 local ok,why=pcall(Run.finishCombat,x);Pool.rewardCount=oldCount;Pool.prepareRewards=old
 assert(not ok);assert(tostring(why):find(mode=='empty'and 'experimental_candidate_reward_empty'or mode=='prismatic'and 'experimental_candidate_prismatic_unsupported'or 'after_sampling',1,true));same(x,saved)
 assert(x.cardRng==refs[1]and x.combat==refs[2]and x.deck==refs[3]);if mode=='prismatic'then table.remove(x.relics)end;assert(Run.finishCombat(x))
end
local observed={};local plays=0
for seed=42,49 do
 local x=victory(seed);assert(Run.finishCombat(x));local options=Run.rewardOptions(x);eq(#options,3)
 local unique={};for _,id in ipairs(options)do assert(allowed[id]and not unique[id]);unique[id]=true;observed[id]=true end
 local id,up=options[1],x.rewards.cardUpgrades[1];local uid=x.nextDeckUid;local cardRng=C.copy(x.cardRng)
 assert(Run.leaveCombatRewards(x));assert(Run.reopenCombatRewards(x));same(Run.rewardOptions(x),options)
 assert(Run.claimCardReward(x,1));same(x.cardRng,cardRng);eq(x.deck[#x.deck].uid,uid);eq(x.deck[#x.deck].cardId,id);eq(x.deck[#x.deck].upgraded,up)
 snap=C.copy(x);assert(not Run.claimCardReward(x,1));same(x,snap)
 assert(Run.leaveCombatRewards(x));assert(Run.startCombat(x,'cultist_solo'));local s=x.combat;local card
 for _,pile in ipairs({s.hand,s.draw,s.discard})do for i,v in ipairs(pile)do if v.deckUid==uid then card=table.remove(pile,i);break end end;if card then break end end
 assert(card);s.hand[#s.hand+1]=card;s.energy=10;s.enemies[1].hp=100;s.enemies[1].maxHp=100
 assert(Run.play(x,card.uid,1));local found=false;for _,pile in ipairs({s.discard,s.exhaust})do for _,v in ipairs(pile)do if v==card then found=true end end end;assert(found);plays=plays+1
end
local count=0;for _ in pairs(observed)do count=count+1 end
assert(not pcall(F.new,D,42,{}));same(D,before)
print('KEQING_SETUP_GENERATED_REWARD_PASS '..plays..' actual sampled claim/UID/Run.play; '..count..' distinct observed; victory and hand placement fixtures')
print('KEQING_SETUP_REWARD_DOMAIN_PASS bounded16/special/noRarityRoll/zero/Prismatic/fullSource/wholeRun/formalPools')
