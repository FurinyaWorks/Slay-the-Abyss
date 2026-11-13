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
local allowed={x03='common',x06='common',x07='common',x08='common',x09='uncommon',x10='uncommon',x11='uncommon',x12='uncommon',x13='uncommon',x15='uncommon',x17='rare',x18='rare',x20='uncommon',x21='uncommon',x22='uncommon',x23='uncommon',x38='uncommon'}
function M.validate(run)
 assert(run.candidateRewardPool=='xiao-reviewed-nonbasic-seventeen-v1','unknown Xiao reward domain')
 local context=require('abyss_run_candidate').forCombat(run)
 assert(context and context.kind=='xiao','Xiao reward context unavailable')
 assert(not require('abyss_relic_queries').hooks.owns(run,'prismatic_shard'),'experimental_candidate_prismatic_unsupported')
 local actual={};for _,c in ipairs(run.data.cards.cards)do assert(not actual[c.id],'duplicate catalog identity');actual[c.id]=c end
 local pools={common={},uncommon={},rare={}};local seen={};local n=0
 for _,source in ipairs(require('abyss_xiao_spend_reward_catalog').definitions())do
  local id=source.id:match('^xiao_candidate_(x%d%d)$')
  assert(allowed[id]==source.rarity and not seen[id],'invalid Xiao research source')
  assert(same(actual[source.id],source),'Xiao reward definition drift')
  pools[source.rarity][#pools[source.rarity]+1]=source.id;seen[id]=true;n=n+1
 end
 assert(n==17 and #pools.common==4 and #pools.uncommon==11 and #pools.rare==2,'incomplete Xiao reward source')
 return pools
end
function M.prepare(run,api)
 local pools=M.validate(run)
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
