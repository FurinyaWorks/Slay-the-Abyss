-- Source rarity stays common. Sampling is explicitly NOT formal rarity distribution.
local R=require('abyss_sts_random')
local M={}
local allowed={zl07=true,zl12=true,zl13=true,zl14=true,zl15=true,zl32=true,zl40=true,zl03=true,zl04=true,zl16=true,zl19=true,zl20=true,zl24=true,zl26=true,zl28=true,zl38=true,zl39=true,zl57=true,zl62=true,zl66=true,zl73=true}
local function same(a,b)
 if type(a)~=type(b)then return false end
 if type(a)~='table'then return a==b end
 if getmetatable(a)or getmetatable(b)then return false end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end;return true
end
function M.validate(run)
 assert(run.candidateRewardPool=='zhongli-reviewed-common-twentyone-v1','unknown Zhongli reward domain')
 local context=require('abyss_run_candidate').forCombat(run)
 assert(context and context.kind=='zhongli','Zhongli reward context unavailable')
 assert(not require('abyss_relic_queries').hooks.owns(run,'prismatic_shard'),'experimental_candidate_prismatic_unsupported')
 local actual={};for _,c in ipairs(run.data.cards.cards)do assert(not actual[c.id],'duplicate candidate catalog identity');actual[c.id]=c end
 local pool,seen={},{}
 for _,source in ipairs(require('abyss_zhongli_twentyone_catalog').definitions())do
  assert(allowed[source.id]and source.rarity=='common'and source.type~='power'and not seen[source.id],'invalid reviewed Zhongli source')
  assert(same(actual[source.id],source),'Zhongli reward definition drift')
  pool[#pool+1]=source.id;seen[source.id]=true
 end
 assert(#pool==21,'incomplete reviewed Zhongli catalog')
 return pool
end
function M.prepare(run,api)
 local pool=M.validate(run)
 local count=api.rewardCount(run)
 assert(type(count)=='number'and count%1==0 and count>=0 and count<=100,'invalid candidate reward count')
 assert(count>0,'experimental_candidate_reward_empty')
 local rng=R.cloneState(run.cardRng);local ids={}
 for _=1,math.min(count,#pool)do ids[#ids+1]=table.remove(pool,R.randomInt(rng,#pool-1)+1)end
 -- Never refill or reroll scarcity. Draw all identities before the act upgrade rolls.
 local upgrades={};local chance=require('abyss_acts').get(run.act or 1).upgradeChance
 for i=1,#ids do upgrades[i]=R.randomBooleanChance(rng,chance)end
 return ids,rng,run.cardRarityOffset or 5,upgrades
end
return M
