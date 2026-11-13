-- Fixed source projection: candidate 89d898c. No installation, hook flag or rewards.
local Copy=require('abyss_copy').copy
local source={cards={
 {id='KQ039',name='HOLD KQ039',type='skill',target='SELF',cost=1,rarity='special',color='keqing_candidate',sourceId='KQ039',experimental=true,keqingCandidate=true,productionEnabled=false,reviewStatus='HOLD',effects={{op='block',value=4},{op='nextBlock',value=4}},upgrade={cost=1,effects={{op='block',value=6},{op='nextBlock',value=6}}}},
 {id='KQ049',name='HOLD KQ049',type='skill',target='SELF',cost=1,rarity='special',color='keqing_candidate',sourceId='KQ049',experimental=true,keqingCandidate=true,productionEnabled=false,reviewStatus='HOLD',effects={{op='escapePlan',value=4}},upgrade={cost=1,effects={{op='escapePlan',value=7}}}}
}}
return{definitions=function()return Copy(source)end}
