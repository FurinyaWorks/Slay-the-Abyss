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
 if instance.cardId~='KQ031'then return nil,'outside_wedge_draw_scope'end
 local original=input.catalog.cards.KQ031;local p=original.keqingWedgeDraw
 assert(original.type=='skill'and original.cost==1 and original.exhaust==true,'invalid wedge draw definition')
 assert(exact(p,{base=true,upgraded=true}),'invalid wedge draw contract')
 for _,key in ipairs({'base','upgraded'})do
  assert(exact(p[key],{amount=true,wedgeAmount=true}),'invalid wedge draw face')
  for _,k in ipairs({'amount','wedgeAmount'})do local n=p[key][k];assert(type(n)=='number'and n%1==0 and n>=1 and n<=3,'invalid wedge draw amount')end
 end
 local s=C.copy(input);local def=C.copy(original);local face=p[instance.upgraded and'upgraded'or'base']
 local count=face.amount
 -- The candidate consumes the wedge even if No Draw subsequently blocks drawing.
 if s.keqingResourceProbe.wedgeUntil then s.keqingResourceProbe.wedgeUntil=nil;count=face.wedgeAmount end
 def.effects={{op='draw',value=count}};def.upgrade={effects=C.copy(def.effects)};def.keqingWedgeDraw=nil;s.catalog.cards.KQ031=def
 local out,why=R.play(s,uid,1);if not out then return nil,why end
 out.catalog.cards.KQ031=C.copy(original);return out
end
return M
