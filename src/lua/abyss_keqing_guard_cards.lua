-- Source 89d898c: two ordered Block effects, conditional gate evaluated live.
local Copy=require('abyss_copy').copy
local Resources=require('abyss_keqing_resources')
local Actors=require('abyss_actor')
local M={}
local specs={KQ035={kind='perEnemy',base=4,up=7},KQ036={kind='noResources',base=5,up=8},KQ067={kind='oneEnemy',base=4,up=7}}
local function same(a,b)
 if type(a)~=type(b)then return false end;if type(a)~='table'then return a==b end
 if getmetatable(a)or getmetatable(b)then return false end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end;return true
end
local function effect(x,up)return{op='keqingGuard',kind=x.kind,value=up and x.up or x.base}end
function M.definitions()
 local out={cards={}};for _,id in ipairs({'KQ035','KQ036','KQ067'})do local x=specs[id]
 out.cards[#out.cards+1]={id=id,name='HOLD '..id,type='skill',target='SELF',cost=1,rarity='special',color='keqing_candidate',sourceId=id,experimental=true,keqingCandidate=true,keqingStage=id:sub(-3),productionEnabled=false,reviewStatus='HOLD',effects={effect(x,false)},upgrade={cost=1,effects={effect(x,true)}}}end;return out
end
function M.known(id)return specs[id]~=nil end
function M.supports(e)for _,x in pairs(specs)do if same(e,effect(x,false))or same(e,effect(x,true))then return true end end;return false end
function M.canUse(card,instance)
 local x=instance and specs[instance.cardId]
 if not x or type(card)~='table'or getmetatable(card)or instance.upgraded~=nil and type(instance.upgraded)~='boolean'then return false end
 if card.id~=instance.cardId or card.type~='skill'or card.target~='SELF'or card.exhaust or card.selfRetain or card.experimental~=true or card.keqingCandidate~=true or card.keqingStage~=instance.cardId:sub(-3)
 or card.runNativeABI or card.originalV4 or card.silentFinalCard or card.costMode or card.ganyuCandidate~=nil or card.xiaoCandidate~=nil or card.zhongliCandidate~=nil then return false end
 return same(card.effects,{effect(x,instance.upgraded==true)})
end
function M.prepare(combat,state,card,target,paid,context)
 local instance=assert(state.cardInUse);assert(M.canUse(card,instance),'invalid guard source');Resources.attackSnapshot(state.keqingResource)
 local e=card.effects[1];local stages={}
 for step,kind in ipairs({'baseBlock',e.kind})do stages[step]={op='keqingCardStage',targetId=context.targetId,action={op=kind,uid=instance.uid,turn=state.turn,playId=#state.cardsPlayedThisCombat,step=step},value=e.value}end
 paid.guard={stages=Copy(stages),cursor=1};return stages
end
function M.dispatch(combat,state,e,paid,queue)
 local p=assert(paid.guard);local expected=assert(p.stages[p.cursor],'guard exhausted');assert(same(e,expected),'mutated guard stage')
 assert(e.action.uid==paid.uid and e.action.turn==state.turn,'stale guard binding')
 local value=e.value
 if e.action.op~='baseBlock'then
  local r=state.keqingResource;Resources.attackSnapshot(r)
  local count=0;for _,enemy in ipairs(state.enemies)do if Actors.isActive(enemy)then count=count+1 end end
  if e.action.op=='perEnemy'then value=math.min(count,3)
  elseif e.action.op=='noResources'then value=r.infusion==0 and r.wedgeUntil==nil and 3 or 0
  else value=count==1 and 3 or 0 end
 end
 p.cursor=p.cursor+1
 -- One native Block for the base and one for the qualifying bonus, not one per enemy.
 if value>0 then queue.pushTop(state,{kind='effect',effect={op='block',value=value}})end
 return true
end
return M
