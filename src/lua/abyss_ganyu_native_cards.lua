-- Explicit source-bound ordinary candidates only; never registers into global data.
-- Generated source definitions frozen at b0c9ca7f; native effects stay engine-owned.
local Source=require('abyss_ganyu_native_definitions')
local Copy=require('abyss_copy').copy
local Presence=require('abyss_actor_presence')
local M={};local byId={}
for _,card in ipairs(Source.cards)do byId[card.id]=card end
local function same(a,b)
 if type(a)~='table'or type(b)~='table'then return a==b end
 if getmetatable(a)or getmetatable(b)then return false end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end;return true
end
function M.known(id)return byId[id]~=nil end
function M.definitions()
 local out=Copy(Source)
 for _,card in ipairs(out.cards)do card.experimental=true;card.ganyuCandidate=true;card.ganyuNativeCandidate=true end
 return out
end
function M.canUse(state,instance,card,targetIndex)
 local source=instance and byId[instance.cardId]
 if not source or card.ganyuNativeCandidate~=true or card.ganyuCandidate~=true
  or state.characterCandidate~='ganyu'or state.experimentalMechanics~=true or state.originalV4
  or card.experimental~=true or card.originalV4 or card.runNativeABI or card.silentFinalCard or card.costMode
  or card.keqingCandidate~=nil or card.xiaoCandidate~=nil or card.zhongliCandidate~=nil
  or instance.upgraded~=nil and type(instance.upgraded)~='boolean'then return false,'ganyu_native_unavailable'end
 local face=instance.upgraded and source.upgrade or source
 if card.type~=source.type or card.target~=source.target or card.exhaust~=source.exhaust
  or card.selfRetain~=source.selfRetain or not same(card.effects,face.effects)then return false,'ganyu_native_shape'end
 if card.target=='ENEMY'and not Presence.isActive(state.enemies[targetIndex])then return false,'invalid_target'end
 return true
end
return M
