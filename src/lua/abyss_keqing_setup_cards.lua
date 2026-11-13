-- Source89d898c strict setup stages; explicit experimental paid routing only.
local Copy=require('abyss_copy').copy
local Resources=require('abyss_keqing_resources')
local Actors=require('abyss_actor')
local M={}
local spec={KQ010={type='skill',target='SELF',cost=1,op='block',base=4,up=7},KQ011={type='attack',target='ENEMY',cost=2,op='damage',base=12,up=16},KQ013={type='attack',target='ALL_ENEMY',cost=1,op='damageAll',base=3,up=5}}
local function same(a,b)
 if type(a)~='table'or type(b)~='table'then return a==b end
 if getmetatable(a)or getmetatable(b)then return false end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end;return true
end
local function effect(x,up)return{op='keqingSetup',kind=x.op,value=up and x.up or x.base}end
function M.definitions()
 local out={cards={}}
 for _,id in ipairs({'KQ010','KQ011','KQ013'})do local x=spec[id]
  out.cards[#out.cards+1]={id=id,name='HOLD '..id,type=x.type,target=x.target,cost=x.cost,rarity='special',color='keqing_candidate',sourceId=id,experimental=true,keqingCandidate=true,keqingStage=id:sub(-3),productionEnabled=false,reviewStatus='HOLD',effects={effect(x,false)},upgrade={cost=x.cost,effects={effect(x,true)}}}
 end;return out
end
function M.supports(e)
 for _,d in ipairs(M.definitions().cards)do if same(e,d.effects[1])or same(e,d.upgrade.effects[1])then return true end end;return false
end
function M.known(id)return spec[id]~=nil end
function M.canUse(card,instance)
 local x=instance and spec[instance.cardId]
 if not x or type(card)~='table'or getmetatable(card)or instance.upgraded~=nil and type(instance.upgraded)~='boolean' then return false end
 if card.id~=instance.cardId or card.type~=x.type or card.target~=x.target or card.experimental~=true or card.keqingCandidate~=true or card.keqingStage~=instance.cardId:sub(-3)
 or card.exhaust or card.selfRetain or card.runNativeABI or card.originalV4 or card.silentFinalCard or card.costMode or card.ganyuCandidate~=nil or card.xiaoCandidate~=nil or card.zhongliCandidate~=nil then return false end
 return same(card.effects,{effect(x,instance.upgraded==true)})
end
function M.prepare(combat,state,card,target,paid,context)
 local instance=assert(state.cardInUse,'missing setup instance');assert(M.canUse(card,instance),'invalid setup definition')
 assert(state.pendingPlay==context and context.keqingPaid==paid and paid.uid==instance.uid and context.uid==instance.uid and paid.turn==state.turn and not paid.completed,'stale setup use')
 assert(paid.setup==nil,'duplicate setup preparation')
 local e=card.effects[1];local snapshot=Resources.attackSnapshot(state.keqingResource);local payload={op=e.kind,value=e.value}
 if e.kind=='block'then payload.value=combat.blockAmount(state,state.player,e.value);payload.fixed=true;payload.blockCallbackAmount=Actors.blockFloat(state,state.player,e.value)
 elseif e.kind=='damage'then
  assert(target and target.id==context.targetId,'missing setup target');payload.value=e.value+snapshot.bonusPerHit;payload.targetId=target.id;payload.normalAmount=combat.attackAmount(state,state.player,target,payload.value)
 else
  payload.value=e.value+snapshot.bonusPerHit;payload.normalAmounts={}
  for _,enemy in ipairs(state.enemies)do if Actors.isActive(enemy)then payload.normalAmounts[enemy.id]=combat.attackAmount(state,state.player,enemy,payload.value)end end
 end
 local playId=#state.cardsPlayedThisCombat;local stages={}
 for step,op in ipairs({'capturedSetupEffect','setWedgeIfAbsent'})do stages[step]={op='keqingCardStage',targetId=context.targetId,action={op=op,uid=instance.uid,turn=state.turn,playId=playId,step=step},payload=step==1 and payload or nil}end
 paid.setup={stages=Copy(stages),cursor=1,playId=playId};return stages
end
function M.dispatch(state,e,paid,queue)
 local context=assert(state.pendingPlay,'missing pending setup use');local instance=assert(state.cardInUse,'missing setup limbo')
 assert(context.keqingPaid==paid and context.uid==instance.uid and paid.uid==instance.uid and paid.turn==state.turn and not paid.completed,'stale setup use')
 local p=assert(paid.setup,'missing setup plan');local expected=assert(p.stages[p.cursor],'setup stages exhausted')
 assert(same(e,expected),'mutated setup stage')
 local a=e.action;assert(a.uid==instance.uid and a.turn==state.turn and a.playId==p.playId and a.step==p.cursor and e.targetId==context.targetId,'stale setup binding')
 if a.op=='capturedSetupEffect'then queue.pushTop(state,{kind='effect',effect=Copy(e.payload)})
 else
  local r=state.keqingResource;Resources.attackSnapshot(r)
  assert(r.wedgeUntil==nil or r.wedgeUntil>=state.turn and r.wedgeUntil<=state.turn+1,'stale setup wedge')
  if r.wedgeUntil==nil then r.wedgeUntil=state.turn+1;paid.didSetup=true end
 end
 p.cursor=p.cursor+1;return true
end
return M
