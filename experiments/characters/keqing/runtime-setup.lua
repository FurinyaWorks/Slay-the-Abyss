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
 local id=instance.cardId;if id~='KQ010'and id~='KQ011'and id~='KQ013'then return nil,'outside_setup_scope'end
 local original=input.catalog.cards[id];local p=original.keqingSetup
 assert(exact(p,{base=true,upgraded=true}),'invalid setup contract')
 for _,key in ipairs({'base','upgraded'})do local n=p[key];assert(type(n)=='number'and n%1==0 and n>=0 and n<=999,'invalid setup value')end
 local s=C.copy(input);local def=C.copy(original);local fresh=s.keqingResourceProbe.wedgeUntil==nil
 local op=id=='KQ010'and'block'or(id=='KQ011'and'damage'or'damageAll')
 def.effects={{op=op,value=p[instance.upgraded and'upgraded'or'base']}};def.upgrade={effects=C.copy(def.effects)}
 def.keqingSetup=nil;s.catalog.cards[id]=def
 local out,why=R.play(s,uid,target);if not out then return nil,why end
 out.catalog.cards[id]=C.copy(original)
 if fresh then out.keqingResourceProbe.wedgeUntil=out.turn+1 end
 -- Third result is a fact for a future exactly-once resource dispatcher, not a relic execution.
 return out,nil,fresh
end
return M
