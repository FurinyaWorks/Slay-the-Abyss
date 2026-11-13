-- Single-enemy paid resource/install slices; no jade damage interception.
local Lifecycle=require('abyss_zhongli_lifecycle')
local Dispatch=require('abyss_zhongli_card_effects')
local Jade=require('abyss_zhongli_jade_resource')
local Presence=require('abyss_actor_presence')
local Copy=require('abyss_copy').copy
local M={}
local specs={zl21={kind='installPillar',base=3,upgraded=4,type='power',target='SELF'},zl31={kind='installRepair',base=2,upgraded=3,type='power',target='SELF'},
 zl03={kind='gainJade',base=12,upgraded=16,type='skill',target='SELF'},
 zl19={kind='gainJade',base=6,upgraded=8,type='skill',target='SELF',draw=2,upDraw=3,exhaust=true},
 zl24={kind='spendJade',base=3,upgraded=3,type='skill',target='SELF',draw=3,upDraw=4,exhaust=true},
 zl20={kind='emptyJade',base=9,upgraded=12,type='skill',target='SELF'},
 zl62={kind='emptyJade',base=6,upgraded=8,type='skill',target='SELF',draw=1,upDraw=2,exhaust=true},
 zl04={kind='spendJade',base=6,upgraded=6,type='attack',target='ENEMY',damage=14,upDamage=18}}
local function same(a,b)
 if type(a)~='table'or type(b)~='table'then return a==b end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end;return true
end
function M.supports(e)
 if type(e)~='table'or getmetatable(e)or e.op~='zhongliCard'then return false end
 for k in pairs(e)do if k~='op'and k~='kind'and k~='value'then return false end end
 local max=e.kind=='installPillar'and 6 or e.kind=='installRepair'and 3 or(e.kind=='gainJade'or e.kind=='spendJade'or e.kind=='emptyJade')and 20
 return max~=false and max~=nil and type(e.value)=='number'and e.value%1==0 and e.value>=1 and e.value<=max
end
function M.canUse(state,instance,card,targetIndex)
 if card.zhongliCandidate==nil then
  for _,e in ipairs(card.effects)do if e.op=='zhongliCard'then return false,'unmarked_zhongli_card'end end
  return true
 end
 local spec=specs[instance.cardId]
 if card.zhongliCandidate~=true or not spec or state.characterCandidate~='zhongli' or state.experimentalMechanics~=true
  or state.originalV4 or card.experimental~=true or card.originalV4 or card.runNativeABI or card.silentFinalCard
  or card.costMode or card.keqingCandidate~=nil or card.ganyuCandidate~=nil or card.xiaoCandidate~=nil
  or card.type~=spec.type or card.target~=spec.target or #card.effects~=((spec.damage or spec.draw)and 2 or 1)
  or spec.exhaust and card.exhaust~=true
  or instance.upgraded~=nil and type(instance.upgraded)~='boolean'then return false,'zhongli_candidate_unavailable'end
 local e=card.effects[1]
 if not M.supports(e)or e.kind~=spec.kind or e.value~=(instance.upgraded and spec.upgraded or spec.base)then return false,'zhongli_effect_unavailable'end
 if spec.damage and not same(card.effects[2],{op='damage',value=instance.upgraded and spec.upDamage or spec.damage})then return false,'zhongli_damage_unavailable'end
 if spec.draw and not same(card.effects[2],{op='draw',value=instance.upgraded and spec.upDraw or spec.draw})then return false,'zhongli_draw_unavailable'end
 if spec.damage and(targetIndex~=1 or not Presence.isActive(state.enemies[targetIndex]))then return false,'invalid_target'end
 if #state.enemies~=1 or not Presence.isActive(state.player)or not Presence.isActive(state.enemies[1])then return false,'inactive_zhongli_battle'end
 local ok=pcall(Lifecycle.validate,state);if not ok then return false,'invalid_zhongli_resource'end
 if spec.kind=='gainJade'or spec.kind=='spendJade'or spec.kind=='emptyJade'then return Jade.canApply(state,spec.kind,e.value)end
 return true
end
function M.prepare(state,card,effects)
 if card.zhongliCandidate==nil then return effects end
 local context=assert(state.pendingPlay,'missing Zhongli pending use')
 local instance=assert(state.cardInUse,'missing Zhongli limbo')
 local index;for i,enemy in ipairs(state.enemies)do if enemy.id==context.targetId then index=i end end
 local ok,why=M.canUse(state,instance,card,index);assert(ok,why)
 assert(instance.uid==context.uid and context.zhongliPaid==nil,'duplicate or invalid Zhongli paid context')
 local playId=#assert(state.cardsPlayedThisCombat,'missing Zhongli accepted history')
 context.zhongliPaid={uid=instance.uid,turn=state.turn,playId=playId,payload=Copy(effects[1])}
 local out={{op='zhongliPaidStage',payload=Copy(effects[1]),uid=instance.uid,turn=state.turn,playId=playId}}
 for i=2,#effects do out[#out+1]=Copy(effects[i])end
 return out
end
function M.dispatch(combat,state,e,queue)
 local context=assert(state.pendingPlay,'missing Zhongli pending use')
 local paid=assert(context.zhongliPaid,'missing Zhongli paid context')
 assert(state.characterCandidate=='zhongli'and state.experimentalMechanics and not state.originalV4
  and e.uid==paid.uid and e.turn==state.turn and e.turn==paid.turn and e.playId==paid.playId
  and not paid.completed,'stale Zhongli stage')
 assert(state.cardInUse and state.cardInUse.uid==paid.uid and context.uid==paid.uid,'wrong Zhongli paid instance')
 assert(same(e.payload,paid.payload),'mutated Zhongli paid effect')
 if e.payload.kind=='gainJade'or e.payload.kind=='spendJade'or e.payload.kind=='emptyJade'then Jade.apply(state,e.payload.kind,e.payload.value)
 else Dispatch.dispatch(combat,state,e.payload,queue)end
 paid.completed=true
 return true
end
return M
