-- Finite, same-rarity experiment sampling; formal source sampling is unchanged.
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
 local includeDefensiveStorm=run.candidateRewardPool=='ganyu-reviewed-44-v1'
 local includeStormFamily=run.candidateRewardPool=='ganyu-reviewed-42-v1'or includeDefensiveStorm
 local includeRetrieval=run.candidateRewardPool=='ganyu-reviewed-39-v1'or includeStormFamily
 local includeDraw=run.candidateRewardPool=='ganyu-reviewed-35-v1'or includeRetrieval
 assert(run.candidateRewardPool=='ganyu-reviewed-32-v1'or includeDraw,'unknown candidate reward domain')
 local context=require('abyss_run_candidate').forCombat(run)
 assert(context and context.kind=='ganyu','candidate reward context unavailable')
 assert(not require('abyss_relic_queries').hooks.owns(run,'prismatic_shard'),'experimental_candidate_prismatic_unsupported')
 local pools={common={},uncommon={},rare={}}
 local actual={};for _,c in ipairs(run.data.cards.cards)do actual[c.id]=c end
 for _,source in ipairs(require('abyss_ganyu_reward_catalog').definitions(includeDraw,includeRetrieval,includeStormFamily,includeDefensiveStorm))do
  local c=assert(actual[source.id],'candidate reward definition missing')
  -- Closed generated definitions: no arbitrary extra execution/display fields.
  assert(same(c,source),'candidate reward definition drift')
  if pools[source.rarity]then pools[source.rarity][#pools[source.rarity]+1]=source.id end
 end
 local rng=R.cloneState(run.cardRng)
 local offset,choices=run.cardRarityOffset or 5,{}
 local n=api.rewardCount(run)
 assert(type(n)=='number'and n>=0 and n%1==0 and n<=100,'invalid candidate reward count')
 for _=1,n do
  local rarity=api.rarity(R.randomInt(rng,99),offset,run.encounterTier,run.relics)
  if rarity=='common'then offset=math.max(-40,offset-1)elseif rarity=='rare'then offset=5 end
  local pool=assert(pools[rarity])
  -- Exhausted rarity skips this slot, never rerolls another rarity/identity.
  if #pool>0 then
   local index=R.randomInt(rng,#pool-1)+1
   choices[#choices+1]={cardId=table.remove(pool,index),rarity=rarity}
  end
 end
 assert(#choices>0,'experimental_candidate_reward_empty')
 local ids,upgrades={},{};local chance=require('abyss_acts').get(run.act or 1).upgradeChance
 for i,c in ipairs(choices)do
  ids[i]=c.cardId;upgrades[i]=c.rarity~='rare'and R.randomBooleanChance(rng,chance)or false
 end
 return ids,rng,offset,upgrades
end
return M
