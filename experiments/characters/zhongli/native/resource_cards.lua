-- Role-only 03/04/19/20/24/62 contract. Host owns dynamic energy cost, UID movement and transaction.
local R=require('experiments.characters.zhongli.native.jade_resource')
local L=require('experiments.characters.zhongli.native.lifecycle')
local Copy=require('abyss_copy').copy
local Actors=require('abyss_actor')
local M={}
local definitions={
 {id='zl03',name='待命名·zl03',type='skill',cost=2,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',effects={{op='zhongliCard',kind='gainJade',value=12}},upgrade={effects={{op='zhongliCard',kind='gainJade',value=16}}}},
 {id='zl04',name='待命名·zl04',type='attack',cost=1,target='ENEMY',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',effects={{op='zhongliCard',kind='spendJade',value=6},{op='damage',value=14}},upgrade={effects={{op='zhongliCard',kind='spendJade',value=6},{op='damage',value=18}}}},
 {id='zl20',name='待命名·zl20',type='skill',cost=1,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',effects={{op='zhongliCard',kind='emptyJade',value=9}},upgrade={effects={{op='zhongliCard',kind='emptyJade',value=12}}}},
 {id='zl62',name='待命名·zl62',type='skill',cost=1,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',exhaust=true,effects={{op='zhongliCard',kind='emptyJade',value=6},{op='draw',value=1}},upgrade={effects={{op='zhongliCard',kind='emptyJade',value=8},{op='draw',value=2}}}}
,
 {id='zl19',name='待命名·zl19',type='skill',cost=2,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',exhaust=true,effects={{op='zhongliCard',kind='gainJade',value=6},{op='draw',value=2}},upgrade={effects={{op='zhongliCard',kind='gainJade',value=8},{op='draw',value=3}}}},
 {id='zl24',name='待命名·zl24',type='skill',cost=1,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',exhaust=true,effects={{op='zhongliCard',kind='spendJade',value=3},{op='draw',value=3}},upgrade={effects={{op='zhongliCard',kind='spendJade',value=3},{op='draw',value=4}}}}
,
 {id='zl16',name='待命名·zl16',type='skill',cost=1,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',effects={{op='zhongliCard',kind='spendJade',value=6},{op='block',value=16}},upgrade={effects={{op='zhongliCard',kind='spendJade',value=6},{op='block',value=21}}}},
 {id='zl57',name='待命名·zl57',type='skill',cost=1,target='ENEMY',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',effects={{op='zhongliCard',kind='spendJade',value=3},{op='applyStatus',status='weak',value=3}},upgrade={effects={{op='zhongliCard',kind='spendJade',value=3},{op='applyStatus',status='weak',value=4}}}}
,
 {id='zl26',name='待命名·zl26',type='skill',cost=2,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',selfRetain=true,effects={{op='zhongliCard',kind='gainJade',value=10}},upgrade={effects={{op='zhongliCard',kind='gainJade',value=14}}}},
 {id='zl38',name='待命名·zl38',type='skill',cost=0,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',exhaust=true,effects={{op='zhongliCard',kind='gainJade',value=2}},upgrade={effects={{op='zhongliCard',kind='gainJade',value=3}}}}
,
 {id='zl28',name='待命名·zl28',type='skill',cost=2,target='ENEMY',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',effects={{op='zhongliCard',kind='gainJade',value=5},{op='applyStatus',status='weak',value=2}},upgrade={effects={{op='zhongliCard',kind='gainJade',value=7},{op='applyStatus',status='weak',value=3}}}},
 {id='zl66',name='待命名·zl66',type='skill',cost=2,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',effects={{op='zhongliCard',kind='gainJade',value=5},{op='gainStatus',status='flame_barrier',value=3}},upgrade={effects={{op='zhongliCard',kind='gainJade',value=7},{op='gainStatus',status='flame_barrier',value=4}}}}
,
 {id='zl39',name='待命名·zl39',type='attack',cost=0,target='ENEMY',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',exhaust=true,effects={{op='zhongliCard',kind='spendJade',value=3},{op='damage',value=6}},upgrade={effects={{op='zhongliCard',kind='spendJade',value=3},{op='damage',value=8}}}},
 {id='zl73',name='待命名·zl73',type='skill',cost=0,target='ENEMY',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',exhaust=true,effects={{op='zhongliCard',kind='spendJade',value=3},{op='applyStatus',status='weak',value=1}},upgrade={effects={{op='zhongliCard',kind='spendJade',value=3},{op='applyStatus',status='weak',value=2}}}}
,
 {id='zl32',name='待命名·zl32',type='skill',cost=1,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',effects={{op='zhongliCard',kind='spendJade',value=3},{op='gainStatus',status='flame_barrier',value=6}},upgrade={effects={{op='zhongliCard',kind='spendJade',value=3},{op='gainStatus',status='flame_barrier',value=8}}}},
 {id='zl40',name='待命名·zl40',type='skill',cost=1,target='SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,approval='HOLD',selfRetain=true,exhaust=true,effects={{op='zhongliCard',kind='spendJade',value=3},{op='block',value=12}},upgrade={effects={{op='zhongliCard',kind='spendJade',value=3},{op='block',value=16}}}}

}
function M.definitions()return Copy(definitions)end
function M.prepare(state,uid,targetIndex)
 L.validate(state)
 assert(Actors.isActive(state.player)and Actors.isActive(state.enemies[1]),'inactive resource card')
 assert(not state.actionQueue and not state.pendingPlay and not state.pendingChoice and not state.pendingPotionChoice and not state.pendingScry and not state.pendingHandChoice and not state.pendingPileChoice and not state.pendingDiscard,'unfinished host action')
 local instance
 for _,c in ipairs(state.hand)do if c.uid==uid then assert(not instance,'duplicate UID');instance=c end end
 assert(instance,'resource card not in hand');assert(instance.upgraded==nil or type(instance.upgraded)=='boolean','invalid upgrade identity')
 local d;for _,x in ipairs(definitions)do if x.id==instance.cardId then d=x end end;assert(d,'unsupported resource card')
 if d.target=='ENEMY'then assert(targetIndex==1 and Actors.isActive(state.enemies[1]),'invalid resource target')end
 local effects=instance.upgraded and d.upgrade.effects or d.effects
 local ok,why=R.canApply(state,effects[1].kind,effects[1].value);assert(ok,why)
 return {uid=uid,cardId=d.id,upgraded=instance.upgraded==true,baseCost=d.cost,target=d.target,effects=Copy(effects),definition=Copy(d),approval='HOLD'}
end
function M.canUse(state,uid,targetIndex)
 local ok,result=pcall(M.prepare,state,uid,targetIndex);if ok then return true,nil end;return false,result
end
function M.dispatch(_combat,state,effect,_queue)
 assert(type(effect)=='table'and getmetatable(effect)==nil,'invalid resource effect')
 for k in pairs(effect)do assert(k=='op'or k=='kind'or k=='value','unknown resource semantics')end
 assert(effect.op=='zhongliCard'and(effect.kind=='gainJade'or effect.kind=='spendJade'or effect.kind=='emptyJade'),'unsupported resource effect')
 R.apply(state,effect.kind,effect.value);return true
end
return M
