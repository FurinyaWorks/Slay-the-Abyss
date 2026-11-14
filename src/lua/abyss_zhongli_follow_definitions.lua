-- Reviewed candidate source projection only: zhongli-mechanics-0.41.0, HOLD.
local Copy=require('abyss_copy').copy
local cards={
 {id='zl47',type='attack',cost=1,target='ENEMY',selfRetain=true,effects={{op='damage',value=2},{op='zhongliCard',kind='gainJade',value=3}},upgrade={cost=1,effects={{op='damage',value=4},{op='zhongliCard',kind='gainJade',value=4}}}},
 {id='zl56',type='skill',cost=2,target='SELF',selfRetain=true,effects={{op='block',value=9},{op='zhongliCard',kind='gainJade',value=3}},upgrade={cost=2,effects={{op='block',value=12},{op='zhongliCard',kind='gainJade',value=4}}}},
 {id='zl70',type='attack',cost=2,target='ENEMY',exhaust=true,effects={{op='damage',value=8},{op='zhongliCard',kind='gainJade',value=7}},upgrade={cost=2,effects={{op='damage',value=11},{op='zhongliCard',kind='gainJade',value=9}}}}
}
for _,c in ipairs(cards)do
 local txt=require('abyss_zhongli_follow_text')[c.id];c.text=txt[1];c.upgrade.text=txt[2]
 c.name='HOLD '..c.id;c.sourceId=c.id;c.rarity='common';c.color='zhongli_candidate'
 c.experimental=true;c.zhongliCandidate=true;c.approval='HOLD';c.productionEnabled=false;c.reviewStatus='HOLD'
end
local M={sourceVersion='zhongli-mechanics-0.41.0',modelSHA256='9ed9d430dfe49ecc768202f7b9c8104040edfde4a0ef37d232bee4103827dc34'}
function M.definitions()return Copy(cards)end
return M
