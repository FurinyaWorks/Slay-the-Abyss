-- Candidate content only. Not registered in production or natural reward pools.
-- Source: 89d898c mechanics.mjs/battle.mjs; fixed source snapshot; not a generic converter.
local M={}
function M.definitions()
 return {
 {id='KQ001',name='HOLD KQ001',type='attack',target='ENEMY',cost=1,experimental=true,keqingCandidate=true,rarity='special',color='colorless',effects={{op='damage',value=6}},upgrade={effects={{op='damage',value=9}}}},
 {id='KQ002',name='HOLD KQ002',type='skill',target='SELF',cost=1,experimental=true,keqingCandidate=true,rarity='special',color='colorless',effects={{op='block',value=5}},upgrade={effects={{op='block',value=8}}}},
 {id='KQ003',name='HOLD KQ003',type='attack',target='ENEMY',cost=1,experimental=true,keqingCandidate=true,keqingStage='003',rarity='special',color='colorless',effects={{op='damage',value=5}},upgrade={effects={{op='damage',value=7}}}},
 {id='KQ004',name='HOLD KQ004',type='attack',target='ENEMY',cost=1,experimental=true,keqingCandidate=true,keqingStage='004',rarity='special',color='colorless',effects={{op='damage',value=4,times=2}},upgrade={effects={{op='damage',value=5,times=2}}}},
 }
end
function M.deck(upgraded)
 assert(type(upgraded)=='boolean')
 local out={};for _,id in ipairs({'KQ001','KQ001','KQ001','KQ002','KQ002','KQ002','KQ002','KQ003','KQ003','KQ004'})do out[#out+1]={cardId=id,upgraded=upgraded}end
 return out
end
return M
