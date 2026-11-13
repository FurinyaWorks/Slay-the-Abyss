-- Isolated adapter for only KQ006/007, never a production registration.
local R=require('runtime-resource-probe');local C=require('abyss_combat');local M={}
local function exact(t,keys)
 if type(t)~='table'or getmetatable(t)then return false end
 for k in pairs(t)do if not keys[k]then return false end end
 for k in pairs(keys)do if rawget(t,k)==nil then return false end end
 return true
end
function M.play(input,uid)
 local instance;for _,c in ipairs(input.hand)do if c.uid==uid then instance=c;break end end
 if not instance then return nil,'card_not_in_hand'end
 local id=instance.cardId;if id~='KQ006'and id~='KQ007'then return nil,'outside_defense_scope'end
 local original=input.catalog.cards[id];local p=original.keqingDefense
 assert(exact(p,{resource=true,base=true,upgraded=true})and p.resource==(id=='KQ006'and'wedge'or'infusion'),'invalid defense contract')
 for _,key in ipairs({'base','upgraded'})do
  assert(exact(p[key],{block=true,extra=true}),'invalid defense face')
  for _,k in ipairs({'block','extra'})do local n=p[key][k];assert(type(n)=='number'and n%1==0 and n>=0 and n<=999,'invalid defense value')end
 end
 local s=C.copy(input);local def=C.copy(original);local r=s.keqingResourceProbe
 local consume=p.resource=='wedge'and r.wedgeUntil~=nil or p.resource=='infusion'and r.infusion>0
 local face=p[instance.upgraded and'upgraded'or'base']
 def.effects={{op='block',value=face.block}}
 if consume then def.effects[#def.effects+1]={op='block',value=face.extra}end
 def.upgrade={effects=C.copy(def.effects)};def.keqingDefense=nil;s.catalog.cards[id]=def
 local out,why=R.play(s,uid,1);if not out then return nil,why end
 out.catalog.cards[id]=C.copy(original)
 if consume then
  if p.resource=='wedge'then out.keqingResourceProbe.wedgeUntil=nil
  else out.keqingResourceProbe.infusion=out.keqingResourceProbe.infusion-1 end
 end
 return out
end
return M
