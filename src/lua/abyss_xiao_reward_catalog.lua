-- Closed source projection, not a new formal character or rarity approval.
local Copy=require('abyss_copy').copy
local Starter=Copy(require('abyss_xiao_starter_source'))
local Extra=Copy(require('abyss_xiao_reward_source'))
local M={sourceSha256=Extra.sourceSha256}
local common={x03=true,x06=true,x07=true,x08=true}
local function same(a,b)
 if type(a)~=type(b)then return false end
 if type(a)~='table'then return a==b end
 if getmetatable(a)or getmetatable(b)then return false end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end;return true
end
function M.definitions()
 assert(Starter.sourceSha256==Extra.sourceSha256,'Xiao source identity mismatch')
 local out={}
 for _,f in ipairs(Starter.cards)do if common[f.id]then
  out[#out+1]={id='xiao_candidate_'..f.id,name='HOLD '..f.id,type=f.type,cost=f.cost,exhaust=f.exhaust,
   experimental=true,xiaoCandidate=true,target='NONE',effects=Copy(f.effects),upgrade={effects=Copy(f.upgradedEffects)},
   color='xiao_candidate',rarity=f.rarity,sourceId='xiao_candidate/'..f.id}
 end end
 for _,c in ipairs(Extra.cards)do out[#out+1]=Copy(c)end
 local B=require('abyss_xiao_play_bridge');local actual={}
 for _,list in ipairs({B.definitions(),B.additionalDefinitions()})do for _,c in ipairs(list)do assert(not actual[c.id],'duplicate Xiao bridge ID');actual[c.id]=c end end
 assert(#out==12,'incomplete Xiao source catalog')
 for _,c in ipairs(out)do
  local expected=Copy(c);expected.color=nil;expected.rarity=nil;expected.sourceId=nil
  assert(same(actual[c.id],expected),'Xiao source/bridge definition drift: '..c.id)
 end
 return out
end
return M
