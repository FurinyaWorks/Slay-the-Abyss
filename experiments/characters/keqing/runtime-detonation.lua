local R=require('runtime-resource-probe');local C=require('abyss_combat');local M={}
local function exact(t,keys)
 if type(t)~='table'or getmetatable(t)then return false end
 for k in pairs(t)do if not keys[k]then return false end end
 for k in pairs(keys)do if rawget(t,k)==nil then return false end end
 return true
end
function M.play(input,uid,target)
 R.validate(input)
 local instance;for _,c in ipairs(input.hand)do if c.uid==uid then instance=c;break end end
 if not instance then return nil,'card_not_in_hand'end
 local id=instance.cardId;if id~='KQ026'and id~='KQ028'then return nil,'outside_detonation_scope'end
 local original=input.catalog.cards[id];local p=original.keqingDetonation
 assert(exact(p,{base=true,upgraded=true}),'invalid detonation contract')
 for _,key in ipairs({'base','upgraded'})do
  assert(exact(p[key],{hit=true,burst=true}),'invalid detonation face')
  for _,k in ipairs({'hit','burst'})do local n=p[key][k];assert(type(n)=='number'and n%1==0 and n>=0 and n<=999,'invalid detonation value')end
 end
 local s=C.copy(input);local def=C.copy(original);local consume=s.keqingResourceProbe.wedgeUntil~=nil
 local face=p[instance.upgraded and'upgraded'or'base'];local op=id=='KQ026'and'damage'or'damageAll'
 def.effects={{op=op,value=face.hit}};if id=='KQ028'then def.effects[2]={op=op,value=face.hit}end
 if consume then def.effects[#def.effects+1]={op=op,value=face.burst}end
 def.upgrade={effects=C.copy(def.effects)};def.keqingDetonation=nil;s.catalog.cards[id]=def
 local out,why=R.play(s,uid,target);if not out then return nil,why end
 out.catalog.cards[id]=C.copy(original);if consume then out.keqingResourceProbe.wedgeUntil=nil end
 return out
end
return M
