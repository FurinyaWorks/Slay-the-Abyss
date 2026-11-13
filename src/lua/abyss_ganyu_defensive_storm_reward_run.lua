-- Explicit 44-definition/42-reward continuation of the reviewed Ganyu experiment.
local Copy=require('abyss_copy').copy
local M={}
function M.new(data,seed,...)
 assert(select('#',...)==0,'candidate reward launcher accepts no external configuration')
 local d=Copy(data);local known={};for _,c in ipairs(d.cards.cards)do known[c.id]=true end
 for _,c in ipairs(require('abyss_ganyu_defensive_storm_definitions').cards)do
  assert(not known[c.id],'candidate reward definition collision')
  local card=Copy(c);card.color='ganyu_candidate';card.sourceId='ganyu-'..c.id:sub(-2)
  card.ganyuSourceSHA256=require('abyss_ganyu_starter_source').sourceSHA256
  d.cards.cards[#d.cards.cards+1]=card
 end
 local run=require('abyss_ganyu_storm_family_reward_run').new(d,seed)
 run.candidateRewardPool='ganyu-reviewed-44-v1'
 return run
end
return M
