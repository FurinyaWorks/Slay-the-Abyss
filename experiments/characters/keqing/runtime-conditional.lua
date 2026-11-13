local R=require('runtime-resource-probe');local C=require('abyss_combat');local M={}
local function exact(t,keys)
 if type(t)~='table'or getmetatable(t)then return false end
 for k in pairs(t)do if not keys[k]then return false end end
 for k in pairs(keys)do if rawget(t,k)==nil then return false end end
 return true
end
local function n(v)return type(v)=='number'and v%1==0 and v>=0 and v<=999 end
local function plan(list,r,enemies)
 assert(type(list)=='table'and not getmetatable(list),'invalid conditional array')
 local count=0;for k in pairs(list)do assert(type(k)=='number'and k%1==0 and k>=1 and k<=2,'invalid conditional index');count=count+1 end
 assert(count>=1 and count<=2,'invalid conditional length')
 local alive=0;for _,enemy in ipairs(enemies)do if require('abyss_actor_presence').isActive(enemy)then alive=alive+1 end end
 local out={};local function damage(v)out[#out+1]={op='damage',value=v}end
 for i=1,count do
  local e=rawget(list,i);assert(type(e)=='table','conditional array hole')
  if e.op=='wedgeDamage'then
   assert(exact(e,{op=true,absent=true,present=true})and n(e.absent)and n(e.present),'invalid wedge damage');damage(r.wedgeUntil and e.present or e.absent)
  elseif e.op=='damage'then
   assert(exact(e,{op=true,damage=true,hits=true,target=true})and n(e.damage)and n(e.hits)and e.hits>=1 and e.hits<=4 and e.target=='one','invalid damage')
   for _=1,e.hits do damage(e.damage)end
  elseif e.op=='conditionalBlock'then
   assert(exact(e,{op=true,when=true,amount=true})and (e.when=='noInfusion'or e.when=='noResources'or e.when=='oneEnemy')and n(e.amount),'invalid conditional block')
   if (e.when=='noInfusion'and r.infusion==0)or(e.when=='noResources'and r.infusion==0 and r.wedgeUntil==nil)or(e.when=='oneEnemy'and alive==1)then out[#out+1]={op='block',value=e.amount}end
  elseif e.op=='block'or e.op=='lastInfusionBlock'then
   assert(exact(e,{op=true,amount=true})and n(e.amount),'invalid block')
   if e.op=='block'or r.infusion==1 then out[#out+1]={op='block',value=e.amount}end
  elseif e.op=='blockPerEnemy'then
   assert(exact(e,{op=true,amount=true,cap=true})and n(e.amount)and n(e.cap)and e.cap>=1 and e.cap<=3,'invalid enemy block')
   if alive>0 then out[#out+1]={op='block',value=math.min(alive,e.cap)*e.amount}end
  elseif e.op=='infusedDamage'then
   assert(exact(e,{op=true,damage=true})and n(e.damage),'invalid infused damage');if r.infusion>0 then damage(e.damage)end
  else error('unsupported conditional op')end
 end
 return out
end
function M.play(input,uid,target)
 local instance;for _,c in ipairs(input.hand)do if c.uid==uid then instance=c;break end end
 if not instance then return nil,'card_not_in_hand'end
 local id=instance.cardId;if id~='KQ008'and id~='KQ018'and id~='KQ025'and id~='KQ020'and id~='KQ035'and id~='KQ036'and id~='KQ067'then return nil,'outside_conditional_scope'end
 local original=input.catalog.cards[id];local p=original.keqingConditional
 assert(exact(p,{base=true,upgraded=true}),'invalid conditional contract')
 local s=C.copy(input);local def=C.copy(original);local r=s.keqingResourceProbe
 local base,up=plan(p.base,r,s.enemies),plan(p.upgraded,r,s.enemies)
 def.effects=instance.upgraded and up or base;def.upgrade={effects=C.copy(def.effects)};def.keqingConditional=nil;s.catalog.cards[id]=def
 local out,why=R.play(s,uid,target);if not out then return nil,why end
 out.catalog.cards[id]=C.copy(original);return out
end
return M
