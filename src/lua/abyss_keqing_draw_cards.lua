-- KQ031/042 fixed source projection; pending rarity remains special/HOLD.
local Copy=require('abyss_copy').copy
local Resources=require('abyss_keqing_resources')
local M={}
local specs={KQ031={cost=1,kind='wedgeDraw',base=2,up=3},KQ042={cost=1,kind='plainDraw',base=2,up=3}}
local function same(a,b)
 if type(a)~=type(b)then return false end;if type(a)~='table'then return a==b end
 if getmetatable(a)or getmetatable(b)then return false end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end;return true
end
local function effect(x,up)return{op='keqingDraw',kind=x.kind,value=up and x.up or x.base}end
function M.definitions()
 local out={cards={}};for _,id in ipairs({'KQ031','KQ042'})do local x=specs[id]
 out.cards[#out.cards+1]={id=id,name='HOLD '..id,type='skill',target='SELF',cost=x.cost,exhaust=true,rarity='special',color='keqing_candidate',sourceId=id,experimental=true,keqingCandidate=true,keqingStage=id:sub(-3),productionEnabled=false,reviewStatus='HOLD',effects={effect(x,false)},upgrade={cost=x.cost,effects={effect(x,true)}}}end;return out
end
function M.known(id)return specs[id]~=nil end
function M.supports(e)for _,x in pairs(specs)do if same(e,effect(x,false))or same(e,effect(x,true))then return true end end;return false end
function M.canUse(card,instance)
 local x=instance and specs[instance.cardId]
 if not x or type(card)~='table'or getmetatable(card)or instance.upgraded~=nil and type(instance.upgraded)~='boolean'then return false end
 if card.id~=instance.cardId or card.type~='skill'or card.target~='SELF'or card.exhaust~=true or card.selfRetain or card.experimental~=true or card.keqingCandidate~=true or card.keqingStage~=instance.cardId:sub(-3)
 or card.runNativeABI or card.originalV4 or card.silentFinalCard or card.costMode or card.ganyuCandidate~=nil or card.xiaoCandidate~=nil or card.zhongliCandidate~=nil then return false end
 return same(card.effects,{effect(x,instance.upgraded==true)})
end
function M.prepare(combat,state,card,target,paid,context)
 local instance=assert(state.cardInUse);assert(M.canUse(card,instance),'invalid drawPlan source')
 Resources.attackSnapshot(state.keqingResource)
 local e=card.effects[1];local stages={{op='keqingCardStage',targetId=context.targetId,action={op=e.kind,uid=instance.uid,turn=state.turn,playId=#state.cardsPlayedThisCombat,step=1},value=e.value}}
 paid.drawPlan={stages=Copy(stages),cursor=1};return stages
end
function M.dispatch(combat,state,e,paid,queue)
 local p=assert(paid.drawPlan);local expected=assert(p.stages[p.cursor],'drawPlan exhausted');assert(same(e,expected),'mutated drawPlan stage')
 assert(e.action.uid==paid.uid and e.action.turn==state.turn,'stale drawPlan binding')
 local r=state.keqingResource;Resources.attackSnapshot(r)
 local value=e.value
 if e.action.op=='wedgeDraw'then
  assert(r.wedgeUntil==nil or r.wedgeUntil>=state.turn and r.wedgeUntil<=state.turn+1,'stale wedge draw resource')
  if r.wedgeUntil~=nil then r.wedgeUntil=nil else value=1 end
 end
 p.cursor=p.cursor+1
 -- Consumption precedes native Draw: locks, capacity and exhaustion never refund it.
 queue.pushTop(state,{kind='effect',effect={op='draw',value=value}})
 return true
end
return M
