-- Explicit 03/05/06 paid vertical slices; formal registration remains disabled.
local R=require('abyss_ganyu_resources')
local Queued=require('abyss_ganyu_queued_card')
local Storm=require('abyss_ganyu_storm_card')
local Copy=require('abyss_copy').copy
local Presence=require('abyss_actor_presence')
local Native=require('abyss_ganyu_native_cards')
local Conditional=require('abyss_ganyu_conditional_card')
local ConditionalDefinitions=require('abyss_ganyu_conditional_definitions')
local conditionalById={}
for _,definition in ipairs(ConditionalDefinitions.cards)do conditionalById[definition.id]=definition end
local Draw=require('abyss_ganyu_draw_card')
local DrawDefinitions=require('abyss_ganyu_draw_definitions')
local drawById={};for _,d in ipairs(DrawDefinitions.cards)do drawById[d.id]=d end
local Retrieval=require('abyss_ganyu_retrieval_card')
local RetrievalDefinitions=require('abyss_ganyu_retrieval_definitions')
local retrievalById={};for _,d in ipairs(RetrievalDefinitions.cards)do retrievalById[d.id]=d end
local StormFamilyDefinitions=require('abyss_ganyu_storm_family_definitions')
local stormFamilyById={};for _,d in ipairs(StormFamilyDefinitions.cards)do stormFamilyById[d.id]=d end
local DefensiveStormDefinitions=require('abyss_ganyu_defensive_storm_definitions')
local defensiveStormById={};for _,d in ipairs(DefensiveStormDefinitions.cards)do defensiveStormById[d.id]=d end
local ShieldChargeDefinitions=require('abyss_ganyu_shield_charge_definitions')
local shieldChargeById={};for _,d in ipairs(ShieldChargeDefinitions.cards)do shieldChargeById[d.id]=d end
local M={}
function M.shieldChargeDefinitions()return Copy(ShieldChargeDefinitions)end
function M.defensiveStormDefinitions()return Copy(DefensiveStormDefinitions)end
function M.stormFamilyDefinitions()return Copy(StormFamilyDefinitions)end
function M.retrievalDefinitions()return Copy(RetrievalDefinitions)end
function M.drawDefinitions()return Copy(DrawDefinitions)end
function M.conditionalDefinitions()return Copy(ConditionalDefinitions)end
local function same(a,b)
 if type(a)~='table'or type(b)~='table'then return a==b end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end;return true
end
function M.supportsConditional(e)
 if type(e)~='table'or getmetatable(e)then return false end
 for _,d in pairs(conditionalById)do
  if same(e,d.effects[1])or same(e,d.upgrade.effects[1])then return true end
 end
 return false
end
function M.supportsDraw(e)
 if type(e)~='table'or getmetatable(e)then return false end
 for _,d in pairs(drawById)do if same(e,d.effects[1])or same(e,d.upgrade.effects[1])then return true end end
 return false
end
local function drawUse(state,instance,card)
 local d=instance and drawById[instance.cardId]
 if not d or instance.upgraded~=nil and type(instance.upgraded)~='boolean'
  or state.characterCandidate~='ganyu'or state.experimentalMechanics~=true or state.originalV4
  or card.experimental~=true or card.ganyuCandidate~=true or card.ganyuNativeCandidate~=nil
  or card.runNativeABI or card.originalV4 or card.silentFinalCard or card.costMode
  or card.keqingCandidate~=nil or card.xiaoCandidate~=nil or card.zhongliCandidate~=nil
  or card.selfRetain or card.exhaust~=d.exhaust or card.type~=d.type or card.target~=d.target
  or getmetatable(card.effects)or not M.supportsDraw(card.effects[1])
  or not same(card.effects,instance.upgraded and d.upgrade.effects or d.effects)then return false,'ganyu_draw_unavailable'end
 return true
end
function M.supportsRetrieval(e)
 if type(e)~='table'or getmetatable(e)then return false end
 for _,d in pairs(retrievalById)do if same(e,d.effects[1])or same(e,d.upgrade.effects[1])then return true end end
 return false
end
local function retrievalUse(state,instance,card)
 local d=instance and retrievalById[instance.cardId]
 if not d or instance.upgraded~=nil and type(instance.upgraded)~='boolean'
  or state.characterCandidate~='ganyu'or state.experimentalMechanics~=true or state.originalV4
  or card.experimental~=true or card.ganyuCandidate~=true or card.ganyuNativeCandidate~=nil
  or card.runNativeABI or card.originalV4 or card.silentFinalCard or card.costMode
  or card.keqingCandidate~=nil or card.xiaoCandidate~=nil or card.zhongliCandidate~=nil
  or card.selfRetain or card.exhaust~=d.exhaust or card.type~=d.type or card.target~=d.target
  or getmetatable(card.effects)or not M.supportsRetrieval(card.effects[1])
  or not same(card.effects,instance.upgraded and d.upgrade.effects or d.effects)then return false,'ganyu_retrieval_unavailable'end
 return true
end
function M.supportsDefensiveStorm(e)
 if type(e)~='table'or getmetatable(e)then return false end
 for _,d in pairs(defensiveStormById)do if same(e,d.effects[2])or same(e,d.upgrade.effects[2])then return true end end
 return false
end
local function defensiveStormUse(state,instance,card)
 local d=instance and defensiveStormById[instance.cardId]
 if not d or instance.upgraded~=nil and type(instance.upgraded)~='boolean'
  or state.characterCandidate~='ganyu'or state.experimentalMechanics~=true or state.originalV4
  or card.experimental~=true or card.ganyuCandidate~=true or card.ganyuNativeCandidate~=nil
  or card.runNativeABI or card.originalV4 or card.silentFinalCard or card.costMode
  or card.keqingCandidate~=nil or card.xiaoCandidate~=nil or card.zhongliCandidate~=nil
  or card.selfRetain~=d.selfRetain or card.exhaust~=d.exhaust or card.type~=d.type or card.target~=d.target
  or getmetatable(card.effects)or not M.supportsDefensiveStorm(card.effects[2])
  or not same(card.effects,instance.upgraded and d.upgrade.effects or d.effects)then return false,'ganyu_defensive_storm_unavailable'end
 return true
end
local function shieldChargeUse(state,instance,card)
 local d=instance and shieldChargeById[instance.cardId]
 if not d or instance.upgraded~=nil and type(instance.upgraded)~='boolean'
  or state.characterCandidate~='ganyu'or state.experimentalMechanics~=true or state.originalV4
  or card.experimental~=true or card.ganyuCandidate~=true or card.ganyuNativeCandidate~=nil
  or card.runNativeABI or card.originalV4 or card.silentFinalCard or card.costMode
  or card.keqingCandidate~=nil or card.xiaoCandidate~=nil or card.zhongliCandidate~=nil
  or card.selfRetain~=d.selfRetain or card.exhaust~=d.exhaust or card.type~=d.type or card.target~=d.target
  or getmetatable(card.effects)
  or not same(card.effects,instance.upgraded and d.upgrade.effects or d.effects)then return false,'ganyu_shield_charge_unavailable'end
 -- Compare every frozen source field, allowing only inert catalog identity metadata.
 -- Runtime cost stays engine-owned (Corruption and per-instance cost can change it).
 local source=state.catalog.cards[instance.cardId]
 if type(source)~='table'or getmetatable(source)then return false,'ganyu_shield_charge_source'end
 local function exact(a,b)
  if type(a)~='table'or type(b)~='table'then return a==b end
  if getmetatable(a)or getmetatable(b)then return false end
  for k,v in pairs(a)do if not exact(v,b[k])then return false end end
  for k in pairs(b)do if a[k]==nil then return false end end
  return true
 end
 for key,value in pairs(d)do if not exact(source[key],value)then return false,'ganyu_shield_charge_source'end end
 for key in pairs(source)do
  if d[key]==nil and key~='sourceId'and key~='color'and key~='ganyuSourceSHA256' then return false,'ganyu_shield_charge_source'end
 end
 return true
end
function M.supportsStormFamily(e)
 if type(e)~='table'or getmetatable(e)then return false end
 for _,d in pairs(stormFamilyById)do if same(e,d.effects[1])or same(e,d.upgrade.effects[1])then return true end end
 return false
end
local function stormFamilyUse(state,instance,card)
 local d=instance and stormFamilyById[instance.cardId]
 if not d or instance.upgraded~=nil and type(instance.upgraded)~='boolean'
  or state.characterCandidate~='ganyu'or state.experimentalMechanics~=true or state.originalV4
  or card.experimental~=true or card.ganyuCandidate~=true or card.ganyuNativeCandidate~=nil
  or card.runNativeABI or card.originalV4 or card.silentFinalCard or card.costMode
  or card.keqingCandidate~=nil or card.xiaoCandidate~=nil or card.zhongliCandidate~=nil
  or card.selfRetain~=d.selfRetain or card.exhaust~=d.exhaust or card.type~=d.type or card.target~=d.target
  or getmetatable(card.effects)or not M.supportsStormFamily(card.effects[1])
  or not same(card.effects,instance.upgraded and d.upgrade.effects or d.effects)then return false,'ganyu_storm_family_unavailable'end
 return true
end
local function conditionalUse(state,instance,card,targetIndex)
 local d=instance and conditionalById[instance.cardId]
 if not d or instance.upgraded~=nil and type(instance.upgraded)~='boolean' or state.characterCandidate~='ganyu'or state.experimentalMechanics~=true or state.originalV4
  or card.experimental~=true or card.ganyuCandidate~=true or card.runNativeABI or card.originalV4
  or card.silentFinalCard or card.costMode or card.keqingCandidate~=nil or card.xiaoCandidate~=nil
  or card.zhongliCandidate~=nil or card.exhaust or card.selfRetain
  or card.type~=d.type or card.target~=d.target
  or getmetatable(card.effects)or not M.supportsConditional(card.effects[1])
  or not same(card.effects,instance.upgraded and d.upgrade.effects or d.effects)then return false,'ganyu_conditional_unavailable'end
 if d.target=='ENEMY'and not Presence.isActive(state.enemies[targetIndex])then return false,'invalid_target'end
 return true
end
function M.supportsStorm(e)
 if type(e)~='table'or getmetatable(e)or e.op~='ganyuStorm'or(e.amount~=4 and e.amount~=6)or e.turns~=2 then return false end
 for k in pairs(e)do if k~='op'and k~='amount'and k~='turns'then return false end end
 return true
end
function M.supports(e)
 if M.supportsDefensiveStorm(e)or M.supportsStormFamily(e)or M.supportsRetrieval(e)or M.supportsDraw(e)or M.supportsStorm(e)or M.supportsConditional(e)then return true end
 if type(e)~='table' or getmetatable(e) or e.op~='ganyuCard'then return false end
 local allowed=e.kind=='charge'and {op=true,kind=true,amount=true}
  or e.kind=='chargedShot'and {op=true,kind=true,direct=true,bloom=true}
 if not allowed then return false end
 for k in pairs(e)do if not allowed[k]then return false end end
 return pcall(R.plan,R.initial(),e.kind=='charge'and {op='charge',amount=e.amount}
  or {op='charged_shot',direct=e.direct,bloom=e.bloom})
end
function M.canUse(state,card,targetIndex,instance)
 if instance and shieldChargeById[instance.cardId]then return shieldChargeUse(state,instance,card)end
 if instance and defensiveStormById[instance.cardId]then return defensiveStormUse(state,instance,card)end
 if instance and stormFamilyById[instance.cardId]or card.effects[1]and card.effects[1].op=='ganyuStorm'and not M.supportsStorm(card.effects[1])then return stormFamilyUse(state,instance,card)end
 if instance and retrievalById[instance.cardId]or card.effects[1]and card.effects[1].op=='ganyuRetrieve'then return retrievalUse(state,instance,card)end
 if instance and drawById[instance.cardId]or card.effects[1]and card.effects[1].op=='ganyuDraw'then return drawUse(state,instance,card)end
 if instance and conditionalById[instance.cardId] or card.effects[1]and card.effects[1].op=='ganyuConditional'then return conditionalUse(state,instance,card,targetIndex)end
 if card.ganyuNativeCandidate~=nil or instance and Native.known(instance.cardId)then return Native.canUse(state,instance,card,targetIndex)end
 if card.ganyuCandidate==nil then
  for _,e in ipairs(card.effects)do if e.op=='ganyuCard'or e.op=='ganyuStorm'then return false,'unmarked_ganyu_card'end end
  return true
 end
 if card.ganyuCandidate~=true or state.characterCandidate~='ganyu' or state.experimentalMechanics~=true
  or state.originalV4 or card.experimental~=true or card.runNativeABI or card.originalV4
  or card.silentFinalCard or card.costMode or card.keqingCandidate~=nil
  or #card.effects~=1 or not M.supports(card.effects[1])then return false,'ganyu_candidate_unavailable'end
 local shot=card.effects[1].kind=='chargedShot'
 if shot then
  if card.type~='attack' or card.target~='ENEMY' or not Presence.isActive(state.enemies[targetIndex])then return false,'invalid_target'end
 elseif card.type~='skill' or card.target~='SELF'then return false,'ganyu_candidate_unavailable'end
 return true
end
function M.prepare(combat,state,card,effects,target)
 if card.ganyuCandidate==nil then return effects end
 local context=assert(state.pendingPlay,'missing Ganyu pending use')
 local index;for i,enemy in ipairs(state.enemies)do if rawequal(enemy,target)then index=i end end
 local ok,why=M.canUse(state,card,index,state.cardInUse);assert(ok,why)
 assert(context.ganyuPaid==nil,'duplicate Ganyu preparation')
 if card.ganyuNativeCandidate then
  assert(state.cardInUse and state.cardInUse.uid==context.uid,'invalid Ganyu native paid identity')
  context.ganyuPaid={uid=context.uid,turn=state.turn,playId=#state.cardsPlayedThisCombat,native=true}
  return effects
 end
 if shieldChargeById[state.cardInUse.cardId]then
  local payload=Queued.prepare(combat,state,effects[2],target,context.uid)
  local playId=#assert(state.cardsPlayedThisCombat,'missing Ganyu accepted use history')
  context.ganyuPaid={uid=context.uid,turn=state.turn,playId=playId,payload=Copy(payload)}
  return {Copy(effects[1]),{op='ganyuPaidStage',payload=payload,uid=context.uid,turn=state.turn,playId=playId}}
 end
 if defensiveStormById[state.cardInUse.cardId]then
  local payload=Storm.prepare(combat,state,effects[2],context.uid)
  local playId=#assert(state.cardsPlayedThisCombat,'missing Ganyu accepted use history')
  context.ganyuPaid={uid=context.uid,turn=state.turn,playId=playId,payload=Copy(payload),storm=true}
  -- Native queue captures the first ordinary block before any action executes.
  return {Copy(effects[1]),{op='ganyuPaidStage',payload=payload,uid=context.uid,turn=state.turn,playId=playId}}
 end
 local retrieval=effects[1].op=='ganyuRetrieve'
 local draw=effects[1].op=='ganyuDraw'
 local conditional=effects[1].op=='ganyuConditional'
 local storm=effects[1].op=='ganyuStorm'
 if storm and not stormFamilyById[state.cardInUse.cardId]then assert(effects[1].amount==(state.cardInUse.upgraded and 6 or 4),'invalid storm face')end
 local e=retrieval and Retrieval.prepare(combat,state,effects[1],context.uid)or draw and Draw.prepare(combat,state,effects[1],context.uid)or conditional and Conditional.prepare(combat,state,effects[1],target,context.uid)or storm and Storm.prepare(combat,state,effects[1],context.uid)or Queued.prepare(combat,state,effects[1],target,context.uid)
 local playId=#assert(state.cardsPlayedThisCombat,'missing Ganyu accepted use history')
 context.ganyuPaid={uid=context.uid,turn=state.turn,playId=playId,payload=Copy(e),storm=storm,conditional=conditional,draw=draw,retrieval=retrieval}
 return {{op='ganyuPaidStage',payload=e,uid=context.uid,turn=state.turn,playId=playId}}
end
function M.dispatch(combat,state,e,queue)
 local context=assert(state.pendingPlay,'missing Ganyu use')
 local paid=assert(context.ganyuPaid,'missing Ganyu paid context')
 assert(state.characterCandidate=='ganyu' and state.experimentalMechanics and not state.originalV4
  and e.uid==paid.uid and e.turn==paid.turn and e.turn==state.turn and e.playId==paid.playId
  and not paid.completed,'stale Ganyu stage')
 assert(same(e.payload,paid.payload),'mutated Ganyu paid effect')
 if paid.retrieval then Retrieval.dispatch(combat,state,e.payload,queue)elseif paid.draw then Draw.dispatch(combat,state,e.payload,queue)elseif paid.conditional then Conditional.dispatch(combat,state,e.payload,queue)elseif paid.storm then Storm.dispatch(combat,state,e.payload,queue)else Queued.dispatch(combat,state,e.payload,queue)end
 paid.completed=true
 return true
end
return M
