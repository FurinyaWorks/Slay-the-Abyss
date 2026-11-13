-- Closed finite research domain: no caller pool override or formal menu registration.
local Copy=require('abyss_copy').copy
local M={}
local ownedByStarter={xiao_candidate_x03=true,xiao_candidate_x06=true,xiao_candidate_x07=true,xiao_candidate_x08=true}
function M.new(data,seed,...)
 assert(select('#',...)==0,'Xiao research launcher accepts no external configuration')
 local d=Copy(data);local seen={}
 for _,c in ipairs(d.cards.cards)do assert(not seen[c.id],'duplicate input catalog identity');seen[c.id]=true end
 for _,c in ipairs(require('abyss_xiao_reward_catalog').definitions())do
  assert(not seen[c.id],'Xiao reward definition collision')
  if not ownedByStarter[c.id]then d.cards.cards[#d.cards.cards+1]=c;seen[c.id]=true end
 end
 -- Starter is the sole initializer and injects its own eight definitions once.
 local run=require('abyss_xiao_starter_run').new(d,seed)
 run.candidateRewardPool='xiao-reviewed-nonbasic-twelve-v1'
 require('abyss_xiao_card_rewards').validate(run)
 run.xiaoRewardExperiment={sourceCount=12,common=4,uncommon=6,rare=2,
  mode='finite-same-rarity-without-replacement',approval='HOLD',productionEnabled=false}
 return run
end
return M
