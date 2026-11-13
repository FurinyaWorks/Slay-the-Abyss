local R=require('runtime-resource-probe');local C=require('abyss_combat');local M={}
local function exact(t,keys)
 if type(t)~='table'or getmetatable(t)then return false end
 for k in pairs(t)do if not keys[k]then return false end end
 for k in pairs(keys)do if rawget(t,k)==nil then return false end end
 return true
end
function M.play(input,uid)
 R.validate(input)
 if C.outcome(input)or input.phase~='player'then return nil,'combat_not_active'end
 local instance;for _,c in ipairs(input.hand)do if c.uid==uid then instance=c;break end end
 if not instance then return nil,'card_not_in_hand'end
 local id=instance.cardId;if id~='KQ021'and id~='KQ022'then return nil,'outside_infusion_scope'end
 local original=input.catalog.cards[id];local p=original.keqingInfusion
 assert(original.type=='skill'and original.cost==(id=='KQ021'and 0 or 2)and original.exhaust==true,'invalid infusion definition')
 assert(exact(p,{base=true,upgraded=true}),'invalid infusion contract')
 for _,key in ipairs({'base','upgraded'})do
  assert(exact(p[key],{amount=true}),'invalid infusion face');local n=p[key].amount
  assert(type(n)=='number'and n%1==0 and n>=0 and n<=999,'invalid infusion amount')
 end
 local s=C.copy(input);local def=C.copy(original);local r=s.keqingResourceProbe
 local amount=p[instance.upgraded and'upgraded'or'base'].amount
 local value=id=='KQ021'and r.infusion*amount or amount
 -- Resource effect precedes block and the actual exhaust event on this copy.
 r.infusion=id=='KQ021'and 0 or 1
 def.effects={{op='draw',value=0}};if value>0 then def.effects={{op='block',value=value}}end
 def.upgrade={effects=C.copy(def.effects)};def.keqingInfusion=nil;s.catalog.cards[id]=def
 local out,why=R.play(s,uid,1);if not out then return nil,why end
 out.catalog.cards[id]=C.copy(original);return out
end
return M
