-- Source 89d898c utility skills; pending rarity stays special/HOLD.
local Copy=require('abyss_copy').copy
local M={}
local specs={KQ046={cost=2,kind='lockDraw',base=3,up=4,exhaust=true},KQ051={cost=1,kind='recycle',base=2,up=5,exhaust=false},KQ066={cost=2,kind='clearWeak',base=10,up=13,exhaust=true}}
local text=require('abyss_keqing_utility_text')
local function same(a,b)
 if type(a)~=type(b)then return false end;if type(a)~='table'then return a==b end
 if getmetatable(a)or getmetatable(b)then return false end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end;return true
end
local function effect(x,up)return{op='keqingUtility',kind=x.kind,value=up and x.up or x.base}end
function M.definitions()
 local out={cards={}};for _,id in ipairs({'KQ046','KQ051','KQ066'})do local x=specs[id]
 out.cards[#out.cards+1]={id=id,name='HOLD '..id,text=text[id].base,upgradeText=text[id].upgraded,type='skill',target='SELF',cost=x.cost,exhaust=x.exhaust,rarity='special',color='keqing_candidate',sourceId=id,experimental=true,keqingCandidate=true,keqingStage=id:sub(-3),productionEnabled=false,reviewStatus='HOLD',effects={effect(x,false)},upgrade={cost=x.cost,effects={effect(x,true)}}}end;return out
end
local canonical={};for _,d in ipairs(M.definitions().cards)do canonical[d.id]=d end
function M.known(id)return specs[id]~=nil end
function M.supports(e)for _,x in pairs(specs)do if same(e,effect(x,false))or same(e,effect(x,true))then return true end end;return false end
function M.canUse(state,card,instance)
 local x=instance and specs[instance.cardId]
 if not x or type(card)~='table'or getmetatable(card)or instance.upgraded~=nil and type(instance.upgraded)~='boolean'then return false end
 if not same(state.catalog.cards[instance.cardId],canonical[instance.cardId])then return false end
 if card.id~=instance.cardId or card.type~='skill'or card.target~='SELF'or card.exhaust~=x.exhaust or card.selfRetain or card.experimental~=true or card.keqingCandidate~=true or card.keqingStage~=instance.cardId:sub(-3)
 or card.runNativeABI or card.originalV4 or card.silentFinalCard or card.costMode or card.ganyuCandidate~=nil or card.xiaoCandidate~=nil or card.zhongliCandidate~=nil then return false end
 return same(card.effects,{effect(x,instance.upgraded==true)})
end
function M.prepare(combat,state,card,target,paid,context)
 local instance=assert(state.cardInUse);assert(M.canUse(state,card,instance),'invalid utility source')
 local e=card.effects[1];local stage={op='keqingCardStage',targetId=context.targetId,action={op=e.kind,uid=instance.uid,turn=state.turn,playId=#state.cardsPlayedThisCombat,step=1}}
 paid.utility={stage=Copy(stage),done=false}
 if e.kind=='lockDraw'then return{{op='draw',value=e.value},stage}
 elseif e.kind=='clearWeak'then return{{op='block',value=e.value},stage}
 else return{stage,{op='draw',value=1},{op='block',value=e.value}}end
end
function M.dispatch(combat,state,e,paid,queue)
 local p=assert(paid.utility);assert(not p.done and same(e,p.stage),'mutated or replayed utility stage')
 assert(e.action.uid==paid.uid and e.action.turn==state.turn,'stale utility stage')
 p.done=true
 if e.action.op=='lockDraw'then queue.pushTop(state,{kind='effect',effect={op='noDrawThisTurn'}})
 elseif e.action.op=='clearWeak'then
  -- Native ReducePower/RemoveSpecificPower manages ordering, presentation and callbacks.
  queue.pushTop(state,{kind='effect',effect={op='reduceStatus',status='weak',value=1,targetId=state.player.id}})
 elseif e.action.op=='recycle'then
  local c=state.discard[#state.discard]
  if c then assert(c~=state.cardInUse and c.uid~=state.cardInUse.uid,'limbo card in discard');table.remove(state.discard);table.insert(state.draw,1,c)end
 else error('unknown utility stage')end
 return true
end
return M
