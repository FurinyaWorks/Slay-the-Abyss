package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local F=require('abyss_ganyu_supply_reward_run');local P=require('abyss_candidate_card_rewards');local r=F.new(D,81)
eq(r.candidateRewardPool,'ganyu-reviewed-55-v1');local ds=require('abyss_ganyu_reward_catalog').definitions(true,true,true,true,true,true,true,true);eq(#ds,55)
local counts={common=0,uncommon=0,rare=0,basic=0};for _,d in ipairs(ds)do counts[d.rarity]=counts[d.rarity]+1;assert(d.id~='ganyu_lab_46'and d.id~='ganyu_lab_49'and d.id~='ganyu_lab_67')end
eq(counts.common,11);eq(counts.uncommon,40);eq(counts.rare,2);eq(counts.basic,2)
for _,rarity in ipairs({'common','uncommon','rare'})do local before=C.copy(r);local ids=P.prepare(r,{rewardCount=function()return 100 end,rarity=function()return rarity end});eq(#ids,counts[rarity]);same(r,before);local seen={};for _,id in ipairs(ids)do assert(not seen[id]);seen[id]=true end end
local before=C.copy(r);assert(not pcall(P.prepare,r,{rewardCount=function()return 0 end,rarity=function()return 'common'end}));same(r,before)
print('GANYU_FOLLOW_OLD55_PASS source counts53/finite each rarity/zero/immutable RNG/no new IDs')
