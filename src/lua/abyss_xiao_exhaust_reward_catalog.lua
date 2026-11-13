-- Closed source projection, not a new formal character or rarity approval.
local Copy=require('abyss_copy').copy
local Starter=Copy(require('abyss_xiao_starter_source'))
local Extra=Copy(require('abyss_xiao_exhaust_reward_source'))
local M={sourceSha256=Extra.sourceSha256}
local function same(a,b)
 if type(a)~=type(b)then return false end
 if type(a)~='table'then return a==b end
 if getmetatable(a)or getmetatable(b)then return false end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end
 for k in pairs(b)do if a[k]==nil then return false end end;return true
end
function M.definitions()
 assert(Starter.sourceSha256==Extra.sourceSha256,'Xiao source identity mismatch')
 local out=Copy(require('abyss_xiao_reward_catalog').definitions())
 for _,c in ipairs(Extra.cards)do out[#out+1]=Copy(c)end
 local B=require('abyss_xiao_play_bridge');local actual={}
 for _,list in ipairs({B.definitions(),B.additionalDefinitions()})do for _,c in ipairs(list)do assert(not actual[c.id],'duplicate Xiao bridge ID');actual[c.id]=c end end
 assert(#out==15,'incomplete Xiao source catalog')
 for _,c in ipairs(out)do
  local expected=Copy(c);expected.color=nil;expected.rarity=nil;expected.sourceId=nil
  assert(same(actual[c.id],expected),'Xiao source/bridge definition drift: '..c.id)
 end
 return out
end
return M
