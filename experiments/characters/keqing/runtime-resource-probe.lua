-- Isolated actual-Combat wrapper, never registered by a production loader.
-- Only starter E plus the explicitly compiled plain subset is admitted.
local C=require('abyss_combat')
local M={}
local function exact(t,keys)
 if type(t)~='table' or getmetatable(t)~=nil then return false end
 for k in pairs(t)do if not keys[k]then return false end end
 for k in pairs(keys)do if rawget(t,k)==nil then return false end end
 return true
end
local function contractValid(c)
 local keys={base=true,upgraded=true,bonusPerHit=true}
 if type(c)=='table' and c.finisher~=nil then keys.finisher=true end
 assert(exact(c,keys) and c.bonusPerHit==2,'invalid resource contract')
 if c.finisher~=nil then
  assert(exact(c.finisher,{base=true,upgraded=true}),'invalid finisher contract')
  for _,name in ipairs({'base','upgraded'})do
   local f=c.finisher[name];assert(exact(f,{hit=true,burst=true}),'invalid finisher face')
   for _,k in ipairs({'hit','burst'})do assert(type(f[k])=='number' and f[k]%1==0 and f[k]>=0 and f[k]<=999,'invalid finisher value')end
  end
 end
 for _,name in ipairs({'base','upgraded'})do
  local f=c[name]
  assert(exact(f,{setup=true,release=true,attacks=true}) and f.attacks==2,'invalid resource face')
  for _,k in ipairs({'setup','release'})do assert(type(f[k])=='number' and f[k]%1==0 and f[k]>=0 and f[k]<=999,'invalid resource amount')end
 end
end
local function valid(s)
 contractValid(s.keqingResourceContract)
 local r=s.keqingResourceProbe
 assert(type(r)=='table' and type(r.infusion)=='number' and r.infusion%1==0 and r.infusion>=0 and r.infusion<=2,'invalid infusion')
 assert(r.wedgeUntil==nil or type(r.wedgeUntil)=='number' and r.wedgeUntil%1==0 and r.wedgeUntil>=s.turn and r.wedgeUntil<=s.turn+1,'invalid wedge')
end
function M.new(data,definitions,contract,options)
 contractValid(contract)
 local d=C.copy(data)
 for _,def in ipairs(definitions)do
  for _,old in ipairs(d.cards.cards)do assert(old.id~=def.id,'duplicate probe card')end
  d.cards.cards[#d.cards.cards+1]=C.copy(def)
 end
 local s=C.new(d,options)
 s.keqingResourceProbe={infusion=0}
 s.keqingResourceContract=C.copy(contract)
 valid(s)
 return s
end
function M.play(input,uid,target)
 valid(input)
 if C.outcome(input) or input.phase~='player' then return nil,'combat_not_active' end
 local s=C.copy(input)
 local instance
 for _,c in ipairs(s.hand)do if c.uid==uid then instance=c;break end end
 if not instance then return nil,'card_not_in_hand' end
 local original=s.catalog.cards[instance.cardId]
 if not original or not original.keqingProbe then return nil,'outside_probe_scope' end
 if original.keqingUnblocked then return nil,'dedicated_unblocked_adapter_required' end
 if original.keqingWedgeDraw then return nil,'dedicated_wedge_draw_adapter_required' end
 if original.keqingSetup then return nil,'dedicated_setup_adapter_required' end
 if original.keqingDetonation then return nil,'dedicated_detonation_adapter_required' end
 if original.keqingInfusion then return nil,'dedicated_infusion_adapter_required' end
 if original.keqingConditional then return nil,'dedicated_conditional_adapter_required' end
 if original.keqingDefense then return nil,'dedicated_defense_adapter_required' end
 local def=C.copy(original)
 local r=s.keqingResourceProbe
 local contract=s.keqingResourceContract
 local release=instance.cardId=='KQ003' and r.wedgeUntil~=nil
 if instance.cardId=='KQ003' then
  local face=contract[instance.upgraded and 'upgraded' or 'base']
  local damage=release and face.release or face.setup
  def.effects={{op='damage',value=damage}}
  def.upgrade={effects=C.copy(def.effects)}
 end
 local detonate=instance.cardId=='KQ004' and r.wedgeUntil~=nil
 if instance.cardId=='KQ004' then
  if not contract.finisher then return nil,'outside_probe_scope' end
  local face=contract.finisher[instance.upgraded and 'upgraded' or 'base']
  def.effects={{op='damage',value=face.hit},{op='damage',value=face.hit}}
  if detonate then def.effects[#def.effects+1]={op='damageAll',value=face.burst}end
  def.upgrade={effects=C.copy(def.effects)}
 end
 local function imbue(effects)
  for _,e in ipairs(effects)do
   if e.op=='damage' or e.op=='damageAll' then e.value=e.value+contract.bonusPerHit end
  end
 end
 if def.type=='attack' and r.infusion>0 then
  imbue(def.effects);if def.upgrade then imbue(def.upgrade.effects)end
 end
 s.catalog.cards[instance.cardId]=def
 local ok,reason=C.play(s,uid,target)
 if not ok then return nil,reason end
 s.catalog.cards[instance.cardId]=C.copy(original)
 if def.type=='attack' and r.infusion>0 then r.infusion=r.infusion-1 end
 if instance.cardId=='KQ003' then
  if release then r.wedgeUntil=nil;r.infusion=contract[instance.upgraded and 'upgraded' or 'base'].attacks
  else r.wedgeUntil=s.turn+1 end
 end
 if detonate then r.wedgeUntil=nil end
 valid(s)
 return s
end
function M.endTurn(input)
 valid(input)
 if C.outcome(input) or input.phase~='player' then return nil,'combat_not_active' end
 local s=C.copy(input);local r=s.keqingResourceProbe
 r.infusion=0
 if r.wedgeUntil and r.wedgeUntil<=s.turn then r.wedgeUntil=nil end
 local ok,reason=C.endTurn(s)
 if not ok then return nil,reason end
 valid(s)
 return s
end
M.validate=valid
return M
