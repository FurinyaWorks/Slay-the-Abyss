-- Explicit sixteen-common research domain, preserving the original fourteen definitions.
local Old=require('abyss_zhongli_reward_catalog')
local M={sourceVersion=Old.sourceVersion,modelSHA256=Old.modelSHA256}
function M.definitions()
 local cards=Old.definitions()
 for _,id in ipairs({'zl32','zl40'})do
  local counter=id=='zl32'
  cards[#cards+1]={id=id,name='HOLD '..id,sourceId=id,type='skill',cost=1,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',productionEnabled=false,reviewStatus='HOLD',selfRetain=not counter,exhaust=not counter,
   effects={{op='zhongliCard',kind='spendJade',value=3},counter and{op='gainStatus',status='flame_barrier',value=6}or{op='block',value=12}},
   upgrade={cost=1,effects={{op='zhongliCard',kind='spendJade',value=3},counter and{op='gainStatus',status='flame_barrier',value=8}or{op='block',value=16}}}}
 end
 return cards
end
return M
