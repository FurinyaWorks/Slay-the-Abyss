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
 local draw=run.candidateRewardPool=='keqing-reviewed-twentythree-v1'
 local guard=run.candidateRewardPool=='keqing-reviewed-twentyone-v1'or draw
 local conversion=run.candidateRewardPool=='keqing-reviewed-eighteen-v1'or guard
 local setup=run.candidateRewardPool=='keqing-reviewed-sixteen-v1'or conversion
 local conditional=run.candidateRewardPool=='keqing-reviewed-thirteen-v1'or setup
 local support=run.candidateRewardPool=='keqing-reviewed-ten-v1'or conditional
 assert(run.candidateRewardPool=='keqing-reviewed-eight-v1'or support,'unknown candidate reward domain')
 local context=require('abyss_run_candidate').forCombat(run)
 assert(context and context.kind=='keqing','candidate reward context unavailable')
 assert(not require('abyss_relic_queries').hooks.owns(run,'prismatic_shard'),'experimental_candidate_prismatic_unsupported')
 local actual={};for _,c in ipairs(run.data.cards.cards)do assert(not actual[c.id],'duplicate candidate catalog identity');actual[c.id]=c end
 local pool={};local seen={}
 local sources=require('abyss_keqing_native_eight').definitions().cards
 if support then for _,c in ipairs(require('abyss_keqing_native_support').definitions().cards)do sources[#sources+1]=c end end
 if conditional then for _,c in ipairs(require('abyss_keqing_conditional_attacks').definitions().cards)do sources[#sources+1]=c end end
 if setup then for _,c in ipairs(require('abyss_keqing_setup_cards').definitions().cards)do sources[#sources+1]=c end end
 if conversion then for _,c in ipairs(require('abyss_keqing_conversion_cards').definitions().cards)do sources[#sources+1]=c end end
 if guard then for _,c in ipairs(require('abyss_keqing_guard_cards').definitions().cards)do sources[#sources+1]=c end end
 if draw then for _,c in ipairs(require('abyss_keqing_draw_cards').definitions().cards)do sources[#sources+1]=c end end
 for _,source in ipairs(sources)do
  assert(source.rarity=='special'and not seen[source.id],'invalid candidate source')
  assert(same(actual[source.id],source),'candidate reward definition drift')
  seen[source.id]=true;pool[#pool+1]=source.id
 end
 assert(#pool==(draw and 23 or guard and 21 or conversion and 18 or setup and 16 or conditional and 13 or support and 10 or 8),'invalid reviewed candidate catalog')
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
