package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local Run=require('abyss_run');local C=require('abyss_combat');local D=require('abyss_data');local Pool=require('abyss_card_pool');local R=require('abyss_sts_random')
local candidate=dofile('experiments/characters/ganyu-lua/reward-pool.lua');local defs=dofile('experiments/characters/ganyu-lua/definitions.lua')
local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function make(seed)
 local run=Run.new(D,seed);for _,c in ipairs(defs.cards)do run.data.cards.cards[#run.data.cards.cards+1]=C.copy(c)end
 run.data.cards.sourcePools.reward=C.copy(candidate.reward);return run
end
eq(#candidate.reward.common,11);eq(#candidate.reward.uncommon,58);eq(#candidate.reward.rare,4);eq(#candidate.basic,2)
local ids={};for _,pool in pairs(candidate.reward)do for _,id in ipairs(pool)do assert(not ids[id]);ids[id]=true end end
for _,id in ipairs(candidate.basic)do assert(not ids[id])end
local blocked=0
for seed=1,24 do
 local run=make(seed);local before=R.snapshot(run.cardRng)
 local chosen,rng,offset,up=Pool.prepareRewards(run);same(R.snapshot(run.cardRng),before)
 local repeatIds,repeatRng,repeatOffset,repeatUp=Pool.prepareRewards(run)
 same(chosen,repeatIds);same(R.snapshot(rng),R.snapshot(repeatRng));eq(offset,repeatOffset);same(up,repeatUp)
 local stripped=C.copy(run)
 for i=#stripped.data.cards.cards,1,-1 do if stripped.data.cards.cards[i].id:match('^ganyu_lab_')then table.remove(stripped.data.cards.cards,i)end end
 local missingIds,missingRng,missingOffset,missingUp=Pool.prepareRewards(stripped)
 same(chosen,missingIds);same(R.snapshot(rng),R.snapshot(missingRng));eq(offset,missingOffset);same(up,missingUp)
 for _,id in ipairs(chosen)do assert(ids[id]);if not Run.prepareCard(run,id)then blocked=blocked+1 end end
end
assert(blocked>0,'fixture should expose unimplemented rewards, not hide them')
-- Boss rarity remains rare, therefore all current offers are unavailable.
local boss=make(42);boss.encounterTier='boss';local selected,rng=Pool.prepareRewards(boss)
for _,id in ipairs(selected)do local rare=false;for _,r in ipairs(candidate.reward.rare)do if r==id then rare=true end end;assert(rare);eq(Run.prepareCard(boss,id),nil)end
-- Unsupported received content cannot enter the deck, and no reroll is performed.
boss.phase='reward';boss.rewards={cards=selected,cardUpgrades={false,false,false},cardResolved=false}
local old=C.copy(boss);eq(Run.claimCardReward(boss,1),false);same(boss,old)
print('PASS complete 73-card candidate source pool: 24 deterministic native offers, '..blocked..' unavailable draws preserved; boss refusal')
