-- Explicit equal-weight research offer, not STS rarity sampling or a balance decision.
local R=require('abyss_sts_random')
local M={}
local function same(a,b)
 if type(a)~='table'or type(b)~='table'then return a==b end
 if getmetatable(a)or getmetatable(b)then return false end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end
 return true
end
function M.prepare(run,api)
 local support=run.candidateRewardPool=='keqing-reviewed-ten-v1'
 assert(run.candidateRewardPool=='keqing-reviewed-eight-v1'or support,'unknown candidate reward domain')
 local context=require('abyss_run_candidate').forCombat(run)
 assert(context and context.kind=='keqing','candidate reward context unavailable')
 assert(not require('abyss_relic_queries').hooks.owns(run,'prismatic_shard'),'experimental_candidate_prismatic_unsupported')
 local actual={};for _,c in ipairs(run.data.cards.cards)do assert(not actual[c.id],'duplicate candidate catalog identity');actual[c.id]=c end
 local pool={};local seen={}
 local sources=require('abyss_keqing_native_eight').definitions().cards
 if support then for _,c in ipairs(require('abyss_keqing_native_support').definitions().cards)do sources[#sources+1]=c end end
 for _,source in ipairs(sources)do
  assert(source.rarity=='special'and not seen[source.id],'invalid candidate source')
  assert(same(actual[source.id],source),'candidate reward definition drift')
  seen[source.id]=true;pool[#pool+1]=source.id
 end
 assert(#pool==(support and 10 or 8),'invalid reviewed candidate catalog')
 local rng=R.cloneState(run.cardRng);local count=api.rewardCount(run)
 assert(type(count)=='number'and count>=0 and count%1==0 and count<=100,'invalid candidate reward count')
 local ids={}
 for _=1,math.min(count,#pool)do ids[#ids+1]=table.remove(pool,R.randomInt(rng,#pool-1)+1)end
 assert(#ids>0,'experimental_candidate_reward_empty')
 -- No rarity roll/offset change: these eight sources have pending rarity.
 -- Upgrade bits use the existing act chance only after every identity is selected.
 local upgrades={};local chance=require('abyss_acts').get(run.act or 1).upgradeChance
 for i=1,#ids do upgrades[i]=R.randomBooleanChance(rng,chance)end
 return ids,rng,run.cardRarityOffset or 5,upgrades
end
return M
