-- Frozen research source zhongli-mechanics-0.41.0, sourceVerified=false/HOLD.
local Copy=require('abyss_copy').copy
local cards={
 {id='zl01',type='attack',cost=1,target='ENEMY',effects={{op='damage',value=6}},upgrade={cost=1,effects={{op='damage',value=9}}}},
 {id='zl02',type='skill',cost=1,target='SELF',effects={{op='block',value=5}},upgrade={cost=1,effects={{op='block',value=8}}}},
 {id='zl03',type='skill',cost=2,target='SELF',effects={{op='zhongliCard',kind='gainJade',value=12}},upgrade={cost=2,effects={{op='zhongliCard',kind='gainJade',value=16}}}},
 {id='zl04',type='attack',cost=1,target='ENEMY',effects={{op='zhongliCard',kind='spendJade',value=6},{op='damage',value=14}},upgrade={cost=1,effects={{op='zhongliCard',kind='spendJade',value=6},{op='damage',value=18}}}}
}
for _,c in ipairs(cards)do
 c.name='HOLD '..c.id;c.color='zhongli_candidate';c.sourceId=c.id
 if c.id=='zl01'or c.id=='zl02'then c.rarity='basic'else c.rarity='common'end
 c.experimental=true;c.zhongliCandidate=true;c.productionEnabled=false;c.reviewStatus='HOLD'
end
local M={modelSHA256='9ed9d430dfe49ecc768202f7b9c8104040edfde4a0ef37d232bee4103827dc34',battleSHA256='704cb25268f999dcfbafb6872f96239fcbcfc517b46c69509a04225541afe54b',sourceVersion='zhongli-mechanics-0.41.0'}
function M.definitions()return Copy(cards)end
function M.deck()return {'zl01','zl01','zl01','zl01','zl02','zl02','zl02','zl02','zl03','zl04'}end
return M
