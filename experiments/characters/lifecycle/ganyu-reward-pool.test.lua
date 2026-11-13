package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local Run=require('abyss_run');local D=require('abyss_data')
local F=require('abyss_ganyu_reward_run');local Pool=require('abyss_card_pool');local Random=require('abyss_sts_random')
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;assert(type(b)=='table');for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local before=C.copy(D);local r=F.new(D,42);same(D,before)
local counts={basic=0,common=0,uncommon=0,rare=0};local defs={}
for _,c in ipairs(r.data.cards.cards)do if c.color=='ganyu_candidate'then counts[c.rarity]=counts[c.rarity]+1;defs[c.id]=c end end
same(counts,{basic=2,common=10,uncommon=19,rare=1});eq(#r.deck,10);local baseline=require('abyss_ganyu_starter_run').new(D,42)
for _,key in ipairs({'reward','shop','colorlessShop'})do same(r.data.cards.sourcePools[key],baseline.data.cards.sourcePools[key])end
for _,color in ipairs({'red','green','blue','purple'})do local n=0;for _,c in ipairs(r.data.cards.cards)do if c.color==color then n=n+1 end end;eq(n,75)end
r.encounterTier='boss';local initial=C.copy(r);local ids,rng,offset,up=Pool.prepareRewards(r)
eq(#ids,1);eq(ids[1],'ganyu_lab_05');eq(up[1],false);same(r,initial)
local again,rng2,offset2,up2=Pool.prepareRewards(r);same(ids,again);same(rng,rng2);eq(offset,offset2);same(up,up2)
r.relics[#r.relics+1]='question_card';eq(#Pool.prepareRewards(r),1)
-- Finite exhausted common bucket: 25 requested slots produce exactly ten IDs.
local oldRarity,oldCount=Pool.rarity,Pool.rewardCount
Pool.rarity=function()return 'common'end;Pool.rewardCount=function()return 25 end
local common=Pool.prepareRewards(r);eq(#common,10);local seen={};for _,id in ipairs(common)do assert(not seen[id]);seen[id]=true;eq(defs[id].rarity,'common')end
Pool.rarity,Pool.rewardCount=oldRarity,oldCount
-- Explicit zero choices fails without mutating RNG or any Run data.
Pool.rewardCount=function()return 0 end;local snap=C.copy(r);local ok,err=pcall(Pool.prepareRewards,r);assert(not ok and tostring(err):find('experimental_candidate_reward_empty',1,true));same(r,snap);Pool.rewardCount=oldCount
r.relics[#r.relics+1]='prismatic_shard';snap=C.copy(r);ok,err=pcall(Pool.prepareRewards,r);assert(not ok and tostring(err):find('experimental_candidate_prismatic_unsupported',1,true));same(r,snap)
-- Altered runtime flags must never be offered as unplayable source rewards.
for _,key in ipairs({'runNativeABI','silentFinalCard','originalV4','costMode','keqingCandidate','xiaoCandidate','zhongliCandidate','unknownField'})do
 local x=F.new(D,79);assert(Run.startCombat(x,'cultist_solo'))
 for _,enemy in ipairs(x.combat.enemies)do C.damage(x.combat,x.combat.player,enemy,999,true)end
 for _,card in ipairs(x.data.cards.cards)do if card.id=='ganyu_lab_05'then card[key]=true end end
 x.encounterTier='boss';local saved=C.copy(x);local deck,rngRef,combat=x.deck,x.cardRng,x.combat
 local yes,why=pcall(Run.finishCombat,x)
 assert(not yes and tostring(why):find('candidate reward definition drift',1,true));same(x,saved)
 assert(x.deck==deck and x.cardRng==rngRef and x.combat==combat)
 for _,card in ipairs(x.data.cards.cards)do if card.id=='ganyu_lab_05'then card[key]=nil end end
 assert(Run.finishCombat(x));eq(#x.rewards.cards,1)
end
-- Whole Run publication failure must restore the victory state and RNG references.
local function victory(seed)
 local run=F.new(D,seed);assert(Run.startCombat(run,'cultist_solo'))
 for _,enemy in ipairs(run.combat.enemies)do C.damage(run.combat,run.combat.player,enemy,999,true)end
 return run
end
local run=victory(77);snap=C.copy(run);local refs={run.data,run.deck,run.cardRng,run.combat,run.combat.player}
local old=Pool.prepareRewards
Pool.prepareRewards=function(owner)local a,b,c,d=old(owner);error('after_candidate_sampling')end
ok,err=pcall(Run.finishCombat,run);Pool.prepareRewards=old
assert(not ok and tostring(err):find('after_candidate_sampling',1,true));same(run,snap)
for i,v in ipairs({run.data,run.deck,run.cardRng,run.combat,run.combat.player})do assert(rawequal(v,refs[i]))end
assert(Run.finishCombat(run));assert(#run.rewards.cards>0);local offered=C.copy(run.rewards.cards)
assert(Run.leaveCombatRewards(run));assert(Run.reopenCombatRewards(run));same(run.rewards.cards,offered)
-- Empty and Prismatic failures occur through real settlement, not just direct pool calls.
for _,kind in ipairs({'empty','prismatic'})do
 local x=victory(78);if kind=='prismatic'then x.relics[#x.relics+1]='prismatic_shard'else Pool.rewardCount=function()return 0 end end
 local saved=C.copy(x);local deck,rngRef=x.deck,x.cardRng
 ok,err=pcall(Run.finishCombat,x);Pool.rewardCount=oldCount
 assert(not ok);assert(tostring(err):find(kind=='empty'and 'experimental_candidate_reward_empty'or 'experimental_candidate_prismatic_unsupported',1,true));same(x,saved);assert(x.deck==deck and x.cardRng==rngRef)
 if kind=='prismatic'then table.remove(x.relics)end;assert(Run.finishCombat(x))
end
-- Formal path exact output stays identical with no experiment marker.
local plain=Run.new(D,42);local saved=C.copy(plain);local a,b,c,d=old(plain);same(plain,saved)
local a2,b2,c2,d2=old(plain);same(a,a2);same(b,b2);eq(c,c2);same(d,d2)
assert(not pcall(F.new,D,42,{}));same(D,before)
print('GANYU_REWARD_POOL_PASS catalog32/reward30/boss-short/common-exhaustion/zero/Prismatic/wholeRun/RNG/formal')
