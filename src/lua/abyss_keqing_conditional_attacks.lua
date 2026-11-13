-- Candidate 89d898c: live wedge gate, entry-infusion branches, native paid queue.
local Copy=require('abyss_copy').copy
local Resources=require('abyss_keqing_resources')
local M={}
local spec={
 KQ008={kind='wedgeStrike',cost=1,base={low=5,high=8},up={low=8,high=11}},
 KQ018={kind='emptyInfusionGuard',cost=1,base={hit=4,guard=3},up={hit=5,guard=4}},
 KQ025={kind='infusedFollowup',cost=2,base={hit=10,follow=7},up={hit=13,follow=9}}}
function M.definitions()
 local out={cards={}}
 for _,id in ipairs({'KQ008','KQ018','KQ025'})do local x=spec[id]
  local function effect(f)local e=Copy(f);e.op='keqingConditional';e.kind=x.kind;return e end
  out.cards[#out.cards+1]={id=id,name='HOLD '..id,type='attack',target='ENEMY',cost=x.cost,rarity='special',color='keqing_candidate',sourceId=id,
   experimental=true,keqingCandidate=true,keqingStage=id:sub(-3),productionEnabled=false,reviewStatus='HOLD',
   effects={effect(x.base)},upgrade={cost=x.cost,effects={effect(x.up)}}}
 end;return out
end
local function same(a,b)
 if type(a)~='table'or type(b)~='table'then return a==b end
 if getmetatable(a)or getmetatable(b)then return false end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end;return true
end
function M.known(id)return spec[id]~=nil end
function M.supports(e)
 for _,d in ipairs(M.definitions().cards)do if same(e,d.effects[1])or same(e,d.upgrade.effects[1])then return true end end;return false
end
function M.canUse(card,instance)
 local x=instance and spec[instance.cardId]
 if not x or instance.upgraded~=nil and type(instance.upgraded)~='boolean'or card.experimental~=true or card.keqingCandidate~=true
  or card.keqingStage~=instance.cardId:sub(-3)or card.type~='attack'or card.target~='ENEMY'or card.exhaust or card.selfRetain
  or card.runNativeABI or card.originalV4 or card.silentFinalCard or card.costMode
  or card.ganyuCandidate~=nil or card.xiaoCandidate~=nil or card.zhongliCandidate~=nil then return false end
 local e=Copy(instance.upgraded and x.up or x.base);e.op='keqingConditional';e.kind=x.kind
 return same(card.effects,{e})
end
function M.prepare(combat,state,card,target,paid,context)
 assert(target and target.id==context.targetId,'missing conditional target')
 local effect=card.effects[1];local bonus=Resources.attackSnapshot(state.keqingResource).bonusPerHit
 local stages={};local playId=#state.cardsPlayedThisCombat
 local function damage(base)return{op='damage',value=base+bonus,normalAmount=combat.attackAmount(state,state.player,target,base+bonus),targetId=target.id}end
 local function add(kind,payload,other)
  stages[#stages+1]={op='keqingCardStage',targetId=target.id,action={op=kind,uid=context.uid,turn=state.turn,playId=playId,step=#stages+1},payload=payload,other=other}
 end
 if effect.kind=='wedgeStrike'then add('liveWedgeDamage',damage(effect.low),damage(effect.high))
 elseif effect.kind=='emptyInfusionGuard'then
  add('capturedEffect',damage(effect.hit));add('capturedEffect',damage(effect.hit))
  if not paid.infused then add('capturedEffect',{op='block',value=combat.blockAmount(state,state.player,effect.guard),fixed=true,
   blockCallbackAmount=require('abyss_actor').blockFloat(state,state.player,effect.guard)})end
 else add('capturedEffect',damage(effect.hit));if paid.infused then add('capturedEffect',damage(effect.follow))end end
 paid.conditional={stages=Copy(stages),cursor=1,playId=playId};return stages
end
function M.dispatch(state,e,paid,queue)
 local plan=assert(paid.conditional);local expected=assert(plan.stages[plan.cursor],'conditional stage exhausted')
 assert(same(e,expected),'mutated conditional stage')
 assert(e.action.uid==paid.uid and e.action.turn==paid.turn and e.action.turn==state.turn and e.action.playId==plan.playId and e.action.step==plan.cursor,'stale conditional identity')
 local payload=e.payload
 if e.action.op=='liveWedgeDamage'then
  local r=state.keqingResource;Resources.attackSnapshot(r)
  assert(r.wedgeUntil==nil or r.wedgeUntil>=state.turn and r.wedgeUntil<=state.turn+1,'stale live wedge')
  if r.wedgeUntil~=nil then payload=e.other end
 end
 queue.pushTop(state,{kind='effect',effect=Copy(payload)});plan.cursor=plan.cursor+1;return true
end
return M
