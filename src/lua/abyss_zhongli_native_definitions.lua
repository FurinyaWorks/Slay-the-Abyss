-- Reviewed candidate source projection only: zhongli-mechanics-0.41.0, HOLD.
local Copy=require('abyss_copy').copy
local cards={
 {id='zl07',type='attack',cost=1,target='ENEMY',effects={{op='damage',value=5},{op='block',value=5}},upgrade={cost=1,effects={{op='damage',value=7},{op='block',value=7}}}},
 {id='zl12',type='skill',cost=1,target='SELF',effects={{op='block',value=3},{op='draw',value=1}},upgrade={cost=1,effects={{op='block',value=4},{op='draw',value=2}}}},
 {id='zl13',type='skill',cost=1,target='ENEMY',effects={{op='applyStatus',status='vulnerable',value=2}},upgrade={cost=1,effects={{op='applyStatus',status='vulnerable',value=3}}}},
 {id='zl14',type='attack',cost=2,target='ENEMY',selfRetain=true,effects={{op='damage',value=13}},upgrade={cost=2,effects={{op='damage',value=18}}}},
 {id='zl15',type='skill',cost=2,target='SELF',effects={{op='block',value=8},{op='gainStatus',status='flame_barrier',value=3}},upgrade={cost=2,effects={{op='block',value=11},{op='gainStatus',status='flame_barrier',value=4}}}}
}
for _,c in ipairs(cards)do
 c.name='HOLD '..c.id;c.sourceId=c.id;c.rarity='common';c.color='zhongli_candidate'
 c.experimental=true;c.zhongliCandidate=true;c.approval='HOLD';c.productionEnabled=false;c.reviewStatus='HOLD'
end
local M={sourceVersion='zhongli-mechanics-0.41.0',modelSHA256='9ed9d430dfe49ecc768202f7b9c8104040edfde4a0ef37d232bee4103827dc34'}
function M.definitions()return Copy(cards)end
return M
