local R=require('runtime-resource-probe');local C=require('abyss_combat');local View=require('abyss_battle_intent_view');local M={}
local function exact(t,ks)if type(t)~='table'or getmetatable(t)then return false end;for k in pairs(t)do if not ks[k]then return false end end;for k in pairs(ks)do if rawget(t,k)==nil then return false end end;return true end
local function n(v)return type(v)=='number'and v%1==0 and v>=0 and v<=999 end
-- Read only the renderer's PUBLIC face. Hidden/unknown is not zero damage.
function M.visibleDamage(state,target)
 local f=View.intentView(state,target)
 if f.hidden then return nil,'intent_hidden'end
 if type(f.rows)~='table'or #f.rows==0 then return nil,'intent_projection_unsupported'end
 local attacks=0;for _,row in ipairs(f.rows)do
  if type(row)~='table'or not({attack=true,defend=true,buff=true,debuff=true})[row.icon]then return nil,'intent_projection_unsupported'end
  if row.icon=='attack'then attacks=attacks+1 end
 end
 if attacks>1 or f.worldTimes and f.worldTimes~=1 then return nil,'intent_projection_unsupported'end
 if attacks==1 and type(f.worldDamage)=='number'and f.worldDamage>=0 and f.worldDamage<math.huge then return f.worldDamage end
 if attacks==0 and(f.kind=='defend'or f.kind=='buff')and f.value==''then return 0 end
 return nil,'intent_projection_unsupported'
end
function M.play(input,uid,target)
 R.validate(input);if C.outcome(input)or input.phase~='player'then return nil,'combat_not_active'end
 if type(target)~='number'or target%1~=0 or target<1 or not input.enemies[target]or not require('abyss_actor_presence').isActive(input.enemies[target])then return nil,'invalid_target'end
 local instance;for _,c in ipairs(input.hand)do if c.uid==uid then instance=c;break end end;if not instance then return nil,'card_not_in_hand'end
 local id=instance.cardId;if id~='KQ041'and id~='KQ058'then return nil,'outside_visible_intent_scope'end
 local original=input.catalog.cards[id];local p=original.keqingVisibleIntent
 assert(original.type=='attack'and original.cost==1 and not original.exhaust and exact(p,{base=true,upgraded=true}),'invalid visible intent contract')
 for _,key in ipairs({'base','upgraded'})do assert(exact(p[key],{first=true,conditional=true})and n(p[key].first)and n(p[key].conditional),'invalid visible intent face')end
 local damage,why=M.visibleDamage(input,target);if damage==nil then return nil,why end
 local face=p[instance.upgraded and'upgraded'or'base'];local s=C.copy(input);local def=C.copy(original)
 def.effects={{op='damage',value=face.first}}
 if id=='KQ041'and damage>0 then def.effects[#def.effects+1]={op='block',value=face.conditional}
 elseif id=='KQ058'and damage==0 then def.effects[#def.effects+1]={op='damage',value=face.conditional}end
 def.upgrade={effects=C.copy(def.effects)};def.keqingVisibleIntent=nil;s.catalog.cards[id]=def
 local out,err=R.play(s,uid,target);if not out then return nil,err end;out.catalog.cards[id]=C.copy(original);return out
end
return M
