local R=require('runtime-resource-probe');local C=require('abyss_combat');local M={}
local function exact(t,keys)
 if type(t)~='table'or getmetatable(t)then return false end
 for k in pairs(t)do if not keys[k]then return false end end
 for k in pairs(keys)do if rawget(t,k)==nil then return false end end;return true
end
function M.play(input,uid,target)
 R.validate(input);if C.outcome(input)or input.phase~='player'then return nil,'combat_not_active'end
 if type(target)~='number'or target%1~=0 or target<1 or not input.enemies[target]or not require('abyss_actor_presence').isActive(input.enemies[target])then return nil,'invalid_target'end
 local enemy=input.enemies[target];assert(type(enemy.block)=='number'and enemy.block%1==0 and enemy.block>=0 and enemy.block<math.huge,'invalid target block')
 local instance;for _,c in ipairs(input.hand)do if c.uid==uid then instance=c;break end end
 if not instance then return nil,'card_not_in_hand'end;if instance.cardId~='KQ056'then return nil,'outside_unblocked_scope'end
 local original=input.catalog.cards.KQ056;local p=original.keqingUnblocked
 assert(original.type=='attack'and original.cost==2 and not original.exhaust,'invalid unblocked definition')
 assert(exact(p,{base=true,upgraded=true}),'invalid unblocked contract')
 for _,key in ipairs({'base','upgraded'})do assert(exact(p[key],{first=true,extra=true}),'invalid unblocked face');for _,k in ipairs({'first','extra'})do local n=p[key][k];assert(type(n)=='number'and n%1==0 and n>=0 and n<=999,'invalid unblocked amount')end end
 local face=p[instance.upgraded and'upgraded'or'base'];local s=C.copy(input);local def=C.copy(original)
 def.effects={{op='damage',value=face.first}};if enemy.block==0 then def.effects[#def.effects+1]={op='damage',value=face.extra}end
 def.upgrade={effects=C.copy(def.effects)};def.keqingUnblocked=nil;s.catalog.cards.KQ056=def
 local out,why=R.play(s,uid,target);if not out then return nil,why end;out.catalog.cards.KQ056=C.copy(original);return out
end
return M
