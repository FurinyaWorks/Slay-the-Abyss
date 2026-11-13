-- Closed research-only acquisition domain; source rarity stays special/pending.
local Copy=require('abyss_copy').copy
local M={}
function M.new(data,seed,...)
 assert(select('#',...)==0,'candidate reward launcher accepts no external configuration')
 local d=Copy(data);local known={};for _,c in ipairs(d.cards.cards)do known[c.id]=true end
 for _,c in ipairs(require('abyss_keqing_native_eight').definitions().cards)do
  assert(not known[c.id],'candidate reward definition collision');known[c.id]=true
  d.cards.cards[#d.cards.cards+1]=c
 end
 local run=require('abyss_keqing_starter_run').new(d,seed)
 run.candidateRewardPool='keqing-reviewed-eight-v1'
 return run
end
return M
