local R=require('runtime-resource-probe');local C=require('abyss_combat');local M={}
local function exact(t,ks)if type(t)~='table'or getmetatable(t)then return false end;for k in pairs(t)do if not ks[k]then return false end end;for k in pairs(ks)do if rawget(t,k)==nil then return false end end;return true end
local function historyCount(t)
 if t==nil then return 0 end
 assert(type(t)=='table'and not getmetatable(t),'invalid played history');local count=0
 for k,v in pairs(t)do assert(type(k)=='number'and k%1==0 and k>=1 and type(v)=='table','invalid played history');count=count+1 end
 for i=1,count do assert(rawget(t,i),'sparse played history')end;return count
end
function M.play(input,uid,target)
 R.validate(input);if C.outcome(input)or input.phase~='player'then return nil,'combat_not_active'end
 local instance;for _,c in ipairs(input.hand)do if c.uid==uid then instance=c;break end end;if not instance then return nil,'card_not_in_hand'end
 if instance.cardId~='KQ047'then return nil,'outside_first_card_scope'end
 local original=input.catalog.cards.KQ047;local p=original.keqingFirstCard
 assert(original.type=='attack'and original.cost==1 and not original.exhaust and exact(p,{base=true,upgraded=true}),'invalid first card contract')
 for _,key in ipairs({'base','upgraded'})do local f=p[key];assert(exact(f,{first=true,draw=true})and type(f.first)=='number'and f.first%1==0 and f.first>=0 and f.first<=999 and f.draw==1,'invalid first card face')end
 local first=historyCount(input.cardsPlayedThisTurn)==0;local f=p[instance.upgraded and'upgraded'or'base'];local s=C.copy(input);local def=C.copy(original)
 def.effects={{op='damage',value=f.first}};if first then def.effects[#def.effects+1]={op='draw',value=f.draw}end
 def.upgrade={effects=C.copy(def.effects)};def.keqingFirstCard=nil;s.catalog.cards.KQ047=def
 local out,why=R.play(s,uid,target);if not out then return nil,why end;out.catalog.cards.KQ047=C.copy(original);return out
end
return M
