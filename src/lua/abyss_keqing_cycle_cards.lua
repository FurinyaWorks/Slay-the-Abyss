-- Source 89d898c intent/finite armor attacks. Pending rarity remains special/HOLD.
local Copy=require('abyss_copy').copy
local Resources=require('abyss_keqing_resources')
local M={}
local spec={
 KQ041={kind='attackingGuard',cost=1,base={hit=4},up={hit=7}},
 KQ058={kind='idleFollowup',cost=1,base={hit=5},up={hit=8}},
 KQ061={kind='stripArmor',cost=1,base={hit=6},up={hit=9}}}
local text=require('abyss_keqing_cycle_text')
function M.definitions()
 local out={cards={}}
 for _,id in ipairs({'KQ041','KQ058','KQ061'})do local x=spec[id]
  local function effect(f)local e=Copy(f);e.op='keqingCycle';e.kind=x.kind;return e end
  out.cards[#out.cards+1]={id=id,name='HOLD '..id,text=text[id].base,upgradeText=text[id].upgraded,type='attack',target='ENEMY',cost=x.cost,rarity='special',color='keqing_candidate',sourceId=id,
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
local canonical={};for _,d in ipairs(M.definitions().cards)do canonical[d.id]=d end
function M.canUse(state,card,instance)
 local x=instance and spec[instance.cardId]
 if not x or not same(state.catalog.cards[instance.cardId],canonical[instance.cardId])then return false end
 if not x or instance.upgraded~=nil and type(instance.upgraded)~='boolean'or card.experimental~=true or card.keqingCandidate~=true
  or card.keqingStage~=instance.cardId:sub(-3)or card.type~='attack'or card.target~='ENEMY'or card.exhaust or card.selfRetain
  or card.runNativeABI or card.originalV4 or card.silentFinalCard or card.costMode
  or card.ganyuCandidate~=nil or card.xiaoCandidate~=nil or card.zhongliCandidate~=nil then return false end
 local e=Copy(instance.upgraded and x.up or x.base);e.op='keqingCycle';e.kind=x.kind
 return same(card.effects,{e})
end
function M.prepare(combat,state,card,target,paid,context)
 assert(target and target.id==context.targetId,'missing cycle target')
 local effect=card.effects[1];local bonus=Resources.attackSnapshot(state.keqingResource).bonusPerHit
 local stages={};local playId=#state.cardsPlayedThisCombat
 local function damage(base)return{op='damage',value=base+bonus,normalAmount=combat.attackAmount(state,state.player,target,base+bonus),targetId=target.id}end
 local function add(kind,payload,other)
  stages[#stages+1]={op='keqingCardStage',targetId=target.id,action={op=kind,uid=context.uid,turn=state.turn,playId=playId,step=#stages+1},payload=payload,other=other}
 end
 if effect.kind=='stripArmor'then add('stripArmor',{}) end
 add('capturedEffect',damage(effect.hit))
 if effect.kind~='stripArmor'then
  local intent=assert(target.intents and target.intents[target.intentIndex],'missing selected intent')
  assert(not require('abyss_boss_relics').hidesIntents(state)and intent.kind~='unknown','nonpublic intent')
  local attacking=false;local priorStatus=false
  for _,e in ipairs(assert(intent.effects))do
   if e.op=='damage'or e.op=='damageAll'or e.op=='enemyVampireDamage'then
    assert(not priorStatus,'unsupported modifier-before-damage intent')
    assert(type(e.value)=='number'and e.value>=0 and e.value%1==0,'invalid selected intent damage')
    if require('abyss_actor').intentAttackAmount(state,target,state.player,e.value)>0 then attacking=true end
   elseif e.op=='applyStatus'or e.op=='gainStatus'then priorStatus=true
   elseif e.op~='block'then error('unsupported public intent effect')end
  end
  if effect.kind=='attackingGuard'and attacking then
   add('capturedEffect',{op='block',value=combat.blockAmount(state,state.player,5),fixed=true,
    blockCallbackAmount=require('abyss_actor').blockFloat(state,state.player,5)})
  elseif effect.kind=='idleFollowup'and not attacking then add('capturedEffect',damage(4))end
 end
 paid.cycle={stages=Copy(stages),cursor=1,playId=playId};return stages
end
function M.dispatch(state,e,paid,queue)
 local plan=assert(paid.cycle);local expected=assert(plan.stages[plan.cursor],'cycle stage exhausted')
 assert(same(e,expected),'mutated cycle stage')
 assert(e.action.uid==paid.uid and e.action.turn==paid.turn and e.action.turn==state.turn and e.action.playId==plan.playId and e.action.step==plan.cursor,'stale cycle identity')
 local payload=e.payload
 if e.action.op=='stripArmor'then
  local target
  for _,enemy in ipairs(state.enemies)do if enemy.id==e.targetId then target=enemy;break end end
  if require('abyss_actor').isActive(target)then
   assert(type(target.block)=='number'and target.block>=0 and target.block%1==0,'invalid armor')
   target.block=math.max(0,target.block-5)
  end
  plan.cursor=plan.cursor+1;return true
 end
 queue.pushTop(state,{kind='effect',effect=Copy(payload)});plan.cursor=plan.cursor+1;return true
end
return M
