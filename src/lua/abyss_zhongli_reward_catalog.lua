-- Frozen reviewed source projection; all fourteen retain source common/HOLD.
local Copy=require('abyss_copy').copy
local extras={
{id='zl16',name='待命名·zl16',type='skill',cost=1,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',effects={{op='zhongliCard',kind='spendJade',value=6},{op='block',value=16}},upgrade={effects={{op='zhongliCard',kind='spendJade',value=6},{op='block',value=21}}}},
{id='zl19',name='待命名·zl19',type='skill',cost=2,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',exhaust=true,effects={{op='zhongliCard',kind='gainJade',value=6},{op='draw',value=2}},upgrade={effects={{op='zhongliCard',kind='gainJade',value=8},{op='draw',value=3}}}},
{id='zl20',name='待命名·zl20',type='skill',cost=1,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',effects={{op='zhongliCard',kind='emptyJade',value=9}},upgrade={effects={{op='zhongliCard',kind='emptyJade',value=12}}}},
{id='zl24',name='待命名·zl24',type='skill',cost=1,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',exhaust=true,effects={{op='zhongliCard',kind='spendJade',value=3},{op='draw',value=3}},upgrade={effects={{op='zhongliCard',kind='spendJade',value=3},{op='draw',value=4}}}},
{id='zl26',name='待命名·zl26',type='skill',cost=2,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',selfRetain=true,effects={{op='zhongliCard',kind='gainJade',value=10}},upgrade={effects={{op='zhongliCard',kind='gainJade',value=14}}}},
{id='zl28',name='待命名·zl28',type='skill',cost=2,target='ENEMY',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',effects={{op='zhongliCard',kind='gainJade',value=5},{op='applyStatus',status='weak',value=2}},upgrade={effects={{op='zhongliCard',kind='gainJade',value=7},{op='applyStatus',status='weak',value=3}}}},
{id='zl38',name='待命名·zl38',type='skill',cost=0,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',exhaust=true,effects={{op='zhongliCard',kind='gainJade',value=2}},upgrade={effects={{op='zhongliCard',kind='gainJade',value=3}}}},
{id='zl39',name='待命名·zl39',type='attack',cost=0,target='ENEMY',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',exhaust=true,effects={{op='zhongliCard',kind='spendJade',value=3},{op='damage',value=6}},upgrade={effects={{op='zhongliCard',kind='spendJade',value=3},{op='damage',value=8}}}},
{id='zl57',name='待命名·zl57',type='skill',cost=1,target='ENEMY',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',effects={{op='zhongliCard',kind='spendJade',value=3},{op='applyStatus',status='weak',value=3}},upgrade={effects={{op='zhongliCard',kind='spendJade',value=3},{op='applyStatus',status='weak',value=4}}}},
{id='zl62',name='待命名·zl62',type='skill',cost=1,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',exhaust=true,effects={{op='zhongliCard',kind='emptyJade',value=6},{op='draw',value=1}},upgrade={effects={{op='zhongliCard',kind='emptyJade',value=8},{op='draw',value=2}}}},
{id='zl66',name='待命名·zl66',type='skill',cost=2,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',effects={{op='zhongliCard',kind='gainJade',value=5},{op='gainStatus',status='flame_barrier',value=3}},upgrade={effects={{op='zhongliCard',kind='gainJade',value=7},{op='gainStatus',status='flame_barrier',value=4}}}},
{id='zl73',name='待命名·zl73',type='skill',cost=0,target='ENEMY',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',exhaust=true,effects={{op='zhongliCard',kind='spendJade',value=3},{op='applyStatus',status='weak',value=1}},upgrade={effects={{op='zhongliCard',kind='spendJade',value=3},{op='applyStatus',status='weak',value=2}}}},
}
for _,c in ipairs(extras)do
 c.name='HOLD '..c.id;c.sourceId=c.id;c.productionEnabled=false;c.reviewStatus='HOLD'
 c.upgrade.cost=c.cost
end
local M={sourceVersion='zhongli-mechanics-0.41.0',modelSHA256='9ed9d430dfe49ecc768202f7b9c8104040edfde4a0ef37d232bee4103827dc34'}
function M.definitions()
 local cards={}
 for _,c in ipairs(require('abyss_zhongli_starter_source').definitions())do
  if c.id=='zl03'or c.id=='zl04'then cards[#cards+1]=c end
 end
 for _,c in ipairs(extras)do cards[#cards+1]=Copy(c)end
 return cards
end
return M
