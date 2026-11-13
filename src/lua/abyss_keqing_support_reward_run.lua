-- Explicit ten-card research reward domain, preserving source special/HOLD rarity.
local Copy=require('abyss_copy').copy
local M={}
function M.new(data,seed,...)
 assert(select('#',...)==0,'candidate reward launcher accepts no external configuration')
 local d=Copy(data);local known={};for _,c in ipairs(d.cards.cards)do known[c.id]=true end
 for _,c in ipairs(require('abyss_keqing_native_support').definitions().cards)do
  assert(not known[c.id],'candidate reward definition collision');d.cards.cards[#d.cards.cards+1]=c
 end
 local run=require('abyss_keqing_reward_run').new(d,seed)
 run.candidateRewardPool='keqing-reviewed-ten-v1'
 return run
end
return M
