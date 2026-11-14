-- Reviewed candidate source projection only: zhongli-mechanics-0.41.0, HOLD.
local Copy=require('abyss_copy').copy
local cards={
 {id='zl09',type='attack',cost=1,target='ENEMY',effects={{op='damage',value=5},{op='applyStatus',status='weak',value=1}},upgrade={cost=1,effects={{op='damage',value=7},{op='applyStatus',status='weak',value=2}}}},
 {id='zl34',type='skill',cost=1,target='ENEMY',selfRetain=true,effects={{op='applyStatus',status='weak',value=1}},upgrade={cost=1,effects={{op='applyStatus',status='weak',value=2}}}},
 {id='zl37',type='skill',cost=2,target='SELF',effects={{op='block',value=10},{op='draw',value=1}},upgrade={cost=2,effects={{op='block',value=14},{op='draw',value=2}}}},
 {id='zl45',type='skill',cost=2,target='ENEMY',effects={{op='applyStatus',status='weak',value=1},{op='applyStatus',status='vulnerable',value=1},{op='block',value=3}},upgrade={cost=2,effects={{op='applyStatus',status='weak',value=2},{op='applyStatus',status='vulnerable',value=2},{op='block',value=5}}}}
}
for _,c in ipairs(cards)do
 c.name='HOLD '..c.id;c.sourceId=c.id;c.rarity='common';c.color='zhongli_candidate'
 c.experimental=true;c.zhongliCandidate=true;c.approval='HOLD';c.productionEnabled=false;c.reviewStatus='HOLD'
end
local M={sourceVersion='zhongli-mechanics-0.41.0',modelSHA256='9ed9d430dfe49ecc768202f7b9c8104040edfde4a0ef37d232bee4103827dc34'}
function M.definitions()return Copy(cards)end
return M
