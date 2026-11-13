-- Explicit experimental acquisition domain. Not class selection/shop registration.
local Copy=require('abyss_copy').copy
local M={}
function M.new(data,seed,...)
 assert(select('#',...)==0,'candidate reward launcher accepts no external configuration')
 local d=Copy(data);local known={}
 for _,c in ipairs(d.cards.cards)do known[c.id]=true end
 local starter={ganyu_lab_01=true,ganyu_lab_02=true,ganyu_lab_03=true,ganyu_lab_04=true}
 for _,c in ipairs(require('abyss_ganyu_reward_catalog').definitions())do
  assert(not known[c.id],'candidate reward definition collision')
  if not starter[c.id]then d.cards.cards[#d.cards.cards+1]=c end
 end
 local run=require('abyss_ganyu_starter_run').new(d,seed)
 run.candidateRewardPool='ganyu-reviewed-32-v1'
 return run
end
return M
