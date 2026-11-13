-- Closed finite research launcher. Starter alone owns its four identities and initialization.
local Copy=require('abyss_copy').copy
local M={}
function M.new(data,seed,...)
 assert(select('#',...)==0,'Zhongli reward launcher accepts no external configuration')
 local d=Copy(data);local seen={}
 for _,c in ipairs(d.cards.cards)do assert(not seen[c.id],'duplicate source catalog identity');seen[c.id]=true end
 for _,c in ipairs(require('abyss_zhongli_sixteen_catalog').definitions())do
  if c.id~='zl03'and c.id~='zl04'then
   assert(not seen[c.id],'Zhongli reward definition collision');d.cards.cards[#d.cards.cards+1]=c;seen[c.id]=true
  end
 end
 -- Exactly one call: do not duplicate initialization or permit caller starter overrides.
 local run=require('abyss_zhongli_starter_run').new(d,seed)
 run.candidateRewardPool='zhongli-reviewed-common-sixteen-v1'
 require('abyss_zhongli_sixteen_rewards').validate(run)
 run.zhongliStarterExperiment.rewardDomain='finite-equal-weight-without-replacement'
 run.zhongliStarterExperiment.rewardSourceCount=16
 return run
end
return M
